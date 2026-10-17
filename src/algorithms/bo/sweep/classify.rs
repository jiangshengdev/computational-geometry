//! Classifies the actual event participants and refreshes event-height comparisons.
use super::*;

pub(super) struct ClassifiedEvent {
    pub(super) incident: Vec<usize>,
    pub(super) participants: Option<(Vec<usize>, Vec<usize>, Vec<usize>)>,
}

pub(super) fn classify(
    state: &mut SweepState,
    point: &Point,
    event: Event,
    recording: &mut Recorder<'_, '_>,
) -> Option<ClassifiedEvent> {
    let SweepState {
        segments,
        shear,
        queue,
        active,
        height_order,
        result,
    } = state;
    let shear = &*shear;
    observe!(
        recording,
        ObservationState {
            queue,
            active,
            result,
            height_order,
            shear
        },
        point,
        "classify",
        0,
        &[],
        vec![
            Variable::available("event", "Event", event_value(&event)),
            Variable::absent("incident", "Vec<usize>", "unassigned"),
            Variable::absent("id", "usize", "unassigned"),
            Variable::absent("starts", "Vec<usize>", "unassigned"),
            Variable::absent("ends", "Vec<usize>", "unassigned"),
            Variable::absent("passes", "Vec<usize>", "unassigned"),
        ]
    );
    let mut incident = event.starts;
    macro_rules! classify {
        ($boundary:expr, $id:expr, $members:expr) => {
            observe!(
                recording,
                ObservationState {
                    queue,
                    active,
                    result,
                    height_order,
                    shear
                },
                point,
                "classify",
                $boundary,
                &[],
                {
                    let id: Option<usize> = $id;
                    let members: Option<(&Vec<usize>, &Vec<usize>, &Vec<usize>)> = $members;
                    let mut locals = vec![
                        Variable::absent("event", "Event", "unavailable"),
                        Variable::available("incident", "Vec<usize>", format!("{incident:?}")),
                        id.map_or_else(
                            || {
                                Variable::absent(
                                    "id",
                                    "usize",
                                    if $boundary == 1 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |id| Variable::available("id", "usize", id.to_string()),
                        ),
                    ];
                    for (name, value) in [
                        ("starts", members.map(|members| members.0)),
                        ("ends", members.map(|members| members.1)),
                        ("passes", members.map(|members| members.2)),
                    ] {
                        locals.push(value.map_or_else(
                            || Variable::absent(name, "Vec<usize>", "unassigned"),
                            |value| Variable::available(name, "Vec<usize>", format!("{value:?}")),
                        ));
                    }
                    if let Some(id) = locals.iter_mut().find(|variable| variable.name == "id") {
                        id.scope = Some(if members.is_some() {
                            "classify.incident"
                        } else {
                            "classify.active"
                        });
                    }
                    locals
                }
            );
        };
    }
    classify!(1, None, None);
    // Every active segment spans the current x. Recover the whole equal-y
    // block, including unscheduled participants in a multiway crossing.
    // Refresh every active entry for this event before consulting it. Only
    // its ordering against the event height is needed by the later removal
    // and insertion searches; newly starting segments are not read here.
    for &id in active.iter() {
        classify!(2, Some(id), None);
        reset_controls!(recording, 2);
        control!(recording, 2, "for", "entered");
        pending_call!(
            recording,
            3,
            "y_at",
            0,
            vec![
                Variable::available("self", "&SweepSegment", sweep_segment_value(&segments[id])),
                Variable::available("x", "&Rational", point.x.to_string())
            ],
            "Rational"
        );
        pending_call!(
            recording,
            3,
            "cmp",
            0,
            vec![
                Variable::absent("self", "&Rational", "unassigned"),
                Variable::available("other", "&Rational", point.y.to_string())
            ],
            "Ordering"
        );
        let height = segments[id].y_at(&point.x);
        height_order[id] = height.cmp(&point.y);
        classify!(3, Some(id), None);
        call!(
            recording,
            3,
            "y_at",
            vec![
                Variable::available("self", "&SweepSegment", sweep_segment_value(&segments[id])),
                Variable::available("x", "&Rational", point.x.to_string())
            ],
            Variable::available("return_value", "Rational", height.to_string())
        );
        call!(
            recording,
            3,
            "cmp",
            vec![
                Variable::available("self", "&Rational", height.to_string()),
                Variable::available("other", "&Rational", point.y.to_string())
            ],
            Variable::available(
                "return_value",
                "Ordering",
                format!("{:?}", height_order[id])
            )
        );
        pending_call!(
            recording,
            4,
            "is_eq",
            0,
            vec![Variable::available(
                "self",
                "Ordering",
                format!("{:?}", height_order[id])
            )],
            "bool"
        );
        let equal = height_order[id].is_eq();
        if equal {
            classify!(4, Some(id), None);
            control!(recording, 4, "if", "true");
            call!(
                recording,
                4,
                "is_eq",
                vec![Variable::available(
                    "self",
                    "Ordering",
                    format!("{:?}", height_order[id])
                )],
                Variable::available("return_value", "bool", equal.to_string())
            );
            pending_call!(
                recording,
                5,
                "push",
                0,
                vec![
                    Variable::available("self", "&mut Vec<usize>", format!("{incident:?}")),
                    Variable::available("value", "usize", id.to_string())
                ],
                "()"
            );
            let before = recording.steps.as_ref().map(|_| format!("{incident:?}"));
            incident.push(id);
            classify!(5, Some(id), None);
            call!(
                recording,
                5,
                "push",
                vec![
                    Variable::available(
                        "self",
                        "&mut Vec<usize>",
                        before.expect("trace captures arguments")
                    ),
                    Variable::available("value", "usize", id.to_string())
                ],
                Variable::available("return_value", "()", "()".to_owned())
            );
            block_end!(recording, 18, 4);
        } else {
            classify!(5, Some(id), None);
            control!(recording, 4, "if", "false");
            call!(
                recording,
                4,
                "is_eq",
                vec![Variable::available(
                    "self",
                    "Ordering",
                    format!("{:?}", height_order[id])
                )],
                Variable::available("return_value", "bool", equal.to_string())
            );
        }
        if let Some(steps) = &mut recording.steps {
            steps
                .last_mut()
                .expect("loop body completion exists")
                .execution
                .blocks
                .push(ExecutionBlock {
                    line: 2,
                    phase: "before",
                });
        }
        classify!(16, None, None);
        reset_controls!(recording, 2);
        control!(recording, 2, "for", "pending");
    }
    classify!(6, None, None);
    control!(recording, 2, "for", "exhausted");
    // Capture membership once from the same exact incident block used by
    // the sweep, before removals or insertions change the active state.
    let participants = if recording.steps.is_some() {
        let mut starts = Vec::new();
        let mut ends = Vec::new();
        let mut passes = Vec::new();
        classify!(7, None, Some((&starts, &ends, &passes)));
        for &id in &incident {
            classify!(8, Some(id), Some((&starts, &ends, &passes)));
            reset_controls!(recording, 8);
            control!(recording, 8, "for", "entered");
            if segments[id].left == *point {
                classify!(9, Some(id), Some((&starts, &ends, &passes)));
                control!(recording, 9, "if", "true");
                pending_call!(
                    recording,
                    10,
                    "push",
                    0,
                    vec![
                        Variable::available("self", "&mut Vec<usize>", format!("{starts:?}")),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    "()"
                );
                let before = format!("{starts:?}");
                starts.push(id);
                classify!(10, Some(id), Some((&starts, &ends, &passes)));
                call!(
                    recording,
                    10,
                    "push",
                    vec![
                        Variable::available("self", "&mut Vec<usize>", before),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    Variable::available("return_value", "()", "()".to_owned())
                );
                block_end!(recording, 19, 9);
            } else {
                classify!(10, Some(id), Some((&starts, &ends, &passes)));
                control!(recording, 9, "if", "false");
            }
            if segments[id].right == *point {
                classify!(11, Some(id), Some((&starts, &ends, &passes)));
                control!(recording, 11, "if", "true");
                pending_call!(
                    recording,
                    12,
                    "push",
                    0,
                    vec![
                        Variable::available("self", "&mut Vec<usize>", format!("{ends:?}")),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    "()"
                );
                let before = format!("{ends:?}");
                ends.push(id);
                classify!(12, Some(id), Some((&starts, &ends, &passes)));
                call!(
                    recording,
                    12,
                    "push",
                    vec![
                        Variable::available("self", "&mut Vec<usize>", before),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    Variable::available("return_value", "()", "()".to_owned())
                );
                block_end!(recording, 20, 11);
            } else {
                classify!(12, Some(id), Some((&starts, &ends, &passes)));
                control!(recording, 11, "if", "false");
            }
            if segments[id].left != *point && segments[id].right != *point {
                classify!(13, Some(id), Some((&starts, &ends, &passes)));
                control!(recording, 13, "if", "true");
                pending_call!(
                    recording,
                    14,
                    "push",
                    0,
                    vec![
                        Variable::available("self", "&mut Vec<usize>", format!("{passes:?}")),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    "()"
                );
                let before = format!("{passes:?}");
                passes.push(id);
                classify!(14, Some(id), Some((&starts, &ends, &passes)));
                call!(
                    recording,
                    14,
                    "push",
                    vec![
                        Variable::available("self", "&mut Vec<usize>", before),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    Variable::available("return_value", "()", "()".to_owned())
                );
                block_end!(recording, 21, 13);
            } else {
                classify!(14, Some(id), Some((&starts, &ends, &passes)));
                control!(recording, 13, "if", "false");
            }
            if let Some(steps) = &mut recording.steps {
                steps
                    .last_mut()
                    .expect("loop body completion exists")
                    .execution
                    .blocks
                    .push(ExecutionBlock {
                        line: 8,
                        phase: "before",
                    });
            }
            classify!(17, None, Some((&starts, &ends, &passes)));
            reset_controls!(recording, 8);
            control!(recording, 8, "for", "pending");
        }
        classify!(15, None, Some((&starts, &ends, &passes)));
        control!(recording, 8, "for", "exhausted");
        Some((starts, ends, passes))
    } else {
        None
    };
    Some(ClassifiedEvent {
        incident,
        participants,
    })
}
