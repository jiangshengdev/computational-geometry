//! Records exact input-pair intersections at the current event.
use super::*;

pub(super) fn record(
    state: &mut SweepState,
    point: &Point,
    classified: &classify::ClassifiedEvent,
    recording: &mut Recorder<'_, '_>,
) -> Option<()> {
    let SweepState {
        segments,
        shear,
        queue,
        active,
        height_order,
        result,
    } = state;
    let shear = &*shear;
    let incident = &classified.incident;
    let participants = &classified.participants;
    let next_call = recording.next_call;
    let capture = recording.capture;
    macro_rules! record {
        ($boundary:expr, $indices:expr, $interval:expr, $geometry:expr) => {
            observe!(recording, ObservationState { queue, active, result, height_order, shear }, point,
                "record",
                $boundary,
                &{
                    let indices: Option<(usize, usize, Option<usize>)> = $indices;
                    indices
                        .and_then(|(_, a, b)| b.map(|b| vec![a, b]))
                        .unwrap_or_default()
                },
                {
                    let indices: Option<(usize, usize, Option<usize>)> = $indices;
                    let (start, end): (Option<&Point>, Option<&Point>) = $interval;
                    let geometry: Option<&Geometry> = $geometry;
                    let mut locals = vec![
                        Variable::absent("event", "Event", "unavailable"),
                        Variable::available("incident", "Vec<usize>", format!("{incident:?}")),
                        Variable::available(
                            "participants",
                            "Option<(Vec<usize>, Vec<usize>, Vec<usize>)>",
                            format!("{participants:?}"),
                        ),
                    ];
                    for (name, value) in [
                        ("i", indices.map(|indices| indices.0)),
                        ("a", indices.map(|indices| indices.1)),
                        ("b", indices.and_then(|indices| indices.2)),
                    ] {
                        locals.push(value.map_or_else(
                            || {
                                Variable::absent(
                                    name,
                                    "usize",
                                    if $boundary == 0 || ($boundary == 1 && name == "b") {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |value| Variable::available(name, "usize", value.to_string()),
                        ));
                    }
                    let in_pair = indices.is_some_and(|indices| indices.2.is_some());
                    locals.push(if in_pair && matches!($boundary, 3..=14 | 19..=22) {
                        Variable::available(
                            "original",
                            "closure",
                            "|p| Point { x: p.x - shear * p.y, y: p.y }".to_owned(),
                        )
                    } else {
                        Variable::absent(
                            "original",
                            "closure",
                            if in_pair { "unassigned" } else { "unavailable" },
                        )
                    });
                    for (name, value) in [("start", start), ("end", end)] {
                        locals.push(value.map_or_else(
                            || {
                                Variable::absent(
                                    name,
                                    "&Point",
                                    if in_pair && matches!($boundary, 2..=10) {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |value| Variable::available(name, "&Point", point_value(value)),
                        ));
                    }
                    locals.push(geometry.map_or_else(
                        || {
                            Variable::absent(
                                "geometry",
                                "Geometry",
                                if matches!($boundary, 0..=12 | 19..=22) {
                                    "unassigned"
                                } else {
                                    "unavailable"
                                },
                            )
                        },
                        |geometry| {
                            Variable::available(
                                "geometry",
                                "Geometry",
                                geometry_value(geometry),
                            )
                        },
                    ));
                    for variable in &mut locals {
                        variable.scope = match variable.name {
                            "i" | "a" => Some("record.incident"),
                            "b" | "original" | "geometry" => Some("record.pair"),
                            "start" | "end" => Some("record.overlap"),
                            _ => variable.scope,
                        };
                    }
                    locals
                }
            );
            if $boundary == 14
                && let Some(steps) = &mut recording.steps
            {
                steps
                    .last_mut()
                    .expect("record observation was captured")
                    .action = "record";
            }
        };
    }
    record!(0, None, (None, None), None);
    for (i, &a) in incident.iter().enumerate() {
        record!(1, Some((i, a, None)), (None, None), None);
        reset_controls!(recording, 1);
        control!(recording, 1, "for", "entered");
        for &b in &incident[i + 1..] {
            record!(2, Some((i, a, Some(b))), (None, None), None);
            reset_controls!(recording, 2);
            control!(recording, 2, "for", "entered");
            let mut original_calls = recording.steps.as_ref().map(|_| Vec::new());
            let mut original_line = 12;
            let mut original = |p: &Point, steps: &mut Option<&mut Vec<SweepStep>>| {
                nop!();
                let trace = steps.as_mut().map(|steps| {
                    ClosureTrace::enter(
                        steps,
                        next_call,
                        "original",
                        "original closure",
                        vec![Variable::available("p", "&Point", point_value(p))],
                        &["shear"],
                        "Point",
                    )
                });
                let transformed = Point {
                    x: &p.x - shear * &p.y,
                    y: p.y.clone(),
                };
                if let Some(calls) = &mut original_calls {
                    calls.push((point_value(p), point_value(&transformed)));
                }
                if let Some(trace) = trace {
                    trace.returned(
                        steps.as_mut().expect("tracing is enabled"),
                        point_value(&transformed),
                    );
                }
                transformed
            };
            record!(3, Some((i, a, Some(b))), (None, None), None);
            let geometry = if segments[a].slope == segments[b].slope {
                record!(4, Some((i, a, Some(b))), (None, None), None);
                control!(recording, 4, "if", "true");
                control!(recording, 12, "else", "skipped");
                pending_call!(
                    recording,
                    5,
                    "max",
                    0,
                    vec![
                        Variable::available("self", "&Point", point_value(&segments[a].left)),
                        Variable::available("other", "&Point", point_value(&segments[b].left))
                    ],
                    "&Point"
                );
                // Incident segments with equal slopes lie on the same line.
                // Emit exactly at the later start, using both original ends
                // rather than the next event (which may involve a third input).
                let start = (&segments[a].left).max(&segments[b].left);
                record!(5, Some((i, a, Some(b))), (Some(start), None), None);
                call!(
                    recording,
                    5,
                    "max",
                    vec![
                        Variable::available("self", "&Point", point_value(&segments[a].left)),
                        Variable::available("other", "&Point", point_value(&segments[b].left))
                    ],
                    Variable::available("return_value", "&Point", point_value(start))
                );
                if start != point {
                    record!(6, Some((i, a, Some(b))), (Some(start), None), None);
                    control!(recording, 6, "if", "true");
                    control!(recording, 7, "continue", "pending");
                    record!(17, Some((i, a, None)), (None, None), None);
                    reset_controls!(recording, 2);
                    control!(recording, 2, "for", "pending");
                    control!(recording, 7, "continue", "jumping");
                    continue;
                }
                record!(7, Some((i, a, Some(b))), (Some(start), None), None);
                control!(recording, 6, "if", "false");
                control!(recording, 7, "continue", "skipped");
                pending_call!(
                    recording,
                    8,
                    "min",
                    0,
                    vec![
                        Variable::available("self", "&Point", point_value(&segments[a].right)),
                        Variable::available("other", "&Point", point_value(&segments[b].right))
                    ],
                    "&Point"
                );
                let end = (&segments[a].right).min(&segments[b].right);
                record!(8, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                call!(
                    recording,
                    8,
                    "min",
                    vec![
                        Variable::available("self", "&Point", point_value(&segments[a].right)),
                        Variable::available("other", "&Point", point_value(&segments[b].right))
                    ],
                    Variable::available("return_value", "&Point", point_value(end))
                );
                let branch_geometry = if start < end {
                    record!(9, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                    control!(recording, 9, "if", "true");
                    control!(recording, 11, "else", "skipped");
                    pending_call!(
                        recording,
                        10,
                        "original",
                        0,
                        vec![Variable::available("p", "&Point", point_value(start))],
                        "Point"
                    );
                    pending_call!(
                        recording,
                        10,
                        "original",
                        1,
                        vec![Variable::available("p", "&Point", point_value(end))],
                        "Point"
                    );
                    original_line = 10;
                    let value = Geometry::Overlap {
                        start: original(start, &mut recording.steps),
                        end: original(end, &mut recording.steps),
                    };
                    record!(19, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                    if let Some(steps) = &mut recording.steps {
                        steps
                            .last_mut()
                            .expect("branch completion exists")
                            .execution
                            .blocks
                            .push(ExecutionBlock {
                                line: 9,
                                phase: "before",
                            });
                    }
                    value
                } else {
                    record!(10, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                    control!(recording, 9, "if", "false");
                    control!(recording, 11, "else", "entered");
                    pending_call!(
                        recording,
                        11,
                        "original",
                        0,
                        vec![Variable::available("p", "&Point", point_value(start))],
                        "Point"
                    );
                    original_line = 11;
                    let value = Geometry::Point(original(start, &mut recording.steps));
                    record!(20, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                    if let Some(steps) = &mut recording.steps {
                        steps
                            .last_mut()
                            .expect("branch completion exists")
                            .execution
                            .blocks
                            .push(ExecutionBlock {
                                line: 11,
                                phase: "before",
                            });
                    }
                    value
                };
                record!(21, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                if let Some(steps) = &mut recording.steps {
                    steps
                        .last_mut()
                        .expect("branch completion exists")
                        .execution
                        .blocks
                        .push(ExecutionBlock {
                            line: 4,
                            phase: "before",
                        });
                    SweepStep::block_after(steps, if start < end { 9 } else { 11 });
                }
                branch_geometry
            } else {
                record!(11, Some((i, a, Some(b))), (None, None), None);
                control!(recording, 4, "if", "false");
                control!(recording, 12, "else", "entered");
                pending_call!(
                    recording,
                    12,
                    "original",
                    0,
                    vec![Variable::available("p", "&Point", point_value(point))],
                    "Point"
                );
                let value = Geometry::Point(original(point, &mut recording.steps));
                record!(22, Some((i, a, Some(b))), (None, None), None);
                if let Some(steps) = &mut recording.steps {
                    steps
                        .last_mut()
                        .expect("branch completion exists")
                        .execution
                        .blocks
                        .push(ExecutionBlock {
                            line: 12,
                            phase: "before",
                        });
                }
                value
            };
            record!(13, Some((i, a, Some(b))), (None, None), Some(&geometry));
            if let Some(steps) = &mut recording.steps {
                steps
                    .last_mut()
                    .expect("geometry observation exists")
                    .execution
                    .calls
                    .extend(
                        original_calls
                            .expect("tracing records original calls")
                            .into_iter()
                            .enumerate()
                            .map(|(occurrence, (argument, returned))| ExecutionCall {
                                line: original_line,
                                function: "original",
                                occurrence,
                                arguments: vec![Variable::available("p", "&Point", argument)],
                                result: Variable::available("return_value", "Point", returned),
                            }),
                    );
            }
            pending_call!(
                recording,
                14,
                "min",
                0,
                vec![
                    Variable::available("self", "usize", a.to_string()),
                    Variable::available("other", "usize", b.to_string())
                ],
                "usize"
            );
            pending_call!(
                recording,
                14,
                "max",
                0,
                vec![
                    Variable::available("self", "usize", a.to_string()),
                    Variable::available("other", "usize", b.to_string())
                ],
                "usize"
            );
            pending_call!(
                recording,
                14,
                "push",
                0,
                vec![
                    Variable::available(
                        "self",
                        "&mut Vec<Intersection>",
                        capture.borrow_mut().result_value(result)
                    ),
                    Variable::absent("value", "Intersection", "unassigned")
                ],
                "()"
            );
            if let Some(steps) = &mut recording.steps {
                SweepStep::block_after(
                    steps,
                    if segments[a].slope == segments[b].slope {
                        4
                    } else {
                        12
                    },
                );
            }
            let lower_id = a.min(b);
            let upper_id = a.max(b);
            let intersection = Intersection {
                segments: [lower_id, upper_id],
                geometry,
            };
            let push_arguments = recording.steps.as_ref().map(|_| {
                vec![
                    Variable::available(
                        "self",
                        "&mut Vec<Intersection>",
                        capture.borrow_mut().result_value(result),
                    ),
                    Variable::available("value", "Intersection", intersection_value(&intersection)),
                ]
            });
            result.push(intersection);
            record!(14, Some((i, a, Some(b))), (None, None), None);
            call!(
                recording,
                14,
                "min",
                vec![
                    Variable::available("self", "usize", a.to_string()),
                    Variable::available("other", "usize", b.to_string())
                ],
                Variable::available("return_value", "usize", lower_id.to_string())
            );
            call!(
                recording,
                14,
                "max",
                vec![
                    Variable::available("self", "usize", a.to_string()),
                    Variable::available("other", "usize", b.to_string())
                ],
                Variable::available("return_value", "usize", upper_id.to_string())
            );
            call!(
                recording,
                14,
                "push",
                push_arguments.expect("trace captures arguments"),
                Variable::available("return_value", "()", "()".to_owned())
            );
            record!(17, Some((i, a, None)), (None, None), None);
            reset_controls!(recording, 2);
            control!(recording, 2, "for", "pending");
        }
        record!(15, Some((i, a, None)), (None, None), None);
        control!(recording, 2, "for", "exhausted");
        record!(18, None, (None, None), None);
        reset_controls!(recording, 1);
        control!(recording, 1, "for", "pending");
    }
    record!(16, None, (None, None), None);
    control!(recording, 1, "for", "exhausted");
    Some(())
}
