use axum::{body::Body, http::Request};
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
                step.execution
                    .context
                    .parameters
                    .iter()
                    .chain(&step.execution.context.locals)
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
async fn retain_calls_expose_real_parameters_scopes_and_separate_returns() {
    let response = trace_segments(&[(0, 0, 4, 4), (0, 4, 4, 0)]).await;
    let steps = &response.trace.steps;
    let values = &response.trace.values;
    let mut calls = std::collections::HashSet::new();
    let mut outcomes = std::collections::HashSet::new();
    let mut sites = std::collections::HashSet::new();
    for (index, step) in steps.iter().enumerate().filter(|(_, step)| {
        step.execution.context.function == "retain closure" && !step.execution.returning
    }) {
        assert!(calls.insert(step.execution.context.id));
        let id = &step.execution.context.parameters[0];
        assert_eq!(id.name, "id");
        assert!(matches!(id.text(values), Some("0" | "1")));
        assert_eq!(step.execution.outer.len(), 1);
        assert_eq!(step.execution.outer[0].function, "sweep");
        assert!(!step.execution.context.captures.is_empty());
        assert_ne!(variable(step, "return_value").availability, "available");
        let returned = &steps[index + 1];
        assert_eq!(returned.execution.context.id, step.execution.context.id);
        assert!(returned.execution.returning);
        outcomes.insert(variable(returned, "return_value").text(values).unwrap());
        let caller = &steps[index + 2];
        assert_eq!(caller.execution.context.id, step.execution.outer[0].id);
        sites.insert(caller.execution.boundary.unwrap());
    }
    assert!(calls.len() > 3, "real repeated calls must be recorded");
    assert_eq!(outcomes, std::collections::HashSet::from(["true", "false"]));
    assert_eq!(sites, std::collections::HashSet::from([0, 1, 2]));
    let empty = trace_segments(&[]).await;
    assert!(
        !empty
            .trace
            .steps
            .iter()
            .any(|step| step.execution.context.function == "retain closure")
    );
}

#[tokio::test]
async fn other_closures_preserve_actual_arguments_returns_and_no_call_paths() {
    let response = trace_segments(&[(0, 0, 4, 4), (0, 4, 4, 0)]).await;
    let steps = &response.trace.steps;
    let values = &response.trace.values;
    for function in [
        "sort_by closure",
        "partition_point closure",
        "then closure",
        "original closure",
    ] {
        let entries: Vec<_> = steps
            .iter()
            .enumerate()
            .filter(|(_, step)| {
                step.execution.context.function == function && !step.execution.returning
            })
            .collect();
        assert!(!entries.is_empty(), "fixture reaches {function}");
        for (index, step) in entries {
            let returned = &steps[index + 1];
            assert_eq!(returned.execution.context.id, step.execution.context.id);
            assert!(returned.execution.returning);
            assert_ne!(variable(step, "return_value").availability, "available");
            assert_eq!(variable(returned, "return_value").availability, "available");
            assert_eq!(
                steps[index + 2].execution.context.id,
                step.execution.outer.last().unwrap().id
            );
            if function == "sort_by closure" {
                assert_eq!(
                    step.execution
                        .context
                        .parameters
                        .iter()
                        .map(|v| v.name.as_str())
                        .collect::<Vec<_>>(),
                    ["a", "b"]
                );
                assert!(matches!(
                    variable(returned, "return_value").text(values),
                    Some("Less" | "Equal" | "Greater")
                ));
            }
            if function == "original closure" {
                assert_eq!(
                    step.execution.context.parameters[0].text(values),
                    Some("(2, 2)")
                );
                assert_eq!(
                    variable(returned, "return_value").text(values),
                    Some("(2, 2)")
                );
            }
        }
    }
    for (index, step) in steps.iter().enumerate().filter(|(_, step)| {
        step.execution.module == "neighbors" && step.execution.boundary == Some(1)
    }) {
        if variable(step, "inserted").text(values) == Some("0") {
            assert_ne!(steps[index + 1].execution.context.function, "then closure");
        }
    }
}

