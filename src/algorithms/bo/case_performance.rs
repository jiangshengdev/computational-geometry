//! Diagnostic baseline, not a speed assertion. Neutral fixtures are exported
//! separately by the frontend. This test owns only Rust and its HTTP service.
//! `just perf-cases` measures; `just perf-export` separately refreshes fixtures.
//! BO_PERF_ROUNDS defaults to 31 (odd, at least 3). Test profile timings exclude
//! validation and result destruction; HTTP includes a fresh TCP connection and
//! complete response receipt, but not client JSON parsing or rendering.
use super::super::sweep::trace_intersections;
use super::protocol::{IntersectionDto, Request, Response};
use crate::{Point, Segment, brute_force_intersections, http, intersections};
use axum::{
    Json,
    body::{Body, to_bytes},
    extract::FromRequest,
    response::IntoResponse,
};
use std::{
    fs,
    hint::black_box,
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    path::PathBuf,
    time::{Duration, Instant},
};

fn fixture(name: &str) -> String {
    fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/performance")
            .join(name),
    )
    .unwrap()
}

fn report(id: &str, mode: &str, mut times: Vec<f64>) {
    println!("{id} {mode} raw_ms={times:?}");
    times.sort_by(f64::total_cmp);
    let mean = times.iter().sum::<f64>() / times.len() as f64;
    let sd = (times.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / times.len() as f64).sqrt();
    println!(
        "{id} {mode} min={:.3} median={:.3} p95={:.3} max={:.3} cv={:.2}%",
        times[0],
        times[times.len() / 2],
        times[(times.len() * 95).div_ceil(100) - 1],
        times[times.len() - 1],
        sd / mean * 100.0
    );
}

fn request(address: SocketAddr, body: &str) -> Vec<u8> {
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(10)).unwrap();
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .unwrap();
    stream
        .set_write_timeout(Some(Duration::from_secs(30)))
        .unwrap();
    write!(stream, "POST /api/bo/intersections HTTP/1.1\r\nHost: {address}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
    let mut bytes = Vec::new();
    stream.read_to_end(&mut bytes).unwrap();
    bytes
}

fn response_body(bytes: &[u8]) -> Vec<u8> {
    let offset = bytes.windows(4).position(|v| v == b"\r\n\r\n").unwrap() + 4;
    let headers = std::str::from_utf8(&bytes[..offset]).unwrap();
    assert!(headers.starts_with("HTTP/1.1 200 OK\r\n"), "{headers}");
    if headers.lines().any(|line| {
        line.split_once(':').is_some_and(|(key, value)| {
            key.eq_ignore_ascii_case("transfer-encoding")
                && value.trim().eq_ignore_ascii_case("chunked")
        })
    }) {
        let mut remaining = &bytes[offset..];
        let mut body = Vec::new();
        loop {
            let end = remaining
                .windows(2)
                .position(|value| value == b"\r\n")
                .unwrap();
            let size = std::str::from_utf8(&remaining[..end])
                .unwrap()
                .split(';')
                .next()
                .unwrap();
            let size = usize::from_str_radix(size, 16).unwrap();
            remaining = &remaining[end + 2..];
            if size == 0 {
                assert_eq!(remaining, b"\r\n", "diagnostic server emits no trailers");
                return body;
            }
            body.extend_from_slice(&remaining[..size]);
            assert_eq!(&remaining[size..size + 2], b"\r\n");
            remaining = &remaining[size + 2..];
        }
    }
    let length: usize = headers
        .lines()
        .find_map(|line| {
            let (key, value) = line.split_once(':')?;
            key.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse().unwrap())
        })
        .expect("complete response must have content-length");
    assert_eq!(bytes.len() - offset, length);
    bytes[offset..].to_vec()
}

