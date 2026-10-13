//! Checks the affected neighbors and schedules exact future events.
use super::activity::ActivityUpdate;
use super::observation::closure_call;
use super::*;

pub(super) fn check(
    state: &mut SweepState,
    point: &Point,
    update: ActivityUpdate,
    recording: &mut Recorder<'_, '_>,
) -> Option<Vec<[usize; 2]>> {
    let SweepState {
        segments,
        shear,
        queue,
        active,
        height_order,
        result,
    } = state;
    let shear = &*shear;
    let ActivityUpdate { position, inserted } = update;
    let next_call = recording.next_call;
    let input_value = recording.input_value;
    let trace_segments = recording.trace_segments;
    let cancelled = recording.cancelled;
    macro_rules! neighbors {
        ($boundary:expr, $checked:expr, $boundaries:expr, $lower:expr, $neighbors:expr, $candidate:expr) => {
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
                "neighbors",
                $boundary,
                $neighbors.unwrap_or(&[]),
                {
                    let checked: Option<&[[usize; 2]]> = $checked;
                    let boundaries: Option<&[Option<usize>; 2]> = $boundaries;
                    let lower: Option<usize> = $lower;
                    let neighbors: Option<&[usize]> = $neighbors;
                    let candidate: Option<&Option<Point>> = $candidate;
                    vec![
                        Variable::available("position", "usize", position.to_string()),
                        Variable::available("inserted", "usize", inserted.to_string()),
                        checked.map_or_else(
                            || Variable::absent("checked", "Vec<[usize; 2]>", "unassigned"),
                            |checked| {
                                Variable::available(
                                    "checked",
                                    "Vec<[usize; 2]>",
                                    format!("{checked:?}"),
                                )
                            },
                        ),
                        boundaries.map_or_else(
                            || Variable::absent("boundaries", "[Option<usize>; 2]", "unassigned"),
                            |boundaries| {
                                Variable::available(
                                    "boundaries",
                                    "[Option<usize>; 2]",
                                    format!("{boundaries:?}"),
                                )
                            },
                        ),
                        lower.map_or_else(
                            || {
                                Variable::absent(
                                    "lower",
                                    "usize",
                                    if $boundary < 3 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |lower| Variable::available("lower", "usize", lower.to_string()),
                        ),
                        neighbors.map_or_else(
                            || {
                                Variable::absent(
                                    "neighbors",
                                    "&[usize]",
                                    if $boundary <= 3 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |neighbors| {
                                Variable::available(
                                    "neighbors",
                                    "&[usize]",
                                    format!("{neighbors:?}"),
                                )
                            },
                        ),
                        candidate.map_or_else(
                            || {
                                Variable::absent(
                                    "candidate",
                                    "Option<Point>",
                                    if $boundary <= 4 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |candidate| {
                                Variable::available(
                                    "candidate",
                                    "Option<Point>",
                                    optional_point_value(candidate),
                                )
                            },
                        ),
                    ]
                }
            );
        };
    }
    neighbors!(0, None, None, None, None::<&[usize]>, None);
    let mut checked = Vec::new();
    neighbors!(1, Some(&checked), None, None, None::<&[usize]>, None);
    let boundaries = [
        position.checked_sub(1),
        (inserted > 0).then(|| {
            nop!();
            closure_call!(
                recording,
                "then",
                "then closure",
                vec![],
                &["position", "inserted"],
                "usize",
                position + inserted - 1,
                |value: &usize| value.to_string()
            )
        }),
    ];
    neighbors!(
        2,
        Some(&checked),
        Some(&boundaries),
        None,
        None::<&[usize]>,
        None
    );
    for lower in boundaries.into_iter().flatten() {
        neighbors!(
            3,
            Some(&checked),
            Some(&boundaries),
            Some(lower),
            None::<&[usize]>,
            None
        );
        reset_controls!(recording, 3);
        control!(recording, 3, "for", "entered");
        pending_call!(
            recording,
            4,
            "get",
            0,
            vec![
                Variable::available("self", "&[usize]", format!("{active:?}")),
                Variable::available("index", "Range<usize>", format!("{lower}..{}", lower + 2))
            ],
            "Option<&[usize]>"
        );
        let Some(neighbors) = active.get(lower..lower + 2) else {
            neighbors!(
                7,
                Some(&checked),
                Some(&boundaries),
                Some(lower),
                None::<&[usize]>,
                None
            );
            control!(recording, 4, "else", "entered");
            control!(recording, 4, "continue", "pending");
            call!(
                recording,
                4,
                "get",
                vec![
                    Variable::available("self", "&[usize]", format!("{active:?}")),
                    Variable::available("index", "Range<usize>", format!("{lower}..{}", lower + 2))
                ],
                Variable::available("return_value", "Option<&[usize]>", "None")
            );
            neighbors!(
                8,
                Some(&checked),
                Some(&boundaries),
                None,
                None::<&[usize]>,
                None
            );
            reset_controls!(recording, 3);
            control!(recording, 3, "for", "pending");
            control!(recording, 4, "continue", "jumping");
            continue;
        };
        neighbors!(
            4,
            Some(&checked),
            Some(&boundaries),
            Some(lower),
            Some(neighbors),
            None
        );
        control!(recording, 4, "else", "skipped");
        control!(recording, 4, "continue", "skipped");
        call!(
            recording,
            4,
            "get",
            vec![
                Variable::available("self", "&[usize]", format!("{active:?}")),
                Variable::available("index", "Range<usize>", format!("{lower}..{}", lower + 2))
            ],
            Variable::available(
                "return_value",
                "Option<&[usize]>",
                format!("Some({neighbors:?})")
            )
        );
        let schedule_arguments = recording.steps.as_ref().map(|steps| {
            let locals = &steps
                .last()
                .expect("caller observation exists")
                .execution
                .context
                .locals;
            [
                ("active", "active", "&[usize]"),
                ("lower", "lower", "usize"),
                ("segments", "segments", "&[SweepSegment]"),
                ("point", "current", "&Point"),
                ("queue", "queue", "&mut BTreeMap<Point, Event>"),
                ("checked", "checked", "&mut Vec<[usize; 2]>"),
            ]
            .into_iter()
            .map(|(source, name, r#type)| {
                let mut argument = locals
                    .iter()
                    .find(|variable| variable.name == source)
                    .expect("caller argument exists")
                    .clone();
                argument.name = name;
                argument.r#type = r#type;
                argument
            })
            .collect::<Vec<_>>()
        });
        pending_call!(
            recording,
            5,
            "schedule_neighbors",
            0,
            schedule_arguments
                .as_ref()
                .expect("trace captures arguments")
                .clone(),
            "Option<Point>"
        );
        let pending_count = queue.len();
        let tracing = recording.steps.is_some();
        let caller = recording.steps.as_ref().map(|steps| {
            steps
                .last()
                .expect("caller stop exists")
                .execution
                .context
                .clone()
        });
        let call_id = next_call.get();
        if tracing {
            next_call.set(call_id + 1);
        }
        let call_context = caller.as_ref().map(|caller| NeighborCall {
            pending_count,
            call_id,
            caller,
            point,
            active,
            result,
            neighbors,
            lower,
            input_value,
            trace_segments,
        });
        let mut observer =
            |boundary, queue: &BTreeMap<Point, Event>, checked: &[[usize; 2]], locals, controls| {
                if let Some(steps) = &mut recording.steps {
                    call_context
                        .as_ref()
                        .expect("tracing captures caller")
                        .observe(steps, boundary, queue, checked, locals, controls);
                }
            };
        let observer: Option<&mut NeighborObserver<'_>> =
            if tracing { Some(&mut observer) } else { None };
        let candidate = schedule_neighbors(
            active,
            lower,
            segments,
            point,
            queue,
            &mut checked,
            observer,
            cancelled,
        );
        neighbors!(
            5,
            Some(&checked),
            Some(&boundaries),
            Some(lower),
            Some(neighbors),
            Some(&candidate)
        );
        control!(recording, 3, "for", "entered");
        control!(recording, 4, "else", "skipped");
        control!(recording, 4, "continue", "skipped");
        call!(
            recording,
            5,
            "schedule_neighbors",
            schedule_arguments.expect("trace captures arguments"),
            Variable::available(
                "return_value",
                "Option<Point>",
                optional_point_value(&candidate)
            )
        );
        neighbors!(
            8,
            Some(&checked),
            Some(&boundaries),
            None,
            None::<&[usize]>,
            None
        );
        reset_controls!(recording, 3);
        control!(recording, 3, "for", "pending");
    }
    neighbors!(
        6,
        Some(&checked),
        Some(&boundaries),
        None,
        None::<&[usize]>,
        None
    );
    control!(recording, 3, "for", "exhausted");
    Some(checked)
}

// Borrows the suspended caller and immutable sweep data for one real call.
// Queue and checked are supplied at each boundary after their actual mutations.
struct NeighborCall<'a> {
    pending_count: usize,
    call_id: usize,
    caller: &'a ExecutionContext,
    point: &'a Point,
    active: &'a [usize],
    result: &'a [Intersection],
    neighbors: &'a [usize],
    lower: usize,
    input_value: &'a Option<Arc<str>>,
    trace_segments: &'a Option<Arc<str>>,
}

impl NeighborCall<'_> {
    fn observe(
        &self,
        steps: &mut Vec<SweepStep>,
        boundary: usize,
        queue: &BTreeMap<Point, Event>,
        checked: &[[usize; 2]],
        locals: Vec<Variable>,
        controls: Vec<ExecutionControl>,
    ) {
        let Self {
            pending_count,
            call_id,
            caller,
            point,
            active,
            result,
            neighbors,
            lower,
            input_value,
            trace_segments,
        } = *self;
        let action = if boundary == 2 {
            "check"
        } else if boundary == 6 && queue.len() > pending_count {
            "discover"
        } else {
            "micro"
        };
        let mut step = SweepStep::capture(
            action,
            Some(point),
            queue,
            active,
            result,
            checked,
            neighbors,
            input_value.as_ref().expect("tracing captures input"),
        );
        let mut queue_parameter = step.execution.context.locals.remove(0);
        queue_parameter.r#type = "&mut BTreeMap<Point, Event>";
        step.execution.module = "geometry";
        step.execution.boundary = Some(boundary);
        step.execution.entry = boundary == 0;
        step.execution.outer = vec![caller.clone()];
        step.execution.returning = matches!(boundary, 8 | 11 | 12);
        step.execution.controls = controls;
        step.execution.context = ExecutionContext {
            id: call_id,
            captures: Vec::new(),
            function: "schedule_neighbors",
            parameters: vec![
                Variable::available("active", "&[usize]", format!("{active:?}")),
                Variable::available("lower", "usize", lower.to_string()),
                Variable::available(
                    "segments",
                    "&[SweepSegment]",
                    Arc::clone(trace_segments.as_ref().expect("tracing captures segments")),
                ),
                Variable::available("current", "&Point", point_value(point)),
                queue_parameter,
                Variable::available("checked", "&mut Vec<[usize; 2]>", format!("{checked:?}")),
            ],
            locals,
        };
        let locals = &step.execution.context.locals;
        if boundary == 0 {
            step.execution.calls.push(ExecutionCall::pending(
                1,
                "get",
                0,
                vec![
                    Variable::available("self", "&[usize]", format!("{active:?}")),
                    Variable::available("index", "Range<usize>", format!("{lower}..{}", lower + 2)),
                ],
                "Option<&[usize]>",
            ));
        }
        if matches!(boundary, 1 | 9 | 11) {
            step.execution.calls.push(ExecutionCall {
                line: 1,
                function: "get",
                occurrence: 0,
                arguments: vec![
                    Variable::available("self", "&[usize]", format!("{active:?}")),
                    Variable::available("index", "Range<usize>", format!("{lower}..{}", lower + 2)),
                ],
                result: Variable::available(
                    "return_value",
                    "Option<&[usize]>",
                    if boundary == 1 {
                        format!("Some({neighbors:?})")
                    } else {
                        "None".to_owned()
                    },
                ),
            });
        }
        if boundary == 1 {
            step.execution.calls.push(ExecutionCall::pending(
                2,
                "push",
                0,
                vec![
                    Variable::available("self", "&mut Vec<[usize; 2]>", format!("{checked:?}")),
                    Variable::available("value", "[usize; 2]", format!("{neighbors:?}")),
                ],
                "()",
            ));
        }
        if boundary == 3 {
            let arguments = locals
                .iter()
                .filter(|variable| variable.name == "a" || variable.name == "b")
                .cloned()
                .collect();
            step.execution.calls.push(ExecutionCall::pending(
                4,
                "intersection_candidate",
                0,
                arguments,
                "Option<Point>",
            ));
        }
        if boundary == 5 {
            let point_argument = locals
                .iter()
                .find(|variable| variable.name == "point")
                .and_then(|variable| variable.value.as_ref())
                .expect("candidate exists before queue entry")
                .clone();
            let queue_argument = step
                .execution
                .context
                .parameters
                .iter()
                .find(|variable| variable.name == "queue")
                .and_then(|variable| variable.value.as_ref())
                .expect("queue parameter exists")
                .clone();
            step.execution.calls.push(ExecutionCall::pending(
                6,
                "clone",
                0,
                vec![Variable::available("self", "&Point", point_argument)],
                "Point",
            ));
            step.execution.calls.push(ExecutionCall::pending(
                6,
                "entry",
                0,
                vec![
                    Variable::available("self", "&mut BTreeMap<Point, Event>", queue_argument),
                    Variable::absent("key", "Point", "unassigned"),
                ],
                "Entry<Point, Event>",
            ));
            step.execution.calls.push(ExecutionCall::pending(
                6,
                "or_default",
                0,
                vec![Variable::absent(
                    "self",
                    "Entry<Point, Event>",
                    "unassigned",
                )],
                "&mut Event",
            ));
        }
        let failed_candidate = matches!(boundary, 10 | 12);
        if boundary == 4 || failed_candidate {
            let arguments: Vec<_> = locals
                .iter()
                .filter(|variable| {
                    (variable.name == "a" || variable.name == "b")
                        && variable.availability == "available"
                })
                .cloned()
                .collect();
            if arguments.len() == 2 {
                let returned = if failed_candidate {
                    "None".to_owned()
                } else {
                    format!(
                        "Some({})",
                        locals
                            .iter()
                            .find(|variable| variable.name == "point")
                            .and_then(|variable| variable.value.as_ref())
                            .expect("candidate point exists")
                    )
                };
                step.execution.calls.push(ExecutionCall {
                    line: 4,
                    function: "intersection_candidate",
                    occurrence: 0,
                    arguments,
                    result: Variable::available("return_value", "Option<Point>", returned),
                });
            }
        }
        if boundary != 0
            && let Some(previous) = steps.last()
            && previous.execution.module == "geometry"
        {
            for call in &previous.execution.calls {
                if !step.execution.calls.iter().any(|current| {
                    current.line == call.line
                        && current.function == call.function
                        && current.occurrence == call.occurrence
                }) {
                    let mut call = call.clone();
                    if boundary == 2 && call.function == "push" {
                        call.result = Variable::available("return_value", "()", "()");
                    }
                    if boundary == 6 && call.line == 6 {
                        call.result = if call.function == "clone" {
                            let point = step
                                .execution
                                .context
                                .locals
                                .iter()
                                .find(|variable| variable.name == "point")
                                .and_then(|variable| variable.value.clone())
                                .expect("queue insertion retains point");
                            Variable::available("return_value", "Point", point)
                        } else {
                            Variable::absent("return_value", call.result.r#type, "unavailable")
                        };
                    }
                    step.execution.calls.push(call);
                }
            }
        }
        if boundary == 6 {
            step.execution.blocks.push(ExecutionBlock {
                line: 5,
                phase: "before",
            });
        }
        let completed_if = boundary == 7
            && step.execution.controls.iter().any(|control| {
                control.line == 5 && control.keyword == "if" && control.state == "true"
            });
        steps.push(step);
        if completed_if {
            SweepStep::block_after(steps, 5);
        }
    }
}

type NeighborObserver<'a> = dyn FnMut(usize, &BTreeMap<Point, Event>, &[[usize; 2]], Vec<Variable>, Vec<ExecutionControl>)
    + 'a;

fn schedule_neighbors(
    active: &[usize],
    lower: usize,
    segments: &[SweepSegment],
    current: &Point,
    queue: &mut BTreeMap<Point, Event>,
    checked: &mut Vec<[usize; 2]>,
    mut observer: Option<&mut NeighborObserver<'_>>,
    cancelled: &dyn Fn() -> bool,
) -> Option<Point> {
    let mut controls = Vec::new();
    macro_rules! geometry_control {
        ($line:expr, $keyword:expr, $state:expr) => {
            if observer.is_some() {
                ExecutionControl::set(&mut controls, $line, $keyword, $state);
            }
        };
    }
    macro_rules! observe_geometry {
        ($boundary:expr, $neighbors:expr, $pair:expr, $point:expr, $returned:expr) => {
            if cancelled() {
                return None;
            }
            if let Some(observer) = &mut observer {
                let neighbors: Option<&[usize]> = $neighbors;
                let pair: Option<(&SweepSegment, &SweepSegment)> = $pair;
                let point: Option<&Point> = $point;
                let returned: Option<&Option<Point>> = $returned;
                let mut locals = vec![neighbors.map_or_else(
                    || Variable::absent("neighbors", "&[usize]", "unassigned"),
                    |neighbors| {
                        Variable::available("neighbors", "&[usize]", format!("{neighbors:?}"))
                    },
                )];
                for (name, segment) in [
                    ("a", pair.map(|pair| pair.0)),
                    ("b", pair.map(|pair| pair.1)),
                ] {
                    locals.push(segment.map_or_else(
                        || Variable::absent(name, "&SweepSegment", "unassigned"),
                        |segment| {
                            Variable::available(name, "&SweepSegment", sweep_segment_value(segment))
                        },
                    ));
                }
                locals.push(point.map_or_else(
                    || {
                        Variable::absent(
                            "point",
                            "Point",
                            if matches!($boundary, 8 | 9 | 10 | 11 | 12) {
                                "unavailable"
                            } else {
                                "unassigned"
                            },
                        )
                    },
                    |point| Variable::available("point", "Point", point_value(point)),
                ));
                locals.push(returned.map_or_else(
                    || Variable::absent("return_value", "Option<Point>", "unassigned"),
                    |returned| {
                        Variable::available(
                            "return_value",
                            "Option<Point>",
                            optional_point_value(returned),
                        )
                    },
                ));
                observer($boundary, queue, checked, locals, controls.clone());
            }
        };
    }
    observe_geometry!(0, None, None, None, None);
    let Some(neighbors) = active.get(lower..lower + 2) else {
        geometry_control!(1, "else", "entered");
        geometry_control!(1, "return", "pending");
        observe_geometry!(9, None, None, None, None);
        let return_value = None;
        geometry_control!(1, "return", "returned");
        observe_geometry!(11, None, None, None, Some(&return_value));
        return return_value;
    };
    geometry_control!(1, "else", "skipped");
    geometry_control!(1, "return", "skipped");
    observe_geometry!(1, Some(neighbors), None, None, None);
    checked.push([neighbors[0], neighbors[1]]);
    observe_geometry!(2, Some(neighbors), None, None, None);
    let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);
    observe_geometry!(3, Some(neighbors), Some((a, b)), None, None);
    if a.slope == b.slope {
        geometry_control!(4, "else", "entered");
        geometry_control!(4, "return", "pending");
        observe_geometry!(10, Some(neighbors), Some((a, b)), None, None);
        let return_value = None;
        geometry_control!(4, "return", "returned");
        observe_geometry!(12, Some(neighbors), Some((a, b)), None, Some(&return_value));
        return return_value;
    }
    let cross_x = (&b.intercept - &a.intercept)
        / (a.slope.as_ref().expect("active segment has a slope")
            - b.slope.as_ref().expect("active segment has a slope"));
    if cross_x < a.left.x || cross_x > a.right.x || cross_x < b.left.x || cross_x > b.right.x {
        geometry_control!(4, "else", "entered");
        geometry_control!(4, "return", "pending");
        observe_geometry!(10, Some(neighbors), Some((a, b)), None, None);
        let return_value = None;
        geometry_control!(4, "return", "returned");
        observe_geometry!(12, Some(neighbors), Some((a, b)), None, Some(&return_value));
        return return_value;
    }
    let point = Point {
        y: a.y_at(&cross_x),
        x: cross_x,
    };
    geometry_control!(4, "else", "skipped");
    geometry_control!(4, "return", "skipped");
    observe_geometry!(4, Some(neighbors), Some((a, b)), Some(&point), None);
    if point > *current {
        geometry_control!(5, "if", "true");
        observe_geometry!(5, Some(neighbors), Some((a, b)), Some(&point), None);
        queue.entry(point.clone()).or_default();
        observe_geometry!(6, Some(neighbors), Some((a, b)), Some(&point), None);
    } else {
        geometry_control!(5, "if", "false");
    }
    geometry_control!(8, "return", "pending");
    observe_geometry!(7, Some(neighbors), Some((a, b)), Some(&point), None);
    let return_value = Some(point);
    geometry_control!(8, "return", "returned");
    observe_geometry!(8, Some(neighbors), Some((a, b)), None, Some(&return_value));
    return_value
}

#[cfg(test)]
#[path = "neighbors_tests.rs"]
mod tests;