#[tokio::test]
async fn displayed_function_calls_preserve_outer_scope_until_normal_or_early_return() {
    let mut outcomes = std::collections::HashSet::new();
    for segments in [
        vec![(0, 0, 4, 4), (0, 4, 4, 0)],
        vec![(0, 0, 4, 0), (0, 1, 4, 1)],
    ] {
        let response = trace_segments(&segments).await;
        let steps = &response.trace.steps;
        let mut ids = std::collections::HashSet::new();
        for (index, step) in steps
            .iter()
            .enumerate()
            .filter(|(_, step)| step.execution.module == "geometry" && step.execution.entry)
        {
            assert_ne!(step.execution.context.id, 0);
            assert!(ids.insert(step.execution.context.id));
            assert_eq!(step.execution.outer.len(), 1);
            assert_eq!(
                step.execution.outer[0].id,
                steps[index - 1].execution.context.id
            );
            let candidate = step.execution.outer[0]
                .locals
                .iter()
                .find(|v| v.name == "candidate")
                .unwrap();
            assert_eq!(candidate.availability, "unassigned");
            let return_index = (index..steps.len())
                .find(|&i| {
                    steps[i].execution.context.id == step.execution.context.id
                        && steps[i].execution.returning
                })
                .unwrap();
            for frame in &steps[index..return_index] {
                assert_eq!(frame.execution.context.id, step.execution.context.id);
                assert_ne!(variable(frame, "return_value").availability, "available");
                assert_eq!(
                    frame.execution.outer[0]
                        .locals
                        .iter()
                        .find(|v| v.name == "candidate")
                        .unwrap()
                        .availability,
                    "unassigned"
                );
            }
            let returned = &steps[return_index];
            let value = variable(returned, "return_value")
                .text(&response.trace.values)
                .unwrap();
            outcomes.insert(value.to_string());
            assert_eq!(steps[return_index + 1].execution.context.id, 0);
            assert_eq!(
                variable(&steps[return_index + 1], "candidate").text(&response.trace.values),
                Some(value)
            );
        }
        assert!(!ids.is_empty());
    }
    assert!(outcomes.contains("None"));
    assert!(outcomes.contains("Some((2, 2))"));
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
    assert!(!segment_indices.is_empty());
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
        if step.execution.context.function != "sweep" {
            assert!(matches!(
                step.execution.module.as_str(),
                "retain-end"
                    | "retain-height"
                    | "then"
                    | "partition-point"
                    | "sort-by"
                    | "original"
            ));
            assert!(!step.execution.entry);
            continue;
        }
        assert_eq!(step.execution.context.parameters[0].name, "segments");
        assert_eq!(
            step.execution.context.parameters[0].availability,
            "shadowed"
        );
        assert_eq!(
            step.execution.context.parameters[0].text(values),
            Some("[Segment { start: (0, 0), end: (2, 0) }]")
        );
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
            assert_eq!(
                step.execution.entry,
                step.execution.boundary == Some(0) && !steps[index - 1].execution.returning
            );
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
        ["initial", "take-entry", "take-pop", "micro", "take-empty"]
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

fn control<'a>(step: &'a Step, line: usize, keyword: &str) -> Option<&'a str> {
    step.execution
        .controls
        .iter()
        .find(|control| {
            control.line == line && control.keyword == keyword && control.occurrence == 0
        })
        .map(|control| control.state.as_str())
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
async fn classify_branches_report_actual_membership_without_visiting_skipped_pushes() {
    // At the crossing both segments pass through; at endpoints they start/end.
    let response = trace_segments(&[(0, 0, 4, 4), (0, 4, 4, 0)]).await;
    let values = &response.trace.values;
    let mut observed = std::collections::HashSet::new();
    for step in response
        .trace
        .steps
        .iter()
        .filter(|step| step.execution.module == "classify")
    {
        for (line, push_line, list) in [(9, 10, "starts"), (11, 12, "ends"), (13, 14, "passes")] {
            let Some(state @ ("true" | "false")) = control(step, line, "if") else {
                continue;
            };
            observed.insert((line, state));
            if state == "false" {
                assert!(
                    step.execution
                        .calls
                        .iter()
                        .all(|call| call.line != push_line || call.function != "push")
                );
            }
            if let Some(call) = step.execution.calls.iter().find(|call| {
                call.line == push_line
                    && call.function == "push"
                    && call.result.availability == "available"
            }) {
                assert_eq!(state, "true");
                assert_eq!(call.result.text(values), Some("()"));
                let id = variable(step, "id").text(values).unwrap();
                let members: Vec<usize> =
                    serde_json::from_str(variable(step, list).text(values).unwrap()).unwrap();
                assert!(members.contains(&id.parse().unwrap()));
            }
        }
        if control(step, 2, "for") == Some("entered")
            && variable(step, "id").availability == "available"
        {
            assert_eq!(
                variable(step, "id").scope.as_deref(),
                Some("classify.active")
            );
        }
        if control(step, 8, "for") == Some("entered")
            && variable(step, "id").availability == "available"
        {
            assert_eq!(
                variable(step, "id").scope.as_deref(),
                Some("classify.incident")
            );
        }
    }
    for line in [9, 11, 13] {
        assert!(observed.contains(&(line, "true")));
        assert!(observed.contains(&(line, "false")));
    }
}

