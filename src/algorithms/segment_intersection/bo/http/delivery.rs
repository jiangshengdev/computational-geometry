//! Encode the real BO trace through the shared bounded transport.
use super::super::sweep::stream_intersections;
use super::protocol::TraceEncoder;
use crate::Segment;

pub(super) fn response(segments: Vec<Segment>) -> axum::response::Response {
    crate::http::trace_delivery::response(move |delivery| {
        let mut encoder = TraceEncoder::default();
        let results = stream_intersections(
            &segments,
            &mut |trace| {
                let frame = encoder.batch(trace);
                let count = frame.step_count();
                delivery.send(frame, count)
            },
            &|| delivery.is_cancelled(),
        )?;
        delivery.send(encoder.complete(results), 0).then_some(())
    })
}
