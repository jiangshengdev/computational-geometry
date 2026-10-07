//! Exact Bentley–Ottmann segment intersections, currently for general position.
//!
//! This increment supports nonvertical, nonzero segments with distinct x
//! coordinates for every endpoint and intersection, no endpoint contacts,
//! no collinear overlaps and no three segments meeting at one point.
//! Empty and singleton collections are supported within this domain.
//! These are current preconditions, not restrictions on the eventual #8 API.
//! Degeneracy support is not yet complete: detected violations return an error,
//! but this function does not validate every precondition (notably collinearity).
//!
//! Only neighboring active segments are tested for future intersections. An
//! ordered event queue drives insertion, removal and crossing swaps. The active
//! sequence uses a vector: with n inputs and k intersecting pairs, there are
//! O(n + k) events, O((n + k) * n) sequence work and O((n + k) * log(n + k))
//! queue work, with O(n + k) storage including output. These counts exclude the
//! cost of arbitrary-precision rational arithmetic and comparisons, which
//! depends on operand bit lengths; this is not an O((n + k) log n) claim.

use std::collections::{BTreeMap, btree_map::Entry};
use std::fmt;

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
    pub point: Point,
}

/// An encountered configuration outside the current general-position domain.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UnsupportedDegeneracy;

impl fmt::Display for UnsupportedDegeneracy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("this increment requires segments in general position; see crate documentation")
    }
}

impl std::error::Error for UnsupportedDegeneracy {}

struct SweepSegment {
    left: Point,
    right: Point,
    slope: Rational,
    intercept: Rational,
}

impl SweepSegment {
    fn new(segment: &Segment) -> Result<Self, UnsupportedDegeneracy> {
        let (left, right) = if segment.start.x < segment.end.x {
            (&segment.start, &segment.end)
        } else {
            (&segment.end, &segment.start)
        };
        if left.x == right.x {
            return Err(UnsupportedDegeneracy);
        }
        let slope = (&right.y - &left.y) / (&right.x - &left.x);
        let intercept = &left.y - &slope * &left.x;
        Ok(Self {
            left: left.clone(),
            right: right.clone(),
            slope,
            intercept,
        })
    }

    fn y_at(&self, x: &Rational) -> Rational {
        &self.slope * x + &self.intercept
    }
}

#[derive(PartialEq, Eq)]
enum Event {
    Start(usize),
    End(usize),
    Crossing { pair: [usize; 2], point: Point },
}

fn enqueue(
    queue: &mut BTreeMap<Rational, Event>,
    x: Rational,
    event: Event,
) -> Result<(), UnsupportedDegeneracy> {
    match queue.entry(x) {
        Entry::Vacant(entry) => {
            entry.insert(event);
        }
        Entry::Occupied(entry) if entry.get() == &event => {}
        Entry::Occupied(_) => return Err(UnsupportedDegeneracy),
    }
    Ok(())
}

fn schedule_neighbors(
    active: &[usize],
    lower: usize,
    segments: &[SweepSegment],
    x: &Rational,
    queue: &mut BTreeMap<Rational, Event>,
) -> Result<(), UnsupportedDegeneracy> {
    let Some(neighbors) = active.get(lower..lower + 2) else {
        return Ok(());
    };
    let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);
    if a.slope == b.slope {
        return Ok(());
    }
    let cross_x = (&b.intercept - &a.intercept) / (&a.slope - &b.slope);
    if cross_x <= *x
        || cross_x < a.left.x
        || cross_x > a.right.x
        || cross_x < b.left.x
        || cross_x > b.right.x
    {
        return Ok(());
    }
    let point = Point {
        y: a.y_at(&cross_x),
        x: cross_x.clone(),
    };
    let mut pair = [neighbors[0], neighbors[1]];
    pair.sort_unstable();
    enqueue(queue, cross_x, Event::Crossing { pair, point })
}

/// Return every intersecting input pair with its exact crossing point.
///
/// Input identity is the index in `segments`; results contain each unordered
/// pair once. Result order is not part of the contract. Coordinates must be
/// valid, normalized rationals (use `Rational::new` or `from_integer`, not
/// unchecked `new_raw`). See the crate documentation for the currently supported
/// input domain and cost. An error discards the partial result; `Ok` does not
/// certify that all general-position preconditions were met.
pub fn intersections(segments: &[Segment]) -> Result<Vec<Intersection>, UnsupportedDegeneracy> {
    let segments: Vec<_> = segments
        .iter()
        .map(SweepSegment::new)
        .collect::<Result<_, _>>()?;
    let mut queue = BTreeMap::new();
    for (id, segment) in segments.iter().enumerate() {
        enqueue(&mut queue, segment.left.x.clone(), Event::Start(id))?;
        enqueue(&mut queue, segment.right.x.clone(), Event::End(id))?;
    }
    let mut active = Vec::new();
    let mut result = Vec::new();
    while let Some((x, event)) = queue.pop_first() {
        match event {
            Event::Start(id) => {
                let y = &segments[id].left.y;
                let position = match active
                    .binary_search_by(|&other: &usize| segments[other].y_at(&x).cmp(y))
                {
                    Ok(_) => return Err(UnsupportedDegeneracy),
                    Err(position) => position,
                };
                active.insert(position, id);
                if position > 0 {
                    schedule_neighbors(&active, position - 1, &segments, &x, &mut queue)?;
                }
                schedule_neighbors(&active, position, &segments, &x, &mut queue)?;
            }
            Event::End(id) => {
                let position = active
                    .iter()
                    .position(|&other| other == id)
                    .ok_or(UnsupportedDegeneracy)?;
                active.remove(position);
                if position > 0 {
                    schedule_neighbors(&active, position - 1, &segments, &x, &mut queue)?;
                }
            }
            Event::Crossing { pair, point } => {
                let first = active
                    .iter()
                    .position(|&id| id == pair[0])
                    .ok_or(UnsupportedDegeneracy)?;
                let second = active
                    .iter()
                    .position(|&id| id == pair[1])
                    .ok_or(UnsupportedDegeneracy)?;
                if first.abs_diff(second) != 1 {
                    return Err(UnsupportedDegeneracy);
                }
                let lower = first.min(second);
                active.swap(lower, lower + 1);
                result.push(Intersection {
                    segments: pair,
                    point,
                });
                if lower > 0 {
                    schedule_neighbors(&active, lower - 1, &segments, &x, &mut queue)?;
                }
                schedule_neighbors(&active, lower + 1, &segments, &x, &mut queue)?;
            }
        }
    }
    Ok(result)
}