#[tokio::test]
async fn loop_reentry_clears_previous_iteration_controls_and_bindings() {
    // Three incident segments exercise nested record loops, including the empty
    // suffix on the last outer iteration. The first active loop is also empty.
    let response = trace_segments(&[(0, 0, 4, 0), (0, 0, 3, 3), (0, 0, 2, 4)]).await;
    let mut saw_empty_active = false;
    let mut saw_empty_inner = false;
    let mut saw_inner_reentry = false;
    let mut saw_outer_reentry = false;
    for (index, step) in response.trace.steps.iter().enumerate() {
        if step.execution.module == "classify"
            && control(step, 2, "for") == Some("exhausted")
            && step.active.is_empty()
            && variable(step, "id").scope.as_deref() == Some("classify.active")
        {
            saw_empty_active = true;
            assert_ne!(variable(step, "id").availability, "available");
            assert!(control(step, 4, "if").is_none());
        }
        if step.execution.module != "record" {
            continue;
        }
        if control(step, 2, "for") == Some("exhausted")
            && variable(step, "b").availability != "available"
        {
            saw_empty_inner = true;
        }
        for (line, binding, saw) in [
            (1, "a", &mut saw_outer_reentry),
            (2, "b", &mut saw_inner_reentry),
        ] {
            if control(step, line, "for") == Some("entered")
                && response
                    .trace
                    .steps
                    .get(index.wrapping_sub(1))
                    .is_some_and(|previous| {
                        previous.execution.module == "record"
                            && control(previous, line, "for") != Some("entered")
                    })
            {
                *saw = true;
                assert_eq!(variable(step, binding).availability, "available");
                assert!(
                    step.execution
                        .controls
                        .iter()
                        .all(|control| control.line <= line),
                    "new iteration must clear nested branch results: {:?}",
                    step.execution.controls
                );
            }
        }
    }
    assert!(saw_empty_active && saw_empty_inner && saw_inner_reentry && saw_outer_reentry);
}

