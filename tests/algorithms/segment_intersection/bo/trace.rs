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
async fn dynamic_members_expose_one_group_and_real_detach_before_reinsert() {
    let response = trace_segments(&[(0, 0, 6, 0), (1, 0, 5, 0), (3, 0, 3, 0)]).await;
    let event: Vec<_> = response
        .trace
        .steps
        .iter()
        .filter(|step| {
            step.current
                .as_ref()
                .is_some_and(|point| point.x.numerator == "3")
        })
        .collect();
    let located = event
        .iter()
        .find(|step| step.action == "locate")
        .expect("group location is observable");
    assert_eq!(located.active, [0, 1]);
    let detached = event.iter().find(|step| step.action == "detach").unwrap();
    assert!(detached.active.is_empty());
    let reordered = event.iter().find(|step| step.action == "reorder").unwrap();
    assert_eq!(reordered.active, [0, 1]);
    assert_eq!(response.intersections.len(), 3);
    assert_eq!(
        variable(reordered, "active_groups").text(&response.trace.values),
        Some("[0]")
    );
}

#[tokio::test]
async fn real_stage_calls_preserve_identity_return_and_resumption() {
    let response = trace_segments(&[(0, 0, 4, 4), (0, 4, 4, 0)]).await;
    let steps = &response.trace.steps;
    let values = &response.trace.values;
    let mut entered = std::collections::HashSet::new();
    let mut returned = std::collections::HashSet::new();
    let mut functions = std::collections::HashSet::new();
    for (index, step) in steps
        .iter()
        .enumerate()
        .filter(|(_, s)| s.execution.context.id != 0)
    {
        let execution = &step.execution;
        if execution.entry {
            assert!(entered.insert(execution.context.id));
            functions.insert(execution.context.function.as_str());
            assert!(!execution.outer.is_empty());
            assert_eq!(variable(step, "return_value").availability, "unassigned");
            if execution.context.function == "original" {
                assert_eq!(execution.context.captures.len(), 1);
                let capture = &execution.context.captures[0];
                assert_eq!(capture.name, "shear");
                assert_eq!(capture.text(values), Some("0"));
                assert_eq!(execution.context.parameters[0].name, "p");
                assert_eq!(execution.context.parameters[0].text(values), Some("(2, 2)"));
            } else {
                assert!(execution.context.captures.is_empty());
            }
        }
        if execution.returning {
            assert!(returned.insert(execution.context.id));
            assert!(entered.contains(&execution.context.id));
            let before = &steps[index - 1];
            assert_eq!(before.execution.context.id, execution.context.id);
            assert!(!before.execution.returning);
            assert_eq!(variable(before, "return_value").availability, "unassigned");
            assert_eq!(variable(step, "return_value").availability, "available");
            assert_eq!(
                variable(before, "return_value").r#type,
                variable(step, "return_value").r#type
            );
            assert!(
                execution
                    .controls
                    .iter()
                    .all(|c| c.keyword != "return" || c.state != "pending")
            );
            let resumed = &steps[index + 1];
            assert!(resumed.execution.resuming);
            assert_eq!(
                resumed.execution.context.id,
                execution.outer.last().unwrap().id
            );
            let call = resumed.execution.calls.last().unwrap();
            assert_eq!(call.function, execution.context.function);
            assert_eq!(
                call.result.text(values),
                variable(step, "return_value").text(values)
            );
            assert_eq!(resumed.results, step.results);
            assert_eq!(resumed.pending, step.pending);
            assert_eq!(resumed.active, step.active);
        }
    }
    assert_eq!(entered, returned);
    assert_eq!(
        functions,
        std::collections::HashSet::from([
            "locate", "record", "update", "check", "schedule", "append", "original"
        ])
    );
}
#[tokio::test]
async fn empty_and_singleton_paths_do_not_invent_pair_calls() {
    for input in [vec![], vec![(0, 0, 2, 0)], vec![(1, 1, 1, 1)]] {
        let response = trace_segments(&input).await;
        assert!(response.intersections.is_empty());
        assert!(
            response
                .trace
                .steps
                .iter()
                .all(|s| !matches!(s.execution.context.function.as_str(), "schedule" | "append"))
        );
        assert!(
            response
                .trace
                .steps
                .iter()
                .all(|s| s.execution.context.captures.is_empty())
        );
    }
}
#[tokio::test]
async fn output_mutation_has_pending_push_then_completed_push() {
    let response = trace_segments(&[(0, 0, 4, 0), (1, 0, 3, 0)]).await;
    let values = &response.trace.values;
    let mut pending = false;
    let mut completed = false;
    for step in &response.trace.steps {
        for call in step
            .execution
            .calls
            .iter()
            .filter(|call| call.function == "push")
        {
            assert_eq!(call.line, 2);
            let argument = call.arguments.iter().find(|v| v.name == "value").unwrap();
            assert_eq!(argument.r#type, "Intersection");
            assert_eq!(argument.text(values), Some("S0 × S1: (1, 0) → (3, 0)"));
            if call.result.availability == "unassigned" {
                pending = true;
                assert!(step.results.is_empty());
            } else {
                completed = true;
                assert_eq!(call.result.text(values), Some("()"));
                assert_eq!(step.results, [0]);
            }
        }
    }
    assert!(pending && completed);
}
#[tokio::test]
async fn nested_output_keeps_suspended_caller_and_refreshes_mutated_state_on_resume() {
    let response = trace_segments(&[(0, 0, 4, 0), (1, 0, 3, 0)]).await;
    let values = &response.trace.values;
    let entry = response
        .trace
        .steps
        .iter()
        .find(|s| s.execution.context.function == "append" && s.execution.entry)
        .unwrap();
    assert_eq!(
        entry
            .execution
            .outer
            .iter()
            .map(|c| c.function.as_str())
            .collect::<Vec<_>>(),
        ["sweep", "record"]
    );
    let caller = entry.execution.outer.last().unwrap();
    assert_eq!(
        caller
            .locals
            .iter()
            .find(|v| v.name == "id")
            .unwrap()
            .text(values),
        Some("1")
    );
    assert_eq!(
        caller
            .locals
            .iter()
            .find(|v| v.name == "result")
            .unwrap()
            .availability,
        "unavailable"
    );
    let resumed = response
        .trace
        .steps
        .iter()
        .find(|s| {
            s.execution.context.function == "record"
                && s.execution.resuming
                && !s.results.is_empty()
        })
        .unwrap();
    assert_eq!(
        variable(resumed, "result").text(values),
        Some("[S0 × S1: (1, 0) → (3, 0)]")
    );
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
        Some("Some(((0, 0), Event { starts: [0], ends: [], points: [] }))")
    );
    assert_eq!(variable(pop, "point").availability, "unassigned");
    assert_eq!(variable(bound, "point").text(values), Some("(0, 0)"));
    assert_eq!(
        variable(bound, "event").text(values),
        Some("Event { starts: [0], ends: [], points: [] }")
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
                "locate" | "members" | "activity" | "neighbors" | "schedule" | "output"
            ));
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
            assert!(matches!(step.execution.module.as_str(), "take" | "sweep"));
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
        Some("{(1/8192, 1): Event { starts: [], ends: [0], points: [] }}")
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
async fn closed_event_membership_includes_starts_ends_passes_and_points() {
    let response = trace_segments(&[(0, 0, 2, 0), (2, 0, 4, 0), (0, -2, 4, 2), (2, 0, 2, 0)]).await;
    let event: Vec<_> = response
        .trace
        .steps
        .iter()
        .filter(|s| {
            s.current
                .as_ref()
                .is_some_and(|p| p.x.numerator == "2" && p.y.numerator == "0")
                && !matches!(s.action.as_str(), "take-entry" | "take-pop" | "take-empty")
        })
        .collect();
    let complete = event.iter().find(|s| s.action == "complete").unwrap();
    assert_eq!(complete.starts, [1, 3]);
    assert_eq!(complete.ends, [0, 3]);
    assert_eq!(complete.passes, [2]);
    assert_eq!(complete.results.len(), 6);
    let leave = event.iter().find(|s| s.action == "leave").unwrap();
    assert_eq!(
        leave.results.len(),
        6,
        "closed pairs precede member removal"
    );
    assert!(complete.active.contains(&1) && complete.active.contains(&2));
    assert!(!complete.active.contains(&0) && !complete.active.contains(&3));
}
#[tokio::test]
async fn new_iterations_clear_controls_and_exited_locals_keep_unavailable_names() {
    let response = trace_segments(&[(0, 0, 4, 0), (0, 0, 3, 0), (0, 0, 2, 4)]).await;
    let mut joined = 0;
    let mut exhausted = 0;
    for step in &response.trace.steps {
        if step.action == "join" {
            joined += 1;
            assert_eq!(variable(step, "id").availability, "available");
            assert_eq!(
                variable(step, "id").scope.as_deref(),
                Some("members.starts")
            );
            assert!(
                step.execution
                    .controls
                    .iter()
                    .all(|c| matches!(c.line, 1 | 6))
            );
            assert_eq!(control(step, 6, "for"), Some("exhausted"));
        }
        if step.execution.context.function == "record"
            && control(step, 1, "for") == Some("exhausted")
        {
            exhausted += 1;
            assert_eq!(variable(step, "id").availability, "unavailable");
            assert!(variable(step, "id").value.is_none());
        }
    }
    assert_eq!(joined, 3);
    assert!(exhausted > 0);
}
#[tokio::test]
async fn old_overlap_pairs_are_not_revisited_at_point_events() {
    let response = trace_segments(&[(0, 0, 6, 0), (1, 0, 5, 0), (2, 0, 2, 0), (3, 0, 3, 0)]).await;
    let values = &response.trace.values;
    let pairs: Vec<_> = response
        .trace
        .steps
        .iter()
        .filter(|s| s.execution.context.function == "append" && s.execution.entry)
        .map(|s| {
            s.execution
                .context
                .parameters
                .iter()
                .find(|v| v.name == "pair")
                .unwrap()
                .text(values)
                .unwrap()
        })
        .collect();
    assert_eq!(pairs.len(), 5);
    assert_eq!(pairs.iter().filter(|&&pair| pair == "[1, 0]").count(), 1);
    assert_eq!(
        pairs
            .iter()
            .copied()
            .collect::<std::collections::HashSet<_>>()
            .len(),
        5
    );
}
#[tokio::test]
async fn empty_neighbor_range_has_no_schedule_call_and_queue_exit_completes_break() {
    let response = trace_segments(&[(0, 0, 2, 0)]).await;
    assert!(
        response
            .trace
            .steps
            .iter()
            .all(|s| s.execution.context.function != "schedule")
    );
    assert!(
        response
            .trace
            .steps
            .iter()
            .any(|s| s.execution.context.function == "check"
                && control(s, 1, "for") == Some("exhausted"))
    );
    let last = response.trace.steps.last().unwrap();
    assert_eq!(last.action, "take-empty");
    assert_eq!(control(last, 2, "break"), Some("completed"));
}
#[tokio::test]
async fn parallel_or_uncovered_neighbors_do_not_schedule_a_position() {
    for (input, parallel) in [
        (vec![(0, 0, 2, 0), (0, 1, 2, 1)], true),
        (vec![(0, 0, 1, 0), (0, 3, 1, 2)], false),
    ] {
        let response = trace_segments(&input).await;
        let steps = &response.trace.steps;
        let mut seen = false;
        for (i, step) in steps
            .iter()
            .enumerate()
            .filter(|(_, s)| s.execution.context.function == "schedule" && s.execution.returning)
        {
            seen = true;
            let before = &steps[i - 1];
            assert_eq!(variable(before, "return_value").availability, "unassigned");
            assert_eq!(variable(step, "return_value").availability, "available");
            assert!(steps[i + 1].execution.resuming);
            if parallel {
                assert_eq!(control(before, 1, "if"), Some("true"));
                assert_eq!(variable(before, "candidate").availability, "unassigned");
            } else {
                assert_eq!(variable(before, "candidate").availability, "available");
            }
        }
        assert!(seen);
        assert!(response.intersections.is_empty());
        assert!(steps.iter().all(|s| s.action != "discover"));
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
    resuming: bool,
    calls: Vec<ExecutionCall>,
    controls: Vec<Control>,
    blocks: Vec<Block>,
}

#[derive(Deserialize)]
struct Block {
    line: usize,
    phase: String,
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
    let response = trace_segments(&[
        (-1, -3, 3, 1),
        (-1, -1, 3, -5),
        (-1, 1, 3, 5),
        (-1, 3, 3, -1),
    ])
    .await;
    for (x, y, before, after, participants) in [
        ("0", "-2", vec![0, 1, 2, 3], vec![1, 0, 2, 3], vec![0, 1]),
        ("0", "2", vec![1, 0, 2, 3], vec![1, 0, 3, 2], vec![2, 3]),
        ("2", "0", vec![1, 0, 3, 2], vec![1, 3, 0, 2], vec![0, 3]),
    ] {
        let event: Vec<_> = response
            .trace
            .steps
            .iter()
            .filter(|s| {
                s.current.as_ref().is_some_and(|p| {
                    p.x.numerator == x
                        && p.y.numerator == y
                        && p.x.denominator == "1"
                        && p.y.denominator == "1"
                }) && !matches!(s.action.as_str(), "take-entry" | "take-pop" | "take-empty")
            })
            .collect();
        let take = event.iter().find(|s| s.action == "take").unwrap();
        let located = event.iter().find(|s| s.action == "locate").unwrap();
        assert_eq!(take.active, before);
        assert_eq!(located.active, before);
        let output = event.iter().find(|s| s.action == "record").unwrap();
        let unaffected: Vec<_> = before
            .into_iter()
            .filter(|id| !participants.contains(id))
            .collect();
        assert_eq!(
            output.active, unaffected,
            "only the current block is detached"
        );
        let reordered = event.iter().find(|s| s.action == "reorder").unwrap();
        assert_eq!(reordered.active, after);
        let complete = event.iter().find(|s| s.action == "complete").unwrap();
        assert_eq!(complete.active, after);
        assert!(event.iter().any(|s| s.action == "check"));
        if x == "0" && y == "2" {
            assert!(event.iter().any(|s| s.action == "discover"));
        }
        for step in event {
            assert!(step.starts.is_empty() && step.ends.is_empty());
            let mut passes = step.passes.clone();
            passes.sort_unstable();
            assert_eq!(passes, participants);
        }
    }
}

#[tokio::test]
async fn conditional_shear_does_not_treat_points_or_equal_x_events_as_vertical_segments() {
    for input in [
        vec![(1, 2, 1, 2)],
        vec![
            (-1, -3, 3, 1),
            (-1, -1, 3, -5),
            (-1, 1, 3, 5),
            (-1, 3, 3, -1),
        ],
    ] {
        let response = trace_segments(&input).await;
        for step in response.trace.steps.iter().filter(|s| s.action == "take") {
            assert_eq!(
                variable(step, "shear").text(&response.trace.values),
                Some("0")
            );
        }
    }
}

#[tokio::test]
async fn live_locals_survive_observation_and_entered_branches_close_before_point_pair_output() {
    let response = trace_segments(&[(0, 0, 4, 0), (0, 2, 4, -2), (2, 0, 2, 0), (2, 0, 2, 0)]).await;
    let steps = &response.trace.steps;
    for step in steps.iter().filter(|s| s.action == "detach") {
        for name in ["block", "incident_groups", "outside"] {
            assert_eq!(
                variable(step, name).availability,
                "available",
                "{name} remains live during detach"
            );
        }
    }
    let output = steps.iter().find(|s| s.action == "record").unwrap();
    assert_eq!(
        output.execution.outer[0]
            .locals
            .iter()
            .find(|v| v.name == "event")
            .unwrap()
            .availability,
        "available"
    );
    let branch_before = steps
        .iter()
        .position(|s| {
            s.execution.context.function == "record"
                && s.execution
                    .blocks
                    .iter()
                    .any(|b| b.line == 4 && b.phase == "before")
        })
        .unwrap();
    let branch_after = steps
        .iter()
        .position(|s| {
            s.execution.context.function == "record"
                && s.execution
                    .blocks
                    .iter()
                    .any(|b| b.line == 4 && b.phase == "after")
        })
        .unwrap();
    assert!(branch_after > branch_before);
    for name in ["a", "b", "id", "other"] {
        assert_eq!(
            variable(&steps[branch_before], name).availability,
            "unavailable"
        );
    }
    let point_pair =
        steps
            .iter()
            .position(|s| {
                s.execution.context.function == "append"
                    && s.execution.entry
                    && s.execution.context.parameters.iter().any(|v| {
                        v.name == "pair" && v.text(&response.trace.values) == Some("[2, 3]")
                    })
            })
            .unwrap();
    assert!(branch_after < point_pair);
}

#[tokio::test]
async fn output_entry_keeps_actual_scan_argument_before_coordinate_restoration() {
    let response = trace_segments(&[(0, 0, 0, 1), (-1, 1, 1, 1)]).await;
    let values = &response.trace.values;
    let entry = response
        .trace
        .steps
        .iter()
        .find(|s| s.execution.context.function == "append" && s.execution.entry)
        .unwrap();
    let scan = entry
        .execution
        .context
        .parameters
        .iter()
        .find(|v| v.name == "scan_geometry")
        .unwrap();
    assert_eq!(scan.text(values), Some("(1/8192, 1)"));
    assert_eq!(variable(entry, "geometry").availability, "unassigned");
    let converted = response
        .trace
        .steps
        .iter()
        .find(|s| {
            s.execution.context.id == entry.execution.context.id && s.execution.boundary == Some(1)
        })
        .unwrap();
    assert_eq!(variable(converted, "geometry").text(values), Some("(0, 1)"));
    assert_eq!(
        converted
            .execution
            .context
            .parameters
            .iter()
            .find(|v| v.name == "scan_geometry")
            .unwrap()
            .availability,
        "unavailable"
    );
    assert!(converted.results.is_empty());
    assert_eq!(response.intersections.len(), 1);
}
