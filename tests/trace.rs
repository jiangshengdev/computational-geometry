use axum::{Json, body::Body, http::Request};
use computational_geometry::http::router;
use serde::Deserialize;
use tower::ServiceExt;

async fn trace_json(segments: &str) -> Response {
    let response = router()
        .oneshot(
            Request::post("/api/intersections")
                .header("content-type", "application/json")
                .body(Body::from(format!(
                    r#"{{"segments":{segments},"trace":true}}"#
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    // A segment may now also occur inside a distinct call argument value.
    // Value-table uniqueness and reuse are checked by the contract below.
    let response = Json::<Response>::from_bytes(&bytes).unwrap().0;
    assert_trace_tables(&response);
    response
}

fn assert_trace_tables(response: &Response) {
    let trace = &response.trace;
    assert_eq!(
        trace
            .point_values
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len(),
        trace.point_values.len()
    );
    assert_eq!(
        trace
            .result_values
            .iter()
            .map(|result| result.segments)
            .collect::<std::collections::HashSet<_>>()
            .len(),
        trace.result_values.len()
    );
    let mut seen_points = std::collections::HashSet::new();
    let mut seen_results = std::collections::HashSet::new();
    for step in &trace.steps {
        for &index in &step.pending {
            assert!(index < trace.point_values.len());
            if !seen_points.contains(&index) {
                assert_eq!(
                    index,
                    seen_points.len(),
                    "point table follows first appearance"
                );
                seen_points.insert(index);
            }
        }
        for &index in &step.results {
            assert!(index < trace.result_values.len());
            if !seen_results.contains(&index) {
                assert_eq!(
                    index,
                    seen_results.len(),
                    "result table follows first appearance"
                );
                seen_results.insert(index);
            }
        }
    }
    assert_eq!(seen_points.len(), trace.point_values.len());
    assert_eq!(seen_results.len(), trace.result_values.len());
    assert_eq!(
        trace
            .steps
            .last()
            .unwrap()
            .results
            .iter()
            .map(|&index| &trace.result_values[index])
            .collect::<Vec<_>>(),
        response.intersections.iter().collect::<Vec<_>>()
    );
}

#[tokio::test]
async fn take_boundaries_show_pop_before_binding_and_empty_exit() {
    let response = trace_json(r#"[{"start":{"x":{"numerator":"0","denominator":"1"},"y":{"numerator":"0","denominator":"1"}},"end":{"x":{"numerator":"2","denominator":"1"},"y":{"numerator":"0","denominator":"1"}}}]"#).await;
    let values = &response.trace.values;
    let steps = &response.trace.steps;
    assert_eq!(
        values
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len(),
        values.len()
    );
    let segment_indices: Vec<_> = steps
        .iter()
        .filter(|step| step.execution.module == "take")
        .flat_map(|step| &step.execution.context.locals)
        .filter(|variable| variable.name == "segments")
        .map(|variable| variable.value.unwrap())
        .collect();
    assert_eq!(segment_indices.len(), 9);
    assert!(
        segment_indices
            .iter()
            .all(|index| *index == segment_indices[0])
    );
    let entry = &steps[1];
    let pop = &steps[2];
    let bound = &steps[3];
    assert_eq!(entry.action, "take-entry");
    assert_eq!(pop.action, "take-pop");
    assert_eq!(bound.action, "take");
    for (step, boundary) in [(entry, 0), (pop, 1), (bound, 2)] {
        assert_eq!(step.execution.module, "take");
        assert_eq!(step.execution.boundary, Some(boundary));
        assert_eq!(step.execution.entry, boundary == 0);
    }
    assert_eq!(entry.pending.len(), 2);
    assert_eq!(pop.pending.len(), 1);
    assert_eq!(pop.pending[0], entry.pending[1]);
    assert_eq!(
        response.trace.point_values[entry.pending[0]],
        *bound.current.as_ref().unwrap()
    );
    assert!(pop.current.is_none());
    assert!(pop.starts.is_empty());
    assert_eq!(variable(entry, "next").availability, "unassigned");
    assert_eq!(
        variable(pop, "next").text(values),
        Some("Some(((0, 0), Event { starts: [0] }))")
    );
    assert_eq!(variable(pop, "point").availability, "unassigned");
    assert_eq!(variable(bound, "point").text(values), Some("(0, 0)"));
    assert_eq!(
        variable(bound, "event").text(values),
        Some("Event { starts: [0] }")
    );
    for (index, step) in steps.iter().enumerate() {
        if matches!(
            step.action.as_str(),
            "take-entry" | "take-pop" | "take-empty"
        ) {
            let previous = &steps[index - 1];
            assert_eq!(step.current, previous.current);
            assert_eq!(step.active, previous.active);
            assert_eq!(step.starts, previous.starts);
            assert_eq!(step.ends, previous.ends);
            assert_eq!(step.passes, previous.passes);
        }
        assert_eq!(step.execution.context.function, "sweep");
        assert_eq!(step.execution.context.parameters[0].name, "segments");
        assert_eq!(
            step.execution.context.parameters[0].availability,
            "unavailable"
        );
        assert!(step.execution.context.parameters[0].value.is_none());
        for variable in &step.execution.context.locals {
            assert!(!variable.r#type.is_empty());
            assert_eq!(
                variable.value.is_some(),
                variable.availability == "available"
            );
            if let Some(index) = variable.value {
                assert!(index < values.len());
            }
        }
        if step.action == "initial" {
            assert_eq!(step.execution.module, step.action);
            assert_eq!(step.execution.boundary, None);
            assert!(!step.execution.entry);
        } else {
            assert!(matches!(
                step.execution.module.as_str(),
                "take" | "classify" | "record" | "activity" | "neighbors" | "geometry"
            ));
            assert!(step.execution.boundary.is_some());
            assert_eq!(step.execution.entry, step.execution.boundary == Some(0));
        }
    }
    let final_step = steps.last().unwrap();
    assert_eq!(final_step.action, "take-empty");
    assert_eq!(variable(final_step, "next").text(values), Some("None"));
    assert_eq!(variable(final_step, "point").availability, "unavailable");
    let empty = trace_json("[]").await;
    assert_eq!(
        empty
            .trace
            .steps
            .iter()
            .map(|step| step.action.as_str())
            .collect::<Vec<_>>(),
        ["initial", "take-entry", "take-pop", "take-empty"]
    );
}

#[tokio::test]
async fn take_context_keeps_exact_sweep_coordinates_separate_from_canvas_coordinates() {
    let response = trace_json(r#"[{"start":{"x":{"numerator":"0","denominator":"1"},"y":{"numerator":"0","denominator":"1"}},"end":{"x":{"numerator":"0","denominator":"1"},"y":{"numerator":"1","denominator":"1"}}}]"#).await;
    let values = &response.trace.values;
    let takes: Vec<_> = response
        .trace
        .steps
        .iter()
        .filter(|step| step.action == "take")
        .collect();
    assert_eq!(takes.len(), 2);
    assert_eq!(variable(takes[0], "shear").text(values), Some("1/8192"));
    assert_eq!(
        variable(takes[0], "queue").text(values),
        Some("{(1/8192, 1): Event { starts: [] }}")
    );
    assert_eq!(
        variable(takes[1], "point").text(values),
        Some("(1/8192, 1)")
    );
    assert_eq!(takes[1].current.as_ref().unwrap().x.numerator, "0");
    assert_eq!(takes[1].current.as_ref().unwrap().x.denominator, "1");
    assert_eq!(variable(takes[1], "next").availability, "unavailable");
}

fn variable<'a>(step: &'a Step, name: &str) -> &'a Variable {
    step.execution
        .context
        .locals
        .iter()
        .find(|variable| variable.name == name)
        .unwrap()
}

#[tokio::test]
async fn trace_tables_preserve_fractional_overlap_and_reuse_result_indices() {
    let response = trace_json(r#"[{"start":{"x":{"numerator":"0","denominator":"1"},"y":{"numerator":"0","denominator":"1"}},"end":{"x":{"numerator":"3","denominator":"1"},"y":{"numerator":"0","denominator":"1"}}},{"start":{"x":{"numerator":"1","denominator":"3"},"y":{"numerator":"0","denominator":"1"}},"end":{"x":{"numerator":"2","denominator":"1"},"y":{"numerator":"0","denominator":"1"}}}]"#).await;
    let trace = &response.trace;
    assert_eq!(trace.point_values.len(), 4);
    assert_eq!(trace.point_values[1].x.numerator, "1");
    assert_eq!(trace.point_values[1].x.denominator, "3");
    assert_eq!(trace.result_values.len(), 1);
    assert_eq!(trace.result_values[0].segments, [0, 1]);
    let Geometry::Overlap { start, end } = &trace.result_values[0].geometry else {
        panic!("the exact overlap must remain an interval");
    };
    assert_eq!(start.x.numerator, "1");
    assert_eq!(start.x.denominator, "3");
    assert_eq!(end.x.numerator, "2");
    assert_eq!(end.x.denominator, "1");
    let recorded = trace
        .steps
        .iter()
        .position(|step| step.action == "record")
        .unwrap();
    assert!(recorded + 1 < trace.steps.len());
    assert!(
        trace.steps[..recorded]
            .iter()
            .all(|step| step.results.is_empty())
    );
    assert!(
        trace.steps[recorded..]
            .iter()
            .all(|step| step.results == [0])
    );
}

#[derive(Deserialize)]
struct Execution {
    module: String,
    boundary: Option<usize>,
    entry: bool,
    context: Context,
}

#[derive(Deserialize)]
struct Context {
    function: String,
    parameters: Vec<Variable>,
    locals: Vec<Variable>,
}

#[derive(Deserialize)]
struct Variable {
    name: String,
    r#type: String,
    availability: String,
    value: Option<usize>,
}

impl Variable {
    fn text<'a>(&self, values: &'a [String]) -> Option<&'a str> {
        self.value.map(|index| values[index].as_str())
    }
}

#[derive(Deserialize)]
struct Response {
    trace: Trace,
    intersections: Vec<Intersection>,
}

#[derive(Deserialize)]
struct Trace {
    steps: Vec<Step>,
    values: Vec<String>,
    point_values: Vec<Point>,
    result_values: Vec<Intersection>,
}

#[derive(Deserialize)]
struct Step {
    execution: Execution,
    pending: Vec<usize>,
    results: Vec<usize>,
    action: String,
    current: Option<Point>,
    active: Vec<usize>,
    starts: Vec<usize>,
    ends: Vec<usize>,
    passes: Vec<usize>,
}

#[derive(Debug, PartialEq, Eq, Hash, Deserialize)]
struct Point {
    x: Coordinate,
    y: Coordinate,
}

#[derive(Debug, PartialEq, Eq, Hash, Deserialize)]
struct Coordinate {
    numerator: String,
    denominator: String,
}

#[derive(Debug, PartialEq, Deserialize)]
struct Intersection {
    segments: [usize; 2],
    geometry: Geometry,
}

#[derive(Debug, PartialEq, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum Geometry {
    Point { point: Point },
    Overlap { start: Point, end: Point },
}

#[tokio::test]
async fn equal_x_trace_events_reorder_only_their_own_participants() {
    // Two separate crossings at (0,-2) and (0,2), followed by (2,0).
    // The latter catches stale height comparisons surviving to a different x.
    let segments = [
        (-1, -3, 3, 1),
        (-1, -1, 3, -5),
        (-1, 1, 3, 5),
        (-1, 3, 3, -1),
    ];
    let point = |x, y| {
        format!(
            r#"{{"x":{{"numerator":"{x}","denominator":"1"}},"y":{{"numerator":"{y}","denominator":"1"}}}}"#
        )
    };
    let segments = segments
        .into_iter()
        .map(|(x1, y1, x2, y2)| format!(r#"{{"start":{},"end":{}}}"#, point(x1, y1), point(x2, y2)))
        .collect::<Vec<_>>()
        .join(",");
    let response = router()
        .oneshot(
            Request::post("/api/intersections")
                .header("content-type", "application/json")
                .body(Body::from(format!(
                    r#"{{"segments":[{segments}],"trace":true}}"#
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let Json(response) = Json::<Response>::from_bytes(&bytes).unwrap();
    assert_trace_tables(&response);
    for (x, y, before, after, mut participants, actions) in [
        (
            "0",
            "-2",
            vec![0, 1, 2, 3],
            vec![1, 0, 2, 3],
            vec![0, 1],
            vec!["take", "record", "reorder", "check", "complete"],
        ),
        (
            "0",
            "2",
            vec![1, 0, 2, 3],
            vec![1, 0, 3, 2],
            vec![2, 3],
            vec!["take", "record", "reorder", "check", "discover", "complete"],
        ),
        (
            "2",
            "0",
            vec![1, 0, 3, 2],
            vec![1, 3, 0, 2],
            vec![0, 3],
            vec!["take", "record", "reorder", "check", "check", "complete"],
        ),
    ] {
        let event: Vec<_> = response
            .trace
            .steps
            .iter()
            .filter(|step| {
                !matches!(
                    step.action.as_str(),
                    "take-entry" | "take-pop" | "take-empty" | "micro"
                ) && step.current.as_ref().is_some_and(|p| {
                    p.x.numerator == x
                        && p.y.numerator == y
                        && p.x.denominator == "1"
                        && p.y.denominator == "1"
                })
            })
            .collect();
        assert_eq!(
            event
                .iter()
                .map(|step| step.action.as_str())
                .collect::<Vec<_>>(),
            actions
        );
        assert_eq!(event[0].active, before);
        assert_eq!(event[1].active, before);
        for step in &event[2..] {
            assert_eq!(step.active, after);
        }
        participants.sort_unstable();
        for step in event {
            assert!(step.starts.is_empty());
            assert!(step.ends.is_empty());
            let mut passes = step.passes.clone();
            passes.sort_unstable();
            assert_eq!(passes, participants);
        }
    }
}
