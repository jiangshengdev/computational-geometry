//! Exact Bentley–Ottmann intersections of closed segments.
//!
//! Endpoint contacts, multiway crossings, vertical segments and distinct events
//! at the same sweep coordinate are supported, including positive-length
//! overlaps and duplicate inputs. Zero-length inputs participate as points;
//! empty and singleton collections return no pairs.
//!
//! An invertible exact shear (x, y) -> (x + s*y, y) avoids vertical segments in
//! sweep coordinates; s is chosen from input directions, without enumerating
//! intersections. Point events are ordered lexicographically and group all
//! incident segments. Only adjacent active segments schedule future crossings;
//! pair enumeration is confined to segments incident at one event. Overlapping
//! pairs emit their full interval at its beginning, never fragments at later
//! endpoints or crossings. Coincident active segments retain separate identities.
//! Point inputs join their exact event but never enter the active sequence.
//! At a point inside an overlap group, all containing members participate:
//! point-member pairs are emitted while previously emitted member intervals
//! remain intact. Duplicate inputs retain their own pairs in mixed events too.
//!
//! With n inputs and k intersecting pairs, the number of events E is O(n + k).
//! Shear selection costs O(n log(n + 1)); vector status scans and updates cost
//! O(E*n), and incident-block sorting costs O(E*n*log(n + 1)). Queue work,
//! including initialization from all n inputs, costs O((n + E)*log(E + 1)).
//! For m incident segments, each event inspects O(m*m) pairs; overlapping pairs
//! can be inspected at multiple events (including point-input events), so the
//! conservative total bound for these inspections is O(E*n*n), not O(k).
//! There are k outputs.
//! Storage is O(n + k), including the output. These operation counts exclude the
//! cost of arbitrary-precision rational arithmetic and comparisons, which
//! depends on operand bit lengths; this is not an O((n + k) log n) claim.

use std::collections::{BTreeMap, BTreeSet};

pub mod http;

mod brute_force;
pub use brute_force::brute_force_intersections;

mod validation;
pub use validation::{DuplicatePair, GeometryMismatch, ValidationReport, validate_intersections};

/// Arbitrary-precision rational coordinates; no floating-point approximation.
pub use num_rational::BigRational as Rational;

/// An exact position in the plane.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Point {
    pub x: Rational,
    pub y: Rational,
}

/// A closed segment. Endpoint order does not determine input identity.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Segment {
    pub start: Point,
    pub end: Point,
}

/// One intersecting unordered pair of original input indices.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Intersection {
    /// Indices into the input slice, in increasing order.
    pub segments: [usize; 2],
    pub geometry: Geometry,
}

/// The complete mathematical intersection of a pair of closed segments.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Geometry {
    Point(Point),
    /// A nonzero closed interval. Endpoint presentation order is not a contract.
    Overlap {
        start: Point,
        end: Point,
    },
}

struct SweepSegment {
    left: Point,
    right: Point,
    // Points have no supporting line and are removed before status insertion.
    slope: Option<Rational>,
    intercept: Rational,
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
    let mut forbidden = BTreeSet::new();
    for segment in segments {
        let dy = &segment.end.y - &segment.start.y;
        if dy != Rational::from_integer(0.into()) {
            forbidden.insert((&segment.start.x - &segment.end.x) / dy);
        }
    }
    let mut shear = Rational::from_integer(0.into());
    // At most n forbidden values: one of 0..=n must be available.
    while forbidden.contains(&shear) {
        shear += Rational::from_integer(1.into());
    }
    shear
}

#[derive(Default)]
struct Event {
    // Ends and interior crossings are recovered from the active sequence at
    // this exact point, so a discovered crossing needs no stored pair identity.
    starts: Vec<usize>,
}

fn schedule_neighbors(
    active: &[usize],
    lower: usize,
    segments: &[SweepSegment],
    current: &Point,
    queue: &mut BTreeMap<Point, Event>,
) {
    let Some(neighbors) = active.get(lower..lower + 2) else {
        return;
    };
    let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);
    if a.slope == b.slope {
        return;
    }
    let cross_x = (&b.intercept - &a.intercept)
        / (a.slope.as_ref().expect("active segment has a slope")
            - b.slope.as_ref().expect("active segment has a slope"));
    if cross_x < a.left.x || cross_x > a.right.x || cross_x < b.left.x || cross_x > b.right.x {
        return;
    }
    let point = Point {
        y: a.y_at(&cross_x),
        x: cross_x,
    };
    if point > *current {
        queue.entry(point).or_default();
    }
}

/// Return every intersecting input pair with its exact point or full overlap.
///
/// Input identity is the index in `segments`; results contain each unordered
/// pair once. Result order is not part of the contract. Coordinates must be
/// valid, normalized rationals (use `Rational::new` or `from_integer`, not
/// unchecked `new_raw`). See the crate documentation for the currently supported
/// input domain and cost. Zero-length segments are accepted as points.
pub fn intersections(segments: &[Segment]) -> Vec<Intersection> {
    let shear = choose_shear(segments);
    let segments: Vec<_> = segments
        .iter()
        .map(|segment| SweepSegment::new(segment, &shear))
        .collect();
    let mut queue: BTreeMap<Point, Event> = BTreeMap::new();
    for (id, segment) in segments.iter().enumerate() {
        queue
            .entry(segment.left.clone())
            .or_default()
            .starts
            .push(id);
        queue.entry(segment.right.clone()).or_default();
    }
    let mut active: Vec<usize> = Vec::new();
    let mut result = Vec::new();
    while let Some((point, event)) = queue.pop_first() {
        let mut incident = event.starts;
        // Every active segment spans the current x. Recover the whole equal-y
        // block, including unscheduled participants in a multiway crossing.
        active.retain(|&id| {
            if segments[id].y_at(&point.x) == point.y {
                incident.push(id);
                false
            } else {
                true
            }
        });
        for (i, &a) in incident.iter().enumerate() {
            for &b in &incident[i + 1..] {
                let original = |p: &Point| Point {
                    x: &p.x - &shear * &p.y,
                    y: p.y.clone(),
                };
                let geometry = if segments[a].slope == segments[b].slope {
                    // Incident segments with equal slopes lie on the same line.
                    // Emit exactly at the later start, using both original ends
                    // rather than the next event (which may involve a third input).
                    let start = (&segments[a].left).max(&segments[b].left);
                    if start != &point {
                        continue;
                    }
                    let end = (&segments[a].right).min(&segments[b].right);
                    if start < end {
                        Geometry::Overlap {
                            start: original(start),
                            end: original(end),
                        }
                    } else {
                        Geometry::Point(original(start))
                    }
                } else {
                    Geometry::Point(original(&point))
                };
                result.push(Intersection {
                    segments: [a.min(b), a.max(b)],
                    geometry,
                });
            }
        }
        incident.retain(|&id| segments[id].right != point);
        incident.sort_by(|&a, &b| segments[a].slope.cmp(&segments[b].slope));
        // Equal-x events at different y remain separate. At the current y,
        // ascending slope is the order immediately after this event; other
        // equal-y blocks keep their pre-event order until their own event.
        let position = active.partition_point(|&id| segments[id].y_at(&point.x) < point.y);
        let inserted = incident.len();
        active.splice(position..position, incident);
        if position > 0 {
            schedule_neighbors(&active, position - 1, &segments, &point, &mut queue);
        }
        if inserted > 0 {
            schedule_neighbors(
                &active,
                position + inserted - 1,
                &segments,
                &point,
                &mut queue,
            );
        }
    }
    result
}
