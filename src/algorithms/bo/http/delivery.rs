//! Owns background production, bounded delivery, cancellation and terminal logging.
use super::super::sweep::stream_intersections;
use super::protocol::{TraceEncoder, TraceFrame};
use crate::Segment;
use axum::{body::Body, response::IntoResponse};
use std::{
    cell::Cell,
    sync::atomic::{AtomicU64, Ordering},
    time::Instant,
};

static NEXT_TRACE_ID: AtomicU64 = AtomicU64::new(1);

struct TraceLifecycle {
    id: u64,
    verbose: bool,
    started: Instant,
    status: Cell<&'static str>,
    sent_steps: Cell<usize>,
}

impl TraceLifecycle {
    fn start(id: u64) -> Self {
        let verbose = std::env::var("BO_TRACE_LIFECYCLE").is_ok_and(|value| value == "1");
        if verbose {
            eprintln!("trace_lifecycle id={id} status=started sent_steps=0 elapsed_ms=0");
        }
        Self {
            id,
            verbose,
            started: Instant::now(),
            // Unwinding or an unexpected exit must never report completion.
            status: Cell::new("failed"),
            sent_steps: Cell::new(0),
        }
    }
}

impl Drop for TraceLifecycle {
    fn drop(&mut self) {
        let status = if std::thread::panicking() {
            "failed"
        } else {
            self.status.get()
        };
        if !self.verbose && status != "failed" {
            return;
        }
        eprintln!(
            "trace_lifecycle id={} status={} sent_steps={} elapsed_ms={}",
            self.id,
            status,
            self.sent_steps.get(),
            self.started.elapsed().as_millis(),
        );
    }
}

pub(super) fn response(segments: Vec<Segment>) -> axum::response::Response {
    let trace_id = NEXT_TRACE_ID.fetch_add(1, Ordering::Relaxed);
    let (sender, receiver) = tokio::sync::mpsc::channel::<Result<Vec<u8>, std::io::Error>>(1);
    tokio::task::spawn_blocking(move || {
        let lifecycle = TraceLifecycle::start(trace_id);
        let serialization_failed = Cell::new(false);
        let mut encoder = TraceEncoder::default();
        let send = |frame: TraceFrame| {
            let step_count = frame.step_count();
            let bytes = serde_json::to_vec(&frame).map(|mut bytes| {
                bytes.push(b'\n');
                bytes
            });
            match bytes {
                Ok(bytes) => {
                    if sender.blocking_send(Ok(bytes)).is_ok() {
                        // Accepted by the bounded transport queue, not proof of client receipt.
                        lifecycle
                            .sent_steps
                            .set(lifecycle.sent_steps.get() + step_count);
                        true
                    } else {
                        lifecycle.status.set("cancelled");
                        false
                    }
                }
                Err(error) => {
                    serialization_failed.set(true);
                    lifecycle.status.set("failed");
                    let _ = sender.blocking_send(Err(std::io::Error::other(error)));
                    false
                }
            }
        };
        let results =
            stream_intersections(&segments, &mut |trace| send(encoder.batch(trace)), &|| {
                sender.is_closed()
            });
        if let Some(results) = results {
            if send(encoder.complete(results)) {
                lifecycle.status.set("completed");
            }
        } else if !serialization_failed.get() {
            lifecycle.status.set("cancelled");
        }
    });
    let body = Body::from_stream(tokio_stream::wrappers::ReceiverStream::new(receiver));
    let mut response = (
        [(axum::http::header::CONTENT_TYPE, "application/x-ndjson")],
        body,
    )
        .into_response();
    response.headers_mut().insert(
        "x-trace-id",
        axum::http::HeaderValue::from_str(&trace_id.to_string())
            .expect("numeric trace id is a valid header"),
    );
    response
}
