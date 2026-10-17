//! Exact sweep state and its execution path.
use super::teaching::*;
use super::trace_publication;

mod activity;
mod classify;
mod neighbors;
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
            incident,
            participants,
        } = classified;
        let update = activity::update(&mut state, &point, incident, &mut recording)?;
        let checked = neighbors::check(&mut state, &point, update, &mut recording)?;
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