#[tokio::test]
async fn continue_has_a_pending_stop_then_jump_without_recording_a_duplicate_result() {
    let response = trace_segments(&[(0, 0, 4, 0), (1, 0, 3, 0)]).await;
    let steps = &response.trace.steps;
    let mut skipped_pairs = 0;
    for (index, step) in steps.iter().enumerate().filter(|(_, step)| {
        step.execution.module == "record" && control(step, 7, "continue") == Some("pending")
    }) {
        skipped_pairs += 1;
        assert_eq!(control(step, 6, "if"), Some("true"));
        assert_ne!(variable(step, "geometry").availability, "available");
        let next = &steps[index + 1];
        assert_eq!(control(next, 7, "continue"), Some("jumping"));
        assert_eq!(control(next, 2, "for"), Some("pending"));
        assert_eq!(next.results, step.results);
        assert!(
            next.execution
                .calls
                .iter()
                .all(|call| call.function != "push")
        );
    }
    assert!(skipped_pairs > 0);
    assert_eq!(response.intersections.len(), 1);
}

#[tokio::test]
async fn missing_neighbors_complete_get_before_continue_and_empty_queue_completes_break() {
    let response = trace_segments(&[(0, 0, 2, 0)]).await;
    let steps = &response.trace.steps;
    let mut skipped_neighbors = 0;
    for (index, step) in steps.iter().enumerate().filter(|(_, step)| {
        step.execution.module == "neighbors" && control(step, 4, "continue") == Some("pending")
    }) {
        skipped_neighbors += 1;
        let get = step
            .execution
            .calls
            .iter()
            .find(|call| call.function == "get")
            .unwrap();
        assert_eq!(get.result.text(&response.trace.values), Some("None"));
        assert_eq!(control(step, 4, "else"), Some("entered"));
        assert_ne!(variable(step, "neighbors").availability, "available");
        assert_eq!(control(&steps[index + 1], 4, "continue"), Some("jumping"));
        assert_eq!(control(&steps[index + 1], 3, "for"), Some("pending"));
    }
    assert!(skipped_neighbors > 0);
    let empty = trace_json("[]").await;
    let steps = &empty.trace.steps;
    let pending = steps
        .iter()
        .position(|step| control(step, 2, "break") == Some("pending"))
        .unwrap();
    assert_eq!(control(&steps[pending], 2, "else"), Some("entered"));
    assert_eq!(
        variable(&steps[pending], "next").text(&empty.trace.values),
        Some("None")
    );
    assert_eq!(control(&steps[pending + 1], 2, "break"), Some("completed"));
    assert_eq!(pending + 2, steps.len());
}

#[tokio::test]
async fn geometry_early_return_is_separate_and_does_not_expose_result_before_execution() {
    let cases = [
        vec![(0, 0, 4, 0), (1, 1, 3, 1)], // parallel
        vec![(0, 0, 2, 0), (1, 2, 3, 1)], // line intersection beyond both segments
        vec![(0, 0, 4, 4), (0, 4, 4, 0)], // real candidate
    ];
    for (case, segments) in cases.iter().enumerate() {
        let response = trace_segments(segments).await;
        let steps = &response.trace.steps;
        let return_line = if case < 2 { 4 } else { 8 };
        let mut returns = 0;
        for (index, step) in steps.iter().enumerate().filter(|(_, step)| {
            step.execution.module == "geometry"
                && control(step, return_line, "return") == Some("pending")
        }) {
            returns += 1;
            assert_ne!(variable(step, "return_value").availability, "available");
            let returned = &steps[index + 1];
            assert_eq!(returned.execution.module, "geometry");
            assert_eq!(control(returned, return_line, "return"), Some("returned"));
            let value = variable(returned, "return_value")
                .text(&response.trace.values)
                .unwrap();
            if case < 2 {
                assert_eq!(value, "None");
                assert_eq!(control(step, 4, "else"), Some("entered"));
                assert!(control(step, 5, "if").is_none());
            } else {
                assert!(value.starts_with("Some("));
                assert_eq!(control(step, 4, "else"), Some("skipped"));
            }
        }
        assert!(
            returns > 0,
            "fixture {case} must reach its intended return path"
        );
    }
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
    outer: Vec<Context>,
    returning: bool,
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