fn collected_response(body: &[u8], traced: bool) -> serde_json::Value {
    if !traced {
        return serde_json::from_slice(body).unwrap();
    }
    let mut trace =
        serde_json::json!({"steps": [], "values": [], "point_values": [], "result_values": []});
    let mut intersections = None;
    for line in body
        .split(|byte| *byte == b'\n')
        .filter(|line| !line.is_empty())
    {
        assert!(
            intersections.is_none(),
            "completion must be the final frame"
        );
        let mut frame: serde_json::Value = serde_json::from_slice(line).unwrap();
        if trace.get("shear").is_some() {
            assert_eq!(trace["shear"], frame["shear"]);
        } else {
            trace["shear"] = frame["shear"].take();
        }
        for key in ["steps", "values", "point_values", "result_values"] {
            trace[key]
                .as_array_mut()
                .unwrap()
                .append(frame[key].as_array_mut().unwrap());
        }
        if frame["complete"].as_bool().unwrap() {
            assert!(frame["intersections"].is_array());
            intersections = Some(frame["intersections"].take());
        } else {
            assert!(frame.get("intersections").is_none());
        }
    }
    serde_json::json!({"trace": trace, "intersections": intersections.expect("complete trace required")})
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "explicit diagnostic performance measurement"]
async fn actual_case_timings() {
    let rounds: usize = std::env::var("BO_PERF_ROUNDS")
        .unwrap_or("31".into())
        .parse()
        .unwrap();
    assert!(
        rounds >= 3 && rounds % 2 == 1,
        "use an odd number of rounds >= 3"
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, http::router()).await.unwrap() });
    println!(
        "test profile debug_assertions={} rounds={rounds}; one warmup per mode; HTTP includes new TCP connection and full body receipt, excludes JSON parsing",
        cfg!(debug_assertions)
    );
    for (id, count) in [
        ("spider-web", 100),
        ("hexagonal-snowflake", 87),
        ("vertical-overlap", 1),
        ("mixed-vertical", 14),
    ] {
        let segments: Vec<Segment> = fixture(&format!("{id}.tsv"))
            .lines()
            .map(|line| {
                let values: Vec<_> = line
                    .split_whitespace()
                    .map(|v| v.parse::<crate::Rational>().unwrap())
                    .collect();
                assert_eq!(values.len(), 4);
                Segment {
                    start: Point {
                        x: values[0].clone(),
                        y: values[1].clone(),
                    },
                    end: Point {
                        x: values[2].clone(),
                        y: values[3].clone(),
                    },
                }
            })
            .collect();
        let expected = brute_force_intersections(&segments);
        assert_eq!(expected.len(), count);
        let canonical = |mut values: Vec<crate::Intersection>| {
            values.sort_by_key(|v| v.segments);
            values
        };
        let expected = canonical(expected);
        assert_eq!(canonical(intersections(&segments)), expected);
        let (result, trace) = trace_intersections(&segments);
        assert_eq!(canonical(result), expected);
        assert_eq!(
            canonical(trace.steps.last().unwrap().results.clone()),
            expected
        );
        println!(
            "{id} n={} results={} steps={} copied_results={} pending_points={}",
            segments.len(),
            expected.len(),
            trace.steps.len(),
            trace.steps.iter().map(|s| s.results.len()).sum::<usize>(),
            trace.steps.iter().map(|s| s.pending.len()).sum::<usize>()
        );
        let mut pure = Vec::new();
        let mut traced = Vec::new();
        for round in 0..rounds {
            for offset in 0..2 {
                if (round + offset) % 2 == 0 {
                    let start = Instant::now();
                    let result = black_box(intersections(black_box(&segments)));
                    pure.push(start.elapsed().as_secs_f64() * 1000.0);
                    assert_eq!(canonical(result), expected);
                } else {
                    let start = Instant::now();
                    let (result, measured_trace) =
                        black_box(trace_intersections(black_box(&segments)));
                    traced.push(start.elapsed().as_secs_f64() * 1000.0);
                    assert_eq!(canonical(result), expected);
                    assert_eq!(measured_trace.steps.len(), trace.steps.len());
                    for (actual, expected) in measured_trace.steps.iter().zip(&trace.steps) {
                        assert_eq!(actual.phase, expected.phase);
                        assert_eq!(actual.action, expected.action);
                        assert_eq!(actual.subjects, expected.subjects);
                        assert_eq!(actual.current, expected.current);
                        assert_eq!(actual.pending, expected.pending);
                        assert_eq!(actual.active, expected.active);
                        assert_eq!(actual.results, expected.results);
                        assert_eq!(actual.checked, expected.checked);
                        assert_eq!(actual.starts, expected.starts);
                        assert_eq!(actual.ends, expected.ends);
                        assert_eq!(actual.passes, expected.passes);
                    }
                }
            }
        }
        report(id, "sweep", pure);
        report(id, "sweep_trace", traced);
        let bodies = [
            fixture(&format!("{id}-false.json")),
            fixture(&format!("{id}-true.json")),
        ];
        let mut verified_bodies = Vec::new();
        for (index, body) in bodies.iter().enumerate() {
            let request = axum::http::Request::builder()
                .header("content-type", "application/json")
                .body(Body::from(body.clone()))
                .unwrap();
            let Json(parsed) = Json::<Request>::from_request(request, &()).await.unwrap();
            assert_eq!(parsed.trace, index == 1);
            let parsed_segments: Vec<_> = parsed
                .segments
                .into_iter()
                .map(|segment| {
                    segment
                        .into_segment()
                        .unwrap_or_else(|(_, error)| panic!("{}", error.error))
                })
                .collect();
            assert_eq!(
                parsed_segments, segments,
                "JSON and TSV must describe identical inputs"
            );
            let (results, expected_trace) = if index == 1 {
                let (results, trace) = trace_intersections(&segments);
                (results, Some(trace.into()))
            } else {
                (intersections(&segments), None)
            };
            assert_eq!(canonical(results.clone()), expected);
            let response = Json(Response {
                intersections: results.into_iter().map(IntersectionDto::from).collect(),
                trace: expected_trace,
            })
            .into_response();
            verified_bodies.push(to_bytes(response.into_body(), usize::MAX).await.unwrap());
        }
        let warmups = bodies.each_ref().map(|body| request(address, body));
        let expected_bodies = warmups.each_ref().map(|bytes| response_body(bytes));
        for (index, (actual, verified)) in expected_bodies.iter().zip(&verified_bodies).enumerate()
        {
            assert_eq!(
                collected_response(actual, index == 1),
                serde_json::from_slice::<serde_json::Value>(verified).unwrap(),
                "HTTP must return the verified geometry and complete trace"
            );
        }
        for (mode, body) in expected_bodies.iter().enumerate() {
            println!(
                "{id} http_trace={} response_bytes={}",
                mode == 1,
                body.len()
            );
        }
        let mut timings = [Vec::new(), Vec::new()];
        for round in 0..rounds {
            for offset in 0..2 {
                let index = (round + offset) % 2;
                let start = Instant::now();
                let bytes = request(address, &bodies[index]);
                timings[index].push(start.elapsed().as_secs_f64() * 1000.0);
                assert_eq!(response_body(&bytes), expected_bodies[index]);
            }
        }
        for (mode, times) in ["http", "http_trace"].into_iter().zip(timings) {
            report(id, mode, times);
        }
    }
    server.abort();
    assert!(server.await.unwrap_err().is_cancelled());
}
