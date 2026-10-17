use std::{
    io::{BufRead, BufReader, Read, Write},
    net::{Shutdown, SocketAddr, TcpStream},
    process::{Child, Command, Stdio},
    sync::mpsc::{self, Receiver},
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

// A hung-test safeguard, not a product cancellation latency requirement.
const TEST_TIMEOUT: Duration = Duration::from_secs(30);

struct Server {
    child: Child,
    logs: Receiver<String>,
    readers: Vec<JoinHandle<()>>,
}

impl Server {
    fn start() -> (Self, SocketAddr) {
        let mut child = Command::new(env!("CARGO_BIN_EXE_computational-geometry"))
            .env("BO_PORT", "0")
            .env("BO_TRACE_LIFECYCLE", "1")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        let (addresses, address_rx) = mpsc::channel();
        let (logs, log_rx) = mpsc::channel();
        let readers = vec![
            thread::spawn(move || {
                for line in BufReader::new(stdout).lines() {
                    let Ok(line) = line else { break };
                    if let Some(address) = line.strip_prefix("BO API listening on http://") {
                        let _ = addresses.send(address.to_owned());
                    }
                }
            }),
            thread::spawn(move || {
                for line in BufReader::new(stderr).lines() {
                    let Ok(line) = line else { break };
                    if logs.send(line).is_err() {
                        break;
                    }
                }
            }),
        ];
        let server = Self { child, logs: log_rx, readers };
        let address = address_rx.recv_timeout(TEST_TIMEOUT).unwrap().parse().unwrap();
        (server, address)
    }

    fn terminal_log(&self, id: &str) -> String {
        let deadline = Instant::now() + TEST_TIMEOUT;
        loop {
            let line = self.logs.recv_timeout(deadline.saturating_duration_since(Instant::now()))
                .expect("trace producer must report its actual termination");
            if line.starts_with("trace_lifecycle ")
                && field(&line, "id") == Some(id)
                && matches!(field(&line, "status"), Some("completed" | "cancelled" | "failed"))
            {
                return line;
            }
        }
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        for reader in self.readers.drain(..) {
            let _ = reader.join();
        }
    }
}

fn field<'a>(line: &'a str, key: &str) -> Option<&'a str> {
    line.split_whitespace().filter_map(|part| part.split_once('='))
        .find_map(|(name, value)| (name == key).then_some(value))
}

fn request(address: SocketAddr, body: &str) -> (BufReader<TcpStream>, String) {
    let mut stream = TcpStream::connect_timeout(&address, TEST_TIMEOUT).unwrap();
    stream.set_read_timeout(Some(TEST_TIMEOUT)).unwrap();
    stream.set_write_timeout(Some(TEST_TIMEOUT)).unwrap();
    write!(stream, "POST /api/bo/intersections HTTP/1.1\r\nHost: {address}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
    let mut reader = BufReader::new(stream);
    let mut status = String::new();
    reader.read_line(&mut status).unwrap();
    assert_eq!(status, "HTTP/1.1 200 OK\r\n");
    let mut id = None;
    let mut chunked = false;
    let mut ndjson = false;
    loop {
        let mut line = String::new();
        assert_ne!(reader.read_line(&mut line).unwrap(), 0);
        if line == "\r\n" { break; }
        let (name, value) = line.split_once(':').unwrap();
        match name.to_ascii_lowercase().as_str() {
            "x-trace-id" => id = Some(value.trim().to_owned()),
            "transfer-encoding" => chunked = value.trim().eq_ignore_ascii_case("chunked"),
            "content-type" => ndjson = value.trim() == "application/x-ndjson",
            _ => {}
        }
    }
    assert!(chunked && ndjson);
    (reader, id.expect("trace response must identify its producer"))
}

fn chunk(reader: &mut BufReader<TcpStream>) -> Option<Vec<u8>> {
    let mut line = String::new();
    assert_ne!(reader.read_line(&mut line).unwrap(), 0);
    let size = usize::from_str_radix(line.trim().split(';').next().unwrap(), 16).unwrap();
    let mut bytes = vec![0; size];
    reader.read_exact(&mut bytes).unwrap();
    let mut ending = [0; 2];
    reader.read_exact(&mut ending).unwrap();
    assert_eq!(&ending, b"\r\n");
    (size != 0).then_some(bytes)
}

#[test]
fn disconnect_stops_trace_producer_and_next_request_completes() {
    let (server, address) = Server::start();
    let (mut response, cancelled_id) = request(
        address,
        include_str!("fixtures/performance/spider-web-true.json"),
    );
    let mut received = Vec::new();
    while !received.contains(&b'\n') {
        received.extend(chunk(&mut response).expect("initial frame must precede end of body"));
    }
    let initial: serde_json::Value = serde_json::from_slice(received.split(|byte| *byte == b'\n').next().unwrap()).unwrap();
    assert_eq!(initial["complete"], false);
    assert_eq!(initial["steps"].as_array().unwrap().len(), 1);
    assert_eq!(initial["steps"][0]["action"], "initial");
    assert!(initial.get("intersections").is_none());
    response.get_ref().shutdown(Shutdown::Both).unwrap();
    drop(response);

    let stopped = server.terminal_log(&cancelled_id);
    assert_eq!(field(&stopped, "status"), Some("cancelled"), "{stopped}");
    assert!(field(&stopped, "sent_steps").unwrap().parse::<usize>().unwrap() >= 1);

    let (mut response, completed_id) = request(address, r#"{"segments":[],"trace":true}"#);
    assert_ne!(cancelled_id, completed_id);
    let mut body = Vec::new();
    while let Some(bytes) = chunk(&mut response) {
        body.extend(bytes);
    }
    let mut trailing = Vec::new();
    response.read_to_end(&mut trailing).unwrap();
    assert!(trailing.is_empty());
    let frames: Vec<serde_json::Value> = body.split(|byte| *byte == b'\n')
        .filter(|line| !line.is_empty())
        .map(|line| serde_json::from_slice(line).unwrap())
        .collect();
    assert_eq!(frames[0]["steps"][0]["action"], "initial");
    assert_eq!(frames.iter().filter(|frame| frame["complete"] == true).count(), 1);
    assert_eq!(frames.last().unwrap()["complete"], true);
    assert_eq!(frames.last().unwrap()["intersections"], serde_json::json!([]));
    let completed = server.terminal_log(&completed_id);
    assert_eq!(field(&completed, "status"), Some("completed"), "{completed}");
}
