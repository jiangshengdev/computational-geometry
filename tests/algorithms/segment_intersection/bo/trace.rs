use axum::{body::Body, http::Request};
use computational_geometry::http::router;
use serde::Deserialize;
use tower::ServiceExt;

async fn trace_json(segments: &str) -> Response {
    let response = router()
        .oneshot(
            Request::post("/api/bo/intersections")
                .header("content-type", "application/json")
                .body(Body::from(format!(
                    r#"{{"segments":{segments},"trace":true}}"#
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    assert_eq!(response.headers()["content-type"], "application/x-ndjson");
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    // A segment may now also occur inside a distinct call argument value.
    // Value-table uniqueness and reuse are checked by the contract below.
    let mut trace = Trace::default();
    let mut intersections = None;
    let mut frames = 0;
    for line in bytes
        .split(|byte| *byte == b'\n')
        .filter(|line| !line.is_empty())
    {
        assert!(intersections.is_none(), "completion must be the last frame");
        let frame: TraceFrame = serde_json::from_slice(line).unwrap();
        if frames == 0 {
            assert!(!frame.complete, "the first frame must precede completion");
            assert_eq!(frame.trace.steps.len(), 1);
            assert_eq!(frame.trace.steps[0].action, "initial");
        }
        trace.values.extend(frame.trace.values);
        trace.point_values.extend(frame.trace.point_values);
        trace.result_values.extend(frame.trace.result_values);
        for step in &frame.trace.steps {
            assert!(
                step.pending
                    .iter()
                    .all(|index| *index < trace.point_values.len())
            );
            assert!(
                step.results
                    .iter()
                    .all(|index| *index < trace.result_values.len())
            );
            for variable in
                std::iter::once(&step.execution.context)
                    .chain(&step.execution.outer)
                    .flat_map(|context| {
                        context
                            .parameters
                            .iter()
                            .chain(&context.locals)
                            .chain(&context.captures)
                    })
                    .chain(step.execution.calls.iter().flat_map(|call| {
                        call.arguments.iter().chain(std::iter::once(&call.result))
                    }))
            {
                assert!(
                    variable
                        .value
                        .is_none_or(|index| index < trace.values.len()),
                    "a frame must provide every value before its first reference"
                );
            }
        }
        trace.steps.extend(frame.trace.steps);
        if frame.complete {
            intersections = Some(
                frame
                    .intersections
                    .expect("completion carries exact results"),
            );
        } else {
            assert!(
                frame.intersections.is_none(),
                "unfinished frames must not expose final results"
            );
        }
        frames += 1;
    }
    assert!(frames >= 2);
    let response = Response {
        trace,
        intersections: intersections.expect("exactly one completion frame is required"),
    };
    assert_trace_tables(&response);
    let ordinary = router()
        .oneshot(
            Request::post("/api/bo/intersections")
                .header("content-type", "application/json")
                .body(Body::from(format!(
                    r#"{{"segments":{segments},"trace":false}}"#
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(ordinary.status(), 200);
    #[derive(Deserialize)]
    struct OrdinaryResponse {
        intersections: Vec<Intersection>,
    }
    let ordinary: OrdinaryResponse = serde_json::from_slice(
        &axum::body::to_bytes(ordinary.into_body(), usize::MAX)
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(response.intersections, ordinary.intersections);
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
async fn preprocessing_reports_same_line_pairs_before_any_sweep_position() {
    let response = trace_segments(&[(0, 0, 4, 0), (3, 0, 1, 0), (2, -1, 2, 1), (2, 0, 2, 0)]).await;
    let first_event = response
        .trace
        .steps
        .iter()
        .position(|s| s.action == "take")
        .unwrap();
    let record = response
        .trace
        .steps
        .iter()
        .position(|s| s.action == "record")
        .unwrap();
    assert!(record < first_event);
    let step = &response.trace.steps[record];
    assert_eq!(step.execution.module, "same_line");
    assert!(step.current.is_none() && step.active.is_empty());
    assert_eq!(step.checked, vec![[0, 1]]);
    assert_eq!(step.subjects, vec![0, 1]);
    assert_eq!(variable(step, "line_members").availability, "available");
    let returned = response
        .trace
        .steps
        .iter()
        .find(|s| s.execution.context.function == "prepare" && s.execution.returning)
        .unwrap();
    assert_eq!(
        variable(returned, "line_members").availability,
        "unavailable"
    );
    assert!(variable(returned, "line_members").value.is_none());
    assert_eq!(
        response.trace.result_values[step.results[0]].segments,
        [0, 1]
    );
    for step in &response.trace.steps {
        assert!(
            step.active
                .iter()
                .chain(&step.starts)
                .chain(&step.ends)
                .chain(&step.passes)
                .all(|&id| id < 4)
        );
        for pair in &step.checked {
            assert!(response.intersections.iter().any(|i| i.segments == *pair));
        }
    }
    assert_eq!(response.intersections.len(), 6);
}

#[tokio::test]
async fn real_calls_have_distinct_identity_pending_values_return_and_resume() {
    let isolated = trace_segments(&[(1, 1, 1, 1)]).await;
    let call = isolated
        .trace
        .steps
        .iter()
        .flat_map(|s| &s.execution.calls)
        .find(|c| c.function == "recover_members")
        .unwrap();
    let incident = call
        .arguments
        .iter()
        .find(|v| v.name == "incident")
        .unwrap();
    assert_eq!(incident.availability, "available");
    assert_eq!(isolated.trace.values[incident.value.unwrap()], "[]");
    let response = trace_segments(&[(0, 0, 4, 4), (0, 4, 4, 0)]).await;
    for function in ["prepare", "recover_members", "schedule"] {
        let entries: Vec<_> = response
            .trace
            .steps
            .iter()
            .enumerate()
            .filter(|(_, s)| s.execution.context.function == function && s.execution.entry)
            .collect();
        assert!(!entries.is_empty(), "{function}");
        let mut ids = std::collections::BTreeSet::new();
        for (i, entry) in entries {
            assert!(ids.insert(entry.execution.context.id));
            assert_eq!(entry.execution.outer.len(), 1);
            assert_eq!(entry.execution.outer[0].function, "sweep");
            assert_eq!(variable(entry, "return_value").availability, "unassigned");
            let returned = response.trace.steps[i + 1..]
                .iter()
                .position(|s| {
                    s.execution.context.id == entry.execution.context.id && s.execution.returning
                })
                .unwrap()
                + i
                + 1;
            let returned_step = &response.trace.steps[returned];
            assert_eq!(returned_step.execution.boundary, Some(2));
            assert!(returned_step.execution.controls.iter().any(|c| c.line
                == if function == "recover_members" { 2 } else { 3 }
                && c.keyword == "return"
                && c.occurrence == 0
                && c.state == "returned"));
            let before = &response.trace.steps[returned - 1];
            assert!(
                before
                    .execution
                    .controls
                    .iter()
                    .any(|c| c.keyword == "return" && c.state == "pending")
            );
            assert_eq!(variable(before, "return_value").availability, "unassigned");
            assert_eq!(
                variable(returned_step, "return_value").availability,
                "available"
            );
            assert!(
                variable(returned_step, "return_value")
                    .text(&response.trace.values)
                    .is_some()
            );
            let resume = &response.trace.steps[returned + 1];
            assert_eq!(resume.execution.context.id, 0);
            assert!(resume.execution.resuming);
        }
    }
}

#[tokio::test]
async fn each_result_push_exposes_pending_and_completed_values_without_future_results() {
    let response = trace_segments(&[(0, 0, 4, 0), (1, 0, 3, 0), (2, -1, 2, 1)]).await;
    let mut completed = 0;
    for (i, step) in response.trace.steps.iter().enumerate() {
        for call in &step.execution.calls {
            if call.function != "push" || call.result.availability != "unassigned" {
                continue;
            }
            assert_eq!(call.line, 1);
            assert_eq!(call.arguments[1].r#type, "Intersection");
            assert!(call.arguments[1].scope.is_none());
            let after = &response.trace.steps[i + 1];
            assert_eq!(after.results.len(), step.results.len() + 1);
            assert_eq!(after.checked, step.checked);
            assert_eq!(after.execution.calls[0].result.availability, "available");
            assert_eq!(
                call.arguments[0].text(&response.trace.values),
                variable(step, "result").text(&response.trace.values)
            );
            completed += 1;
        }
    }
    assert_eq!(completed, response.intersections.len());
}

#[tokio::test]
async fn ordinary_coverage_endpoints_do_not_query_or_recheck_the_overlap_group() {
    let response = trace_segments(&[(0, 0, 8, 0), (1, 0, 7, 0), (2, 0, 6, 0), (3, 0, 5, 0)]).await;
    assert!(
        !response
            .trace
            .steps
            .iter()
            .any(|s| s.execution.context.function == "recover_members")
    );
    assert_eq!(
        response
            .trace
            .steps
            .iter()
            .filter(|s| s.action == "take")
            .count(),
        2
    );
    assert_eq!(
        response
            .trace
            .steps
            .iter()
            .filter(|s| s.action == "record")
            .count(),
        6
    );
    let empty = trace_segments(&[]).await;
    assert!(empty.intersections.is_empty());
    assert_eq!(empty.trace.steps.last().unwrap().execution.module, "done");
    assert!(
        !empty
            .trace
            .steps
            .iter()
            .any(|s| s.execution.context.function == "schedule")
    );
}

#[tokio::test]
async fn execution_coordinates_remain_sheared_while_canvas_coordinates_are_restored() {
    let response = trace_segments(&[(0, 0, 0, 1)]).await;
    let takes: Vec<_> = response
        .trace
        .steps
        .iter()
        .filter(|s| s.action == "take")
        .collect();
    assert_eq!(takes.len(), 2);
    assert_eq!(
        variable(takes[0], "shear").text(&response.trace.values),
        Some("1/8192")
    );
    assert_eq!(
        variable(takes[1], "point").text(&response.trace.values),
        Some("(1/8192, 1)")
    );
    assert_eq!(takes[1].current.as_ref().unwrap().x.numerator, "0");
}

#[tokio::test]
async fn trace_point_table_deduplicates_equivalent_input_fraction_representations() {
    let segments: Vec<_> = [
        ("7", "5", "3", "2"),
        ("14", "10", "9", "6"),
        ("8", "5", "3", "2"),
    ]
    .into_iter()
    .map(|(xn, xd, yn, yd)| {
        let point = serde_json::json!({
            "x": {"numerator": xn, "denominator": xd},
            "y": {"numerator": yn, "denominator": yd},
        });
        serde_json::json!({"start": point, "end": point})
    })
    .collect();
    let response = trace_json(&serde_json::to_string(&segments).unwrap()).await;
    assert_eq!(response.trace.point_values.len(), 2);
    for (point, numerator) in response.trace.point_values.iter().zip(["7", "8"]) {
        assert_eq!(point.x.numerator, numerator);
        assert_eq!(point.x.denominator, "5");
        assert_eq!(point.y.numerator, "3");
        assert_eq!(point.y.denominator, "2");
    }
    assert_eq!(response.intersections.len(), 1);
    assert_eq!(response.intersections[0].segments, [0, 1]);
}

fn variable<'a>(step: &'a Step, name: &str) -> &'a Variable {
    step.execution
        .context
        .locals
        .iter()
        .chain(&step.execution.context.parameters)
        .find(|variable| variable.name == name)
        .unwrap()
}

async fn trace_segments(segments: &[(i32, i32, i32, i32)]) -> Response {
    let point = |x: i32, y: i32| {
        serde_json::json!({
            "x": { "numerator": x.to_string(), "denominator": "1" },
            "y": { "numerator": y.to_string(), "denominator": "1" },
        })
    };
    let segments: Vec<_> = segments
        .iter()
        .map(
            |&(x1, y1, x2, y2)| serde_json::json!({ "start": point(x1, y1), "end": point(x2, y2) }),
        )
        .collect();
    trace_json(&serde_json::to_string(&segments).unwrap()).await
}

#[tokio::test]
async fn trace_tables_preserve_fractional_overlap_and_reuse_result_indices() {
    let response = trace_json(r#"[{"start":{"x":{"numerator":"0","denominator":"1"},"y":{"numerator":"0","denominator":"1"}},"end":{"x":{"numerator":"3","denominator":"1"},"y":{"numerator":"0","denominator":"1"}}},{"start":{"x":{"numerator":"1","denominator":"3"},"y":{"numerator":"0","denominator":"1"}},"end":{"x":{"numerator":"2","denominator":"1"},"y":{"numerator":"0","denominator":"1"}}}]"#).await;
    let trace = &response.trace;
    assert_eq!(trace.point_values.len(), 2); // only maximal coverage endpoints are fixed events
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
    outer: Vec<Context>,
    returning: bool,
    resuming: bool,
    calls: Vec<ExecutionCall>,
    controls: Vec<Control>,
}

#[derive(Debug, Deserialize)]
struct Control {
    line: usize,
    keyword: String,
    occurrence: usize,
    state: String,
}

#[derive(Deserialize)]
struct ExecutionCall {
    line: usize,
    function: String,
    arguments: Vec<Variable>,
    result: Variable,
}

#[derive(Deserialize)]
struct Context {
    id: usize,
    function: String,
    parameters: Vec<Variable>,
    locals: Vec<Variable>,
    captures: Vec<Variable>,
}

#[derive(Deserialize)]
struct Variable {
    name: String,
    r#type: String,
    availability: String,
    value: Option<usize>,
    scope: Option<String>,
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

#[derive(Default, Deserialize)]
struct Trace {
    steps: Vec<Step>,
    values: Vec<String>,
    point_values: Vec<Point>,
    result_values: Vec<Intersection>,
}

#[derive(Deserialize)]
struct TraceFrame {
    #[serde(flatten)]
    trace: Trace,
    complete: bool,
    intersections: Option<Vec<Intersection>>,
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
    checked: Vec<[usize; 2]>,
    subjects: Vec<usize>,
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
    let response = trace_segments(&segments).await;
    for (x, y, before, after, mut participants, actions) in [
        (
            "0",
            "-2",
            vec![0, 1, 2, 3],
            vec![1, 0, 2, 3],
            vec![0, 1],
            vec!["take", "record", "reorder", "complete"],
        ),
        (
            "0",
            "2",
            vec![1, 0, 2, 3],
            vec![1, 0, 3, 2],
            vec![2, 3],
            vec!["take", "record", "reorder", "complete"],
        ),
        (
            "2",
            "0",
            vec![1, 0, 3, 2],
            vec![1, 3, 0, 2],
            vec![0, 3],
            vec!["take", "record", "reorder", "complete"],
        ),
    ] {
        let event: Vec<_> = response
            .trace
            .steps
            .iter()
            .filter(|step| {
                !matches!(
                    step.action.as_str(),
                    "take-entry" | "take-pop" | "take-empty" | "micro" | "check" | "discover"
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
