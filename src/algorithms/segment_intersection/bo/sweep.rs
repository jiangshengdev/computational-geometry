//! Exact sweep state and its execution path.
use super::teaching::*;

mod core;
mod groups;
mod queue;
mod recording;
use crate::{Intersection, Point, Rational, Segment};

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
    let coordinates = || {
        segments
            .iter()
            .flat_map(|s| [&s.start.x, &s.start.y, &s.end.x, &s.end.y])
    };
    // A common denominator D makes all endpoints integral.
    let mut denominator = Rational::from_integer(1.into());
    let mut height = Rational::from_integer(1.into());
    for coordinate in coordinates() {
        // Reduction supplies D/gcd(D,d), so repeated endpoint denominators do
        // not inflate D. This is lcm(D,d) without a second arithmetic library.
        let reduced = &denominator / Rational::from_integer(coordinate.denom().clone());
        denominator = Rational::from_integer(reduced.numer() * coordinate.denom());
        let numerator = Rational::from_integer(coordinate.numer().clone());
        height = height
            .max(numerator.clone())
            .max(-numerator)
            .max(Rational::from_integer(coordinate.denom().clone()));
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
    let integerized =
        Rational::from_integer(1.into()) / (Rational::from_integer(256.into()) * margin.pow(5));
    // A second bound avoids a huge common denominator for unrelated fractions.
    // If |numerator|, denominator <= H, homogeneous endpoint coordinates are
    // <= H^2, line coefficients <= 2H^4, and intersection coordinates <= 8H^8.
    // Cartesian event denominators are thus <= 8H^8, giving distinct x gap
    // >= 1/(64H^16). Segment-contained event y lies in [-H,H]. Therefore
    // 1/[256(H+1)^17] also preserves strict x order and breaks x ties by y.
    // Both bounds are valid; the larger coefficient has the smaller denominator.
    let homogeneous = Rational::from_integer(1.into())
        / (Rational::from_integer(256.into())
            * (height + Rational::from_integer(1.into())).pow(17));
    integerized.max(homogeneous)
}

#[derive(Default)]
pub(crate) struct Event {
    // Recording-only projection. Starts contain original input IDs; the core
    // queue owns coverage endpoints, point inputs and adjacency certificates.
    pub(crate) starts: Vec<usize>,
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
    input: &[Segment],
    emit: Option<&mut dyn FnMut(SweepTrace) -> bool>,
    cancelled: &dyn Fn() -> bool,
) -> Option<SweepOutcome> {
    if cancelled() {
        return None;
    }
    let shear = choose_shear(input);
    let segments: Vec<_> = input.iter().map(|s| SweepSegment::new(s, &shear)).collect();
    let mut recorder = recording::Recording::new(input, &segments, &shear, emit, cancelled);
    let intersections = core::run(&segments, &shear, &mut recorder, cancelled)?;
    Some(SweepOutcome {
        intersections,
        shear,
    })
}
