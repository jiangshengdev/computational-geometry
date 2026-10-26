use std::collections::BTreeSet;

use super::status::Status;
use super::{Boundary, EventSide, Point, TriangulationError, zero};

pub(super) fn normalize(input: &[Point]) -> Result<Boundary, TriangulationError> {
    let count = if input.len() > 1 && input.first() == input.last() {
        input.len() - 1
    } else {
        input.len()
    };
    if count < 3 {
        return Err(TriangulationError::TooFewVertices);
    }
    let mut distinct = BTreeSet::new();
    for point in &input[..count] {
        if !distinct.insert(point) {
            return Err(TriangulationError::RepeatedVertex);
        }
    }
    let mut boundary = Boundary {
        points: input[..count].to_vec(),
        original: (0..count).collect(),
        events: (0..count).collect(),
    };
    let area = (0..count).fold(zero(), |area, i| {
        let a = &boundary.points[i];
        let b = &boundary.points[boundary.next(i)];
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
            let prev = &boundary.points[boundary.prev(i)];
            let point = &boundary.points[i];
            let next = &boundary.points[boundary.next(i)];
            if &point.x < (&prev.x).min(&next.x)
                || &point.x > (&prev.x).max(&next.x)
                || &point.y < (&prev.y).min(&next.y)
                || &point.y > (&prev.y).max(&next.y)
            {
                return Err(TriangulationError::SelfIntersection);
            }
        }
    }
    separate_heights(&mut boundary.points);
    boundary
        .events
        .sort_unstable_by(|&a, &b| boundary.points[b].y.cmp(&boundary.points[a].y));
    Ok(boundary)
}

/// Choose an exact shear y' = y + epsilon*x. If d is the minimum positive
/// height gap and w the x range, epsilon = d/(2*(w+1)) makes every change of a
/// height difference smaller than d/2. Unequal original heights keep their
/// order; equal heights are separated by distinct x coordinates. The matrix
/// has determinant one, so no geometric predicate or area changes.
fn separate_heights(points: &mut [Point]) {
    let heights: BTreeSet<_> = points.iter().map(|point| point.y.clone()).collect();
    if heights.len() == points.len() {
        return;
    }
    let mut gaps = heights
        .iter()
        .zip(heights.iter().skip(1))
        .map(|(a, b)| b - a);
    let gap = gaps
        .next()
        .map(|first| gaps.fold(first, std::cmp::min))
        .expect("nonzero area requires distinct heights");
    let min_x = points
        .iter()
        .map(|point| &point.x)
        .min()
        .expect("nonempty boundary");
    let max_x = points
        .iter()
        .map(|point| &point.x)
        .max()
        .expect("nonempty boundary");
    let one = super::Rational::from_integer(1.into());
    let two = super::Rational::from_integer(2.into());
    let epsilon = gap / (two * (max_x - min_x + one));
    for point in points {
        point.y += &epsilon * &point.x;
    }
}

/// Shamos-Hoey decision sweep: check complete intersections only for newly
/// neighboring edges. Stop on the first forbidden intersection, so undetected
/// crossings never invalidate the active ordering before an event is reached.
pub(super) fn check_simple(boundary: &Boundary) -> Result<(), TriangulationError> {
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
    boundary: &Boundary,
    a: Option<usize>,
    b: Option<usize>,
) -> Result<(), TriangulationError> {
    let (Some(a), Some(b)) = (a, b) else {
        return Ok(());
    };
    // Collinear backtracking was rejected before this sweep, hence adjacent
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
    let [p, q, r, s] = [a, a1, b, b1].map(|i| &boundary.points[i]);
    if overlaps(&p.x, &q.x, &r.x, &s.x) && overlaps(&p.y, &q.y, &r.y, &s.y) {
        Err(TriangulationError::SelfIntersection)
    } else {
        Ok(())
    }
}
