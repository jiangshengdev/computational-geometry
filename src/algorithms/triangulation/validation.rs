use std::collections::BTreeSet;

use super::status::Status;
use super::{Boundary, EventSide, Point, TriangulationError, zero};

pub(super) fn normalize(input: &[Point]) -> Result<Boundary<'_>, TriangulationError> {
    let count = if input.len() > 1 && input.first() == input.last() {
        input.len() - 1
    } else {
        input.len()
    };
    if count < 3 {
        return Err(TriangulationError::TooFewVertices);
    }
    let mut distinct = BTreeSet::new();
    let mut heights = BTreeSet::new();
    for point in &input[..count] {
        if !distinct.insert(point) {
            return Err(TriangulationError::RepeatedVertex);
        }
        if !heights.insert(&point.y) {
            return Err(TriangulationError::UnsupportedDegeneracy);
        }
    }
    let mut boundary = Boundary {
        points: input[..count].iter().collect(),
        original: (0..count).collect(),
        events: (0..count).collect(),
    };
    let area = (0..count).fold(zero(), |area, i| {
        let a = boundary.points[i];
        let b = boundary.points[boundary.next(i)];
        area + &a.x * &b.y - &a.y * &b.x
    });
    if area == zero() {
        return Err(TriangulationError::ZeroArea);
    }
    if area < zero() {
        boundary.points.reverse();
        boundary.original.reverse();
    }
    for i in 0..count {
        if boundary.turn(boundary.prev(i), i, boundary.next(i)) == zero() {
            return Err(TriangulationError::UnsupportedDegeneracy);
        }
    }
    boundary
        .events
        .sort_unstable_by(|&a, &b| boundary.points[b].y.cmp(&boundary.points[a].y));
    Ok(boundary)
}

/// Shamos-Hoey decision sweep: check complete intersections only for newly
/// neighboring edges. Stop on the first forbidden intersection, so undetected
/// crossings never invalidate the active ordering before an event is reached.
pub(super) fn check_simple(boundary: &Boundary<'_>) -> Result<(), TriangulationError> {
    let mut status = Status::default();
    for &vertex in &boundary.events {
        let y = &boundary.points[vertex].y;
        let incident = [boundary.prev(vertex), vertex];
        let above = |a, b| boundary.edge_order(a, b, y, EventSide::Above);
        for edge in incident {
            let other = if edge == vertex {
                boundary.next(vertex)
            } else {
                edge
            };
            if boundary.above(other, vertex) {
                let (left, right) = status.neighbors(edge, &above);
                status.remove(edge, &above);
                check_pair(boundary, left, right)?;
            }
        }
        let below = |a, b| boundary.edge_order(a, b, y, EventSide::Below);
        for edge in incident {
            let other = if edge == vertex {
                boundary.next(vertex)
            } else {
                edge
            };
            if boundary.above(vertex, other) {
                status.insert(edge, &below);
                let (left, right) = status.neighbors(edge, &below);
                check_pair(boundary, left, Some(edge))?;
                check_pair(boundary, Some(edge), right)?;
            }
        }
    }
    Ok(())
}

fn check_pair(
    boundary: &Boundary<'_>,
    a: Option<usize>,
    b: Option<usize>,
) -> Result<(), TriangulationError> {
    let (Some(a), Some(b)) = (a, b) else {
        return Ok(());
    };
    // Consecutive collinearity was rejected before this sweep, hence adjacent
    // edges have exactly their permitted shared endpoint in common.
    if a == b || boundary.next(a) == b || boundary.next(b) == a {
        return Ok(());
    }
    let a1 = boundary.next(a);
    let b1 = boundary.next(b);
    let ab0 = boundary.turn(a, a1, b);
    let ab1 = boundary.turn(a, a1, b1);
    let ba0 = boundary.turn(b, b1, a);
    let ba1 = boundary.turn(b, b1, a1);
    let separates = |first: &super::Rational, second: &super::Rational| {
        (first > &zero() && second > &zero()) || (first < &zero() && second < &zero())
    };
    if separates(&ab0, &ab1) || separates(&ba0, &ba1) {
        return Ok(());
    }
    let overlaps =
        |a: &super::Rational, b: &super::Rational, c: &super::Rational, d: &super::Rational| {
            a.min(b) <= c.max(d) && c.min(d) <= a.max(b)
        };
    let [p, q, r, s] = [a, a1, b, b1].map(|i| boundary.points[i]);
    if overlaps(&p.x, &q.x, &r.x, &s.x) && overlaps(&p.y, &q.y, &r.y, &s.y) {
        Err(TriangulationError::SelfIntersection)
    } else {
        Ok(())
    }
}
