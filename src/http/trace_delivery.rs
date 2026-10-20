//! Owns background production, bounded delivery, cancellation and terminal logging.
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

/// A producer sends ordered frames and stops when delivery returns false.
/// Returning Some means its final completion frame was successfully queued.
pub(crate) fn response(
    produce: impl FnOnce(&Delivery) -> Option<()> + Send + 'static,
) -> axum::response::Response {
    let trace_id = NEXT_TRACE_ID.fetch_add(1, Ordering::Relaxed);
    let (sender, receiver) = tokio::sync::mpsc::channel::<Result<Vec<u8>, std::io::Error>>(1);
    tokio::task::spawn_blocking(move || {
        let delivery = Delivery {
            sender,
            lifecycle: TraceLifecycle::start(trace_id),
            serialization_failed: Cell::new(false),
        };
        if produce(&delivery).is_some() {
            delivery.lifecycle.status.set("completed");
        } else if !delivery.serialization_failed.get() {
            delivery.lifecycle.status.set("cancelled");
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

pub(crate) struct Delivery {
    sender: tokio::sync::mpsc::Sender<Result<Vec<u8>, std::io::Error>>,
    lifecycle: TraceLifecycle,
    serialization_failed: Cell<bool>,
}

impl Delivery {
    pub(crate) fn is_cancelled(&self) -> bool {
        self.sender.is_closed()
    }

    pub(crate) fn send(&self, frame: impl serde::Serialize, step_count: usize) -> bool {
        if self.is_cancelled() {
            return false;
        }
        let bytes = serde_json::to_vec(&frame).map(|mut bytes| {
            bytes.push(b'\n');
            bytes
        });
        match bytes {
            Ok(bytes) => {
                if self.sender.blocking_send(Ok(bytes)).is_ok() {
                    // Accepted by the bounded transport queue, not proof of client receipt.
                    self.lifecycle
                        .sent_steps
                        .set(self.lifecycle.sent_steps.get() + step_count);
                    true
                } else {
                    false
                }
            }
            Err(error) => {
                self.serialization_failed.set(true);
                let _ = self.sender.blocking_send(Err(std::io::Error::other(error)));
                false
            }
        }
    }
}
