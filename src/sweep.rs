//! Exact sweep state and its execution path.
use crate::teaching::*;
use crate::trace_publication;

mod classify;
mod observation;
mod record;
mod take;
use crate::{Geometry, Intersection, Point, Rational, Segment};
use observation::{
    ObservationState, Recorder, block_end, call, control, observe, pending_call, reset_controls,
};
use std::collections::BTreeMap;
use std::sync::Arc;

pub(crate) struct SweepSegment {
    pub(crate) left: Point,
    pub(crate) right: Point,
    // Points have no supporting line and are removed before status insertion.
    pub(crate) slope: Option<Rational>,
    pub(crate) intercept: Rational,
}

impl SweepSegment {
    fn new(segment: &Segment, shear: &Rational) -> Self {
        let transform = |point: &Point| Point {
            x: &point.x + shear * &point.y,
            y: point.y.clone(),
        };
        let start = transform(&segment.start);
        let end = transform(&segment.end);
        let (left, right) = if start.x < end.x {
            (start, end)
        } else {
            (end, start)
        };
        let slope = (left != right).then(|| (&right.y - &left.y) / (&right.x - &left.x));
        let intercept = slope
            .as_ref()
            .map_or_else(|| left.y.clone(), |slope| &left.y - slope * &left.x);
        Self {
            left,
            right,
            slope,
            intercept,
        }
    }

    fn y_at(&self, x: &Rational) -> Rational {
        self.slope.as_ref().expect("active segment has a slope") * x + &self.intercept
    }
}

fn choose_shear(segments: &[Segment]) -> Rational {
    if !segments
        .iter()
        .any(|s| s.start.x == s.end.x && s.start.y != s.end.y)
    {
        return Rational::from_integer(0.into());
    }
    let coordinates = || {
        segments
            .iter()
            .flat_map(|s| [&s.start.x, &s.start.y, &s.end.x, &s.end.y])
    };
    // A common denominator D makes all endpoints integral.
    let mut denominator = Rational::from_integer(1.into());
    for coordinate in coordinates() {
        // Multiplication is deliberate: any common multiple is sufficient.
        denominator *= Rational::from_integer(coordinate.denom().clone());
    }
    let mut bound = Rational::from_integer(1.into());
    for coordinate in coordinates() {
        let scaled = coordinate * &denominator;
        bound = bound.max(scaled.clone()).max(-scaled);
    }
    // Let M bound the scaled endpoint coordinates. Intersection denominators
    // divide a determinant of magnitude <= 8 M^2, so distinct event x values
    // differ by >= 1/(64 M^4); event y values differ by <= 2 M. Scaling back
    // divides both bounds by D. Thus s = 1/(256 (M+1)^5) preserves every strict
    // x ordering and breaks equal x by y. Nonzero segments become nonvertical.
    // This is exact arithmetic, not a floating-point epsilon or pairwise oracle.
    let margin = bound + Rational::from_integer(1.into());
    Rational::from_integer(1.into()) / (Rational::from_integer(256.into()) * margin.pow(5))
}

#[derive(Default)]
pub(crate) struct Event {
    // Ends and interior crossings are recovered from the active sequence at
    // this exact point, so a discovered crossing needs no stored pair identity.
    pub(crate) starts: Vec<usize>,
}

