//! Exact sweep state and its execution path.
use super::teaching::*;
use super::trace_publication;

// Erased from production builds; test timing passes leave the ledger disabled.
macro_rules! account {
    ($function:ident($($argument:expr),* $(,)?)) => {
        #[cfg(test)]
        $crate::algorithms::segment_intersection::bo::sweep::diagnostics::$function($($argument),*);
    };
}

#[cfg(test)]
pub(crate) mod diagnostics;

mod activity;
mod classify;
mod groups;
mod neighbors;
mod observation;
mod record;
mod take;
use crate::algorithms::status::Status;
use crate::{Geometry, Intersection, Point, Rational, Segment};
use groups::Group;
use observation::Recorder;
use std::cell::RefCell;
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
    fn new(segment: &Segment, shear: &Rational, transformed: &mut BTreeMap<Point, Point>) -> Self {
        let mut transform = |point: &Point| {
            if shear.numer().bits() == 0 {
                return point.clone();
            }
            account!(access("transform_cache", 1));
            transformed
                .entry(point.clone())
                .or_insert_with(|| {
                    account!(add("transform_cache", 1));
                    Point {
                        x: &point.x + shear * &point.y,
                        y: point.y.clone(),
                    }
                })
                .clone()
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
        account!(add("segments", 1));
        account!(point_bits("scan_endpoints", &left));
        account!(point_bits("scan_endpoints", &right));
        if let Some(_value) = &slope {
            account!(bits("slope", _value));
        }
        account!(bits("intercept", &intercept));
        Self {
            left,
            right,
            slope,
            intercept,
        }
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
    account!(bits("common_denominator", &denominator));
    let margin = bound + Rational::from_integer(1.into());
    Rational::from_integer(1.into()) / (Rational::from_integer(256.into()) * margin.pow(5))
}

#[derive(Clone, Default, PartialEq, Eq)]
pub(crate) struct Event {
    pub(crate) starts: Vec<usize>,
    pub(crate) ends: Vec<usize>,
    pub(crate) points: Vec<usize>,
}

struct SweepState {
    segments: Vec<SweepSegment>,
    shear: Rational,
    queue: BTreeMap<Point, Event>,
    active: Status,
    groups: Vec<Group>,
    group_of: Vec<Option<usize>>,
    result: Vec<Intersection>,
    // Allocated lazily by recording; membership mutations invalidate it.
    groups_value: RefCell<Option<Arc<str>>>,
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
    account!(bits("shear", &shear));
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
    let segments: Vec<_> = {
        // Shared endpoints are transformed once. This initialization-local
        // cache has at most 2n entries and is dropped inside the timed sweep.
        let mut transformed = BTreeMap::new();
        let values = segments
            .iter()
            .map(|segment| SweepSegment::new(segment, &shear, &mut transformed))
            .collect();
        account!(delete("transform_cache", transformed.len()));
        values
    };
    let trace_segments = steps
        .as_ref()
        .map(|_| Arc::<str>::from(sweep_segments_value(&segments)));
    let (groups, group_of) = groups::initialize(&segments, cancelled)?;
    let mut queue: BTreeMap<Point, Event> = BTreeMap::new();
    for (id, segment) in segments.iter().enumerate() {
        if cancelled() {
            return None;
        }
        account!(access("segments", 1));
        account!(access("queue", if segment.slope.is_none() { 1 } else { 2 }));
        account!(add(
            "event_metadata",
            if segment.slope.is_none() { 1 } else { 2 }
        ));
        if segment.slope.is_none() {
            queue
                .entry(segment.left.clone())
                .or_insert_with(|| {
                    account!(add("queue", 1));
                    Event::default()
                })
                .points
                .push(id);
        } else {
            queue
                .entry(segment.left.clone())
                .or_insert_with(|| {
                    account!(add("queue", 1));
                    Event::default()
                })
                .starts
                .push(id);
            queue
                .entry(segment.right.clone())
                .or_insert_with(|| {
                    account!(add("queue", 1));
                    Event::default()
                })
                .ends
                .push(id);
        }
    }
    let mut state = SweepState {
        segments,
        shear,
        queue,
        active: Status::default(),
        groups,
        group_of,
        result: Vec::new(),
        groups_value: RefCell::new(None),
    };

    let capture = RefCell::new(TraceCapture::default());
    if let Some(steps) = &mut steps {
        let mut initial = SweepStep::capture(
            "initial",
            None,
            &state.queue,
            &[],
            &state.result,
            &[],
            &[],
            input_value.as_ref().expect("tracing captures input"),
            &capture,
        );
        initial
            .execution
            .context
            .locals
            .retain(|v| v.name != "active");
        initial
            .execution
            .context
            .locals
            .extend(observation::status_bindings(&state));
        initial.sweep_context(
            trace_segments.as_ref().expect("trace segments"),
            &state.shear,
        );
        steps.push(initial);
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
            capture: &capture,
            frames: Vec::new(),
        };
        let Some(take::TakenEvent {
            point,
            event,
            first_step,
        }) = take::take(&mut state, &mut recording)
        else {
            break;
        };
        recording.observe(&state, &point, 1, "micro", || {
            (
                vec![],
                vec![Variable::available("event", "Event", event_value(&event))],
            )
        })?;
        let located = classify::locate(&mut state, &point, &event, &mut recording)?;
        recording.observe(&state, &point, 2, "micro", || {
            (
                vec![],
                vec![Variable::available(
                    "incident_groups",
                    "Vec<GroupId>",
                    format!("{:?}", located.groups),
                )],
            )
        })?;
        record::record(&mut state, &point, &event, &located.groups, &mut recording)?;
        let participants = recording.steps.as_ref().map(|_| {
            let mut starts = event.starts.clone();
            starts.extend(&event.points);
            starts.sort_unstable();
            let mut ends = event.ends.clone();
            ends.extend(&event.points);
            ends.sort_unstable();
            let passes = located
                .groups
                .iter()
                .flat_map(|&g| &state.groups[g].members)
                .copied()
                .filter(|&id| state.segments[id].left < point && point < state.segments[id].right)
                .collect();
            (starts, ends, passes)
        });
        recording.observe(&state, &point, 3, "micro", || {
            (
                vec![],
                vec![Variable::available(
                    "incident_groups",
                    "Vec<GroupId>",
                    format!("{:?}", located.groups),
                )],
            )
        })?;
        let inserted =
            activity::update(&mut state, &point, &event, &located.groups, &mut recording)?;
        recording.observe(&state, &point, 4, "micro", || {
            (
                vec![],
                vec![Variable::available(
                    "inserted",
                    "Vec<GroupId>",
                    format!("{inserted:?}"),
                )],
            )
        })?;
        let checked = neighbors::check(
            &mut state,
            &point,
            &inserted,
            located.outside,
            &mut recording,
        )?;
        recording.observe(&state, &point, 5, "micro", || {
            (
                vec![],
                vec![Variable::absent("inserted", "Vec<GroupId>", "unavailable")],
            )
        })?;
        account!(delete(
            "event_metadata",
            event.starts.len() + event.ends.len() + event.points.len()
        ));
        account!(delete("incident_list", located.groups.len()));
        account!(delete("inserted_list", inserted.len()));
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
    account!(clear("segments"));
    account!(clear("groups"));
    account!(clear("group_of"));
    account!(clear("height_cache"));
    Some(SweepOutcome {
        intersections: state.result,
        shear: state.shear,
    })
}
