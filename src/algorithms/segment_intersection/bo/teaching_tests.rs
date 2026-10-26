use super::super::sweep::{stream_intersections, trace_intersections};
use super::*;
use crate::Segment;

#[test]
fn streaming_preserves_control_stops_and_scopes_in_collected_order() {
    let point = |x: i64, y: i64| Point {
        x: Rational::from_integer(x.into()),
        y: Rational::from_integer(y.into()),
    };
    let segments = [(0, 0, 4, 4), (0, 4, 4, 0), (1, 1, 3, 3)].map(|(x1, y1, x2, y2)| Segment {
        start: point(x1, y1),
        end: point(x2, y2),
    });
    let (expected_results, trace) = trace_intersections(&segments);
    let mut streamed = Vec::new();
    let mut batches = 0;
    let results = stream_intersections(
        &segments,
        &mut |batch| {
            batches += 1;
            assert_eq!(batch.shear, trace.shear);
            streamed.extend(batch.steps);
            true
        },
        &|| false,
    )
    .unwrap();
    assert_eq!(results.intersections, expected_results);
    assert_eq!(results.shear, trace.shear);
    assert!(batches > 1);
    assert_eq!(streamed.len(), trace.steps.len());
    for (actual, expected) in streamed.iter().zip(&trace.steps) {
        assert_eq!(
            (
                actual.execution.module,
                actual.execution.boundary,
                actual.action
            ),
            (
                expected.execution.module,
                expected.execution.boundary,
                expected.action
            )
        );
        let controls = |step: &SweepStep| {
            step.execution
                .controls
                .iter()
                .map(|control| {
                    (
                        control.line,
                        control.keyword,
                        control.occurrence,
                        control.state,
                    )
                })
                .collect::<Vec<_>>()
        };
        assert_eq!(controls(actual), controls(expected));
        assert!(actual.execution.blocks == expected.execution.blocks);
        let locals = |step: &SweepStep| {
            step.execution
                .context
                .locals
                .iter()
                .map(|variable| {
                    (
                        variable.name,
                        variable.scope,
                        variable.availability,
                        variable.value.clone(),
                    )
                })
                .collect::<Vec<_>>()
        };
        assert_eq!(locals(actual), locals(expected));
    }
}

#[test]
fn trace_values_share_compact_geometry_and_intersection_format() {
    let point = |x: i64, y: i64| Point {
        x: Rational::from_integer(x.into()),
        y: Rational::from_integer(y.into()),
    };
    for (coordinates, expected) in [
        ([(0, 0, 4, 4), (0, 4, 4, 0)], "(2, 2)"),
        ([(0, 0, 1, 1), (0, 1, 1, 0)], "(1/2, 1/2)"),
        ([(0, 0, 4, 0), (1, 0, 3, 0)], "(1, 0) → (3, 0)"),
    ] {
        let segments = coordinates.map(|(x1, y1, x2, y2)| Segment {
            start: point(x1, y1),
            end: point(x2, y2),
        });
        let (results, trace) = trace_intersections(&segments);
        assert_eq!(results.len(), 1);
        let expected_intersection = format!("S0 × S1: {expected}");
        let expected_results = format!("[{expected_intersection}]");
        let mut saw_geometry = false;
        let mut saw_pending_push = false;
        let mut saw_completed_push = false;
        for step in &trace.steps {
            for variable in &step.execution.context.locals {
                if variable.name == "geometry" && variable.availability == "available" {
                    assert_eq!(variable.value.as_deref(), Some(expected));
                    saw_geometry = true;
                }
            }
            for call in &step.execution.calls {
                if call.function != "push"
                    || !call
                        .arguments
                        .iter()
                        .any(|value| value.r#type == "Intersection")
                {
                    continue;
                }
                let receiver = call
                    .arguments
                    .iter()
                    .find(|value| value.name == "self")
                    .unwrap();
                assert_eq!(receiver.value.as_deref(), Some("[]"));
                let argument = call
                    .arguments
                    .iter()
                    .find(|value| value.name == "value")
                    .unwrap();
                let result = step
                    .execution
                    .context
                    .locals
                    .iter()
                    .find(|value| value.name == "result")
                    .unwrap();
                if call.result.availability == "available" {
                    assert_eq!(
                        argument.value.as_deref(),
                        Some(expected_intersection.as_str())
                    );
                    assert_eq!(result.value.as_deref(), Some(expected_results.as_str()));
                    saw_completed_push = true;
                } else {
                    assert_eq!(result.value.as_deref(), receiver.value.as_deref());
                    saw_pending_push = true;
                }
            }
        }
        assert!(
            saw_geometry && saw_pending_push && saw_completed_push,
            "{expected}"
        );
    }
}