struct SweepState {
    segments: Vec<SweepSegment>,
    shear: Rational,
    queue: BTreeMap<Point, Event>,
    active: Vec<usize>,
    height_order: Vec<std::cmp::Ordering>,
    result: Vec<Intersection>,
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

/// Return every intersecting input pair with its exact point or full overlap.
///
/// Input identity is the index in `segments`; results contain each unordered
/// pair once. Result order is not part of the contract. Coordinates must be
/// valid, normalized rationals (use `Rational::new` or `from_integer`, not
/// unchecked `new_raw`). See the crate documentation for the currently supported
/// input domain and cost. Zero-length segments are accepted as points.
pub fn intersections(segments: &[Segment]) -> Vec<Intersection> {
    sweep(segments, None, &|| false)
        .expect("ordinary computation is never cancelled")
        .intersections
}

#[cfg(test)]
pub(crate) fn trace_intersections(segments: &[Segment]) -> (Vec<Intersection>, SweepTrace) {
    let mut steps = Vec::new();
    let outcome = stream_intersections(
        segments,
        &mut |batch| {
            steps.extend(batch.steps);
            true
        },
        &|| false,
    )
    .expect("collected computation is never cancelled");
    (
        outcome.intersections,
        SweepTrace {
            shear: outcome.shear,
            steps,
        },
    )
}

pub(crate) struct SweepOutcome {
    pub intersections: Vec<Intersection>,
    pub shear: Rational,
}

pub(crate) fn stream_intersections(
    segments: &[Segment],
    emit: &mut dyn FnMut(SweepTrace) -> bool,
    cancelled: &dyn Fn() -> bool,
) -> Option<SweepOutcome> {
    sweep(segments, Some(emit), cancelled)
}

// Keeps closure blocks intact under stable rustfmt without runtime work.
macro_rules! nop {
    () => {};
}
pub(super) use nop;

fn sweep(
    segments: &[Segment],
    emit: Option<&mut dyn FnMut(SweepTrace) -> bool>,
    cancelled: &dyn Fn() -> bool,
) -> Option<SweepOutcome> {
    if cancelled() {
        return None;
    }
    let next_call = std::cell::Cell::new(1);
    let shear = choose_shear(segments);
    let mut publication = emit.map(|emit| trace_publication::TracePublication::new(&shear, emit));
    let mut steps = publication
        .as_mut()
        .map(trace_publication::TracePublication::steps);
    // Capture the binding immediately before it is shadowed, only for teaching.
    let input_value = steps.as_ref().map(|_| {
        Arc::<str>::from(format!(
            "[{}]",
            segments
                .iter()
                .map(|segment| format!(
                    "Segment {{ start: {}, end: {} }}",
                    point_value(&segment.start),
                    point_value(&segment.end)
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ))
    });
    let segments: Vec<_> = segments
        .iter()
        .map(|segment| SweepSegment::new(segment, &shear))
        .collect();
    let trace_segments = steps
        .as_ref()
        .map(|_| Arc::<str>::from(sweep_segments_value(&segments)));
    let mut queue: BTreeMap<Point, Event> = BTreeMap::new();
    for (id, segment) in segments.iter().enumerate() {
        if cancelled() {
            return None;
        }
        queue
            .entry(segment.left.clone())
            .or_default()
            .starts
            .push(id);
        queue.entry(segment.right.clone()).or_default();
    }
    let active: Vec<usize> = Vec::new();
    let height_order = vec![std::cmp::Ordering::Equal; segments.len()];
    let result = Vec::new();
    let mut state = SweepState {
        segments,
        shear,
        queue,
        active,
        height_order,
        result,
    };
    let SweepState {
        queue,
        active,
        result,
        ..
    } = &mut state;

    if let Some(steps) = &mut steps {
        steps.push(SweepStep::capture(
            "initial",
            None,
            queue,
            active,
            result,
            &[],
            &[],
            input_value.as_ref().expect("tracing captures input"),
        ));
    }
    if let Some(publication) = &mut publication
        && !publication.publish()
    {
        return None;
    }
    loop {
        if cancelled() {
            return None;
        }
        let mut recording = Recorder {
            steps: publication
                .as_mut()
                .map(trace_publication::TracePublication::steps),
            input_value: &input_value,
            trace_segments: &trace_segments,
            next_call: &next_call,
            cancelled,
        };
        let Some(take::TakenEvent {
            point,
            event,
            first_step,
        }) = take::take(&mut state, &mut recording)
        else {
            break;
        };
        let classified = classify::classify(&mut state, &point, event, &mut recording)?;
        record::record(&mut state, &point, &classified, &mut recording)?;
        let classify::ClassifiedEvent {
            mut incident,
            participants,
        } = classified;
        let SweepState {
            segments,
            shear,
            queue,
            active,
            height_order,
            result,
        } = &mut state;
        let shear = &*shear;
        macro_rules! activity {
            ($boundary:expr, $incident:expr, $position:expr, $inserted:expr) => {
                observe!(
                    recording,
                    ObservationState {
                        queue,
                        active,
                        result,
                        height_order,
                        shear
                    },
                    &point,
                    "activity",
                    $boundary,
                    &[],
                    {
                        let incident: Option<&Vec<usize>> = $incident;
                        let position: Option<usize> = $position;
                        let inserted: Option<usize> = $inserted;
                        let mut locals = vec![incident.map_or_else(
                            || Variable::absent("incident", "Vec<usize>", "unavailable"),
                            |incident| {
                                Variable::available(
                                    "incident",
                                    "Vec<usize>",
                                    format!("{incident:?}"),
                                )
                            },
                        )];
                        for (name, value) in [("position", position), ("inserted", inserted)] {
                            locals.push(value.map_or_else(
                                || Variable::absent(name, "usize", "unassigned"),
                                |value| Variable::available(name, "usize", value.to_string()),
                            ));
                        }
                        locals
                    }
                );
            };
        }
        macro_rules! closure_call {
            ($module:expr, $function:expr, $parameters:expr, $captures:expr, $type:expr, $body:expr, $format:expr) => {{
                let trace = recording.steps.as_mut().map(|steps| {
                    ClosureTrace::enter(
                        steps,
                        &next_call,
                        $module,
                        $function,
                        $parameters,
                        $captures,
                        $type,
                    )
                });
                let value = $body;
                if let Some(trace) = trace {
                    trace.returned(
                        recording.steps.as_mut().expect("tracing is enabled"),
                        ($format)(&value),
                    );
                }
                value
            }};
        }
        activity!(0, Some(&incident), None, None);
        let removed = recording.steps.as_ref().map(|_| {
            active
                .iter()
                .copied()
                .filter(|&id| segments[id].right == point)
                .collect::<Vec<_>>()
        });
        let before = recording.steps.as_ref().map(|_| format!("{active:?}"));
        pending_call!(
            recording,
            1,
            "retain",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            "()"
        );
        active.retain(|&id| {
            nop!();
            closure_call!(
                "retain-end",
                "retain closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["segments", "point"],
                "bool",
                segments[id].right != point,
                |value: &bool| value.to_string()
            )
        });
        activity!(1, Some(&incident), None, None);
        call!(
            recording,
            1,
            "retain",
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        if let Some(steps) = &mut recording.steps
            && let Some(removed) = &removed
            && !removed.is_empty()
        {
            let step = steps.last_mut().expect("removal observation was captured");
            step.action = "remove";
            step.subjects.clone_from(removed);
        }
        let previous_order = recording.steps.as_ref().map(|_| active.clone());
        let before = recording.steps.as_ref().map(|_| format!("{active:?}"));
        pending_call!(
            recording,
            2,
            "retain",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| !height_order[id].is_eq()".to_owned()
                )
            ],
            "()"
        );
        active.retain(|&id| {
            nop!();
            closure_call!(
                "retain-height",
                "retain closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["height_order"],
                "bool",
                !height_order[id].is_eq(),
                |value: &bool| value.to_string()
            )
        });
        activity!(2, Some(&incident), None, None);
        call!(
            recording,
            2,
            "retain",
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| !height_order[id].is_eq()".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        let before = recording.steps.as_ref().map(|_| format!("{incident:?}"));
        pending_call!(
            recording,
            3,
            "retain",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            "()"
        );
        incident.retain(|&id| {
            nop!();
            closure_call!(
                "retain-end",
                "retain closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["segments", "point"],
                "bool",
                segments[id].right != point,
                |value: &bool| value.to_string()
            )
        });
        activity!(3, Some(&incident), None, None);
        call!(
            recording,
            3,
            "retain",
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        let before = recording.steps.as_ref().map(|_| format!("{incident:?}"));
        pending_call!(
            recording,
            4,
            "sort_by",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut [usize]",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "compare",
                    "closure",
                    "|&a, &b| segments[a].slope.cmp(&segments[b].slope)".to_owned()
                )
            ],
            "()"
        );
        incident.sort_by(|&a, &b| {
            nop!();
            closure_call!(
                "sort-by",
                "sort_by closure",
                vec![
                    Variable::available("a", "usize", a.to_string()),
                    Variable::available("b", "usize", b.to_string())
                ],
                &["segments"],
                "Ordering",
                segments[a].slope.cmp(&segments[b].slope),
                |value: &std::cmp::Ordering| format!("{value:?}")
            )
        });
        activity!(4, Some(&incident), None, None);
        call!(
            recording,
            4,
            "sort_by",
            vec![
                Variable::available(
                    "self",
                    "&mut [usize]",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "compare",
                    "closure",
                    "|&a, &b| segments[a].slope.cmp(&segments[b].slope)".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        // Equal-x events at different y remain separate. At the current y,
        // ascending slope is the order immediately after this event; other
        // equal-y blocks keep their pre-event order until their own event.
        pending_call!(
            recording,
            5,
            "partition_point",
            0,
            vec![
                Variable::available("self", "&[usize]", format!("{active:?}")),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| height_order[id].is_lt()".to_owned()
                )
            ],
            "usize"
        );
        let position = active.partition_point(|&id| {
            nop!();
            closure_call!(
                "partition-point",
                "partition_point closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["height_order"],
                "bool",
                height_order[id].is_lt(),
                |value: &bool| value.to_string()
            )
        });
        activity!(5, Some(&incident), Some(position), None);
        call!(
            recording,
            5,
            "partition_point",
            vec![
                Variable::available("self", "&[usize]", format!("{active:?}")),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| height_order[id].is_lt()".to_owned()
                )
            ],
            Variable::available("return_value", "usize", position.to_string())
        );
        pending_call!(
            recording,
            6,
            "len",
            0,
            vec![Variable::available(
                "self",
                "&Vec<usize>",
                format!("{incident:?}")
            )],
            "usize"
        );
        let inserted = incident.len();
        activity!(6, Some(&incident), Some(position), Some(inserted));
        call!(
            recording,
            6,
            "len",
            vec![Variable::available(
                "self",
                "&Vec<usize>",
                format!("{incident:?}")
            )],
            Variable::available("return_value", "usize", inserted.to_string())
        );
        let splice_arguments = recording.steps.as_ref().map(|_| {
            vec![
                Variable::available("self", "&mut Vec<usize>", format!("{active:?}")),
                Variable::available("range", "Range<usize>", format!("{position}..{position}")),
                Variable::available("replace_with", "Vec<usize>", format!("{incident:?}")),
            ]
        });
        pending_call!(
            recording,
            7,
            "splice",
            0,
            splice_arguments
                .as_ref()
                .expect("trace captures arguments")
                .clone(),
            "Splice<IntoIter<usize>>"
        );
        active.splice(position..position, incident);
        activity!(7, None, Some(position), Some(inserted));
        call!(
            recording,
            7,
            "splice",
            splice_arguments.expect("trace captures arguments"),
            Variable::absent("return_value", "Splice<IntoIter<usize>>", "unavailable")
        );
        if let Some(steps) = &mut recording.steps {
            let previous_order = previous_order
                .as_ref()
                .expect("tracing captures the previous order");
            let added: Vec<_> = active
                .iter()
                .copied()
                .filter(|&id| segments[id].left == point)
                .collect();
            let continuing: Vec<_> = active
                .iter()
                .copied()
                .filter(|id| previous_order.contains(id))
                .collect();
            let step = steps.last_mut().expect("splice observation was captured");
            if !added.is_empty() {
                step.action = "insert";
                step.subjects = added;
            } else if &continuing != previous_order {
                step.action = "reorder";
                step.subjects = active[position..position + inserted].to_vec();
            }
        }
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
                    &point,
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
                                || {
                                    Variable::absent(
                                        "boundaries",
                                        "[Option<usize>; 2]",
                                        "unassigned",
                                    )
                                },
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
                        Variable::available(
                            "index",
                            "Range<usize>",
                            format!("{lower}..{}", lower + 2)
                        )
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
            let mut observer = |boundary,
                                queue: &BTreeMap<Point, Event>,
                                checked: &[[usize; 2]],
                                locals,
                                controls| {
                if let Some(steps) = &mut recording.steps {
                    let action = if boundary == 2 {
                        "check"
                    } else if boundary == 6 && queue.len() > pending_count {
                        "discover"
                    } else {
                        "micro"
                    };
                    let mut step = SweepStep::capture(
                        action,
                        Some(&point),
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
                    step.execution.outer =
                        vec![caller.as_ref().expect("tracing captures caller").clone()];
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
                                Arc::clone(
                                    trace_segments.as_ref().expect("tracing captures segments"),
                                ),
                            ),
                            Variable::available("current", "&Point", point_value(&point)),
                            queue_parameter,
                            Variable::available(
                                "checked",
                                "&mut Vec<[usize; 2]>",
                                format!("{checked:?}"),
                            ),
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
                                Variable::available(
                                    "index",
                                    "Range<usize>",
                                    format!("{lower}..{}", lower + 2),
                                ),
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
                                Variable::available(
                                    "index",
                                    "Range<usize>",
                                    format!("{lower}..{}", lower + 2),
                                ),
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
                                Variable::available(
                                    "self",
                                    "&mut Vec<[usize; 2]>",
                                    format!("{checked:?}"),
                                ),
                                Variable::available(
                                    "value",
                                    "[usize; 2]",
                                    format!("{neighbors:?}"),
                                ),
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
                                Variable::available(
                                    "self",
                                    "&mut BTreeMap<Point, Event>",
                                    queue_argument,
                                ),
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
                                result: Variable::available(
                                    "return_value",
                                    "Option<Point>",
                                    returned,
                                ),
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
                                        Variable::absent(
                                            "return_value",
                                            call.result.r#type,
                                            "unavailable",
                                        )
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
            };
            let observer: Option<&mut NeighborObserver<'_>> =
                if tracing { Some(&mut observer) } else { None };
            let candidate = schedule_neighbors(
                active,
                lower,
                segments,
                &point,
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
        if let Some(publication) = &mut publication
            && !publication.finish_event(
                first_step,
                &checked,
                participants.expect("tracing captures participants"),
            )
        {
            return None;
        }
    }
    if let Some(publication) = &mut publication
        && !publication.publish()
    {
        return None;
    }
    Some(SweepOutcome {
        intersections: state.result,
        shear: state.shear,
    })
}

#[cfg(test)]
#[path = "sweep_tests.rs"]
mod tests;
