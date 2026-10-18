//! Exact Andrew monotone-chain convex hulls.

use crate::geometry::orientation;
use crate::{Point, Rational};

/// Return the convex hull vertices of an exact planar point set.
///
/// Coordinates are compared and turns are evaluated with arbitrary-precision
/// rational arithmetic, without floating-point approximations or tolerances.
/// Equal coordinates are merged; interior points and collinear intermediate
/// points on hull edges are excluded. The input slice is not modified.
///
/// A nondegenerate hull starts at the lexicographically smallest point (x,
/// then y), runs counterclockwise, and does not repeat its first vertex.
/// Empty input returns an empty vector; a single distinct point returns that
/// point. Two distinct points or an entirely collinear set return the two
/// extreme endpoints in lexicographic order. Input order and duplicate
/// coordinates do not affect the result, which contains coordinates, not indices.
///
/// Andrew's algorithm sorts and deduplicates the points, then scans each way.
/// For n input points, it uses O(n log n) comparison and arithmetic operations
/// and O(n) storage. Arbitrary-precision operation and coordinate-copying costs
/// depend on operand bit lengths; these are not constant-time bit operations.
pub fn convex_hull(points: &[Point]) -> Vec<Point> {
    let mut sorted: Vec<_> = points.iter().collect();
    sorted.sort_unstable();
    sorted.dedup();
    if sorted.len() <= 1 {
        return sorted.into_iter().cloned().collect();
    }

    let mut lower = chain(sorted.iter().copied());
    let mut upper = chain(sorted.iter().rev().copied());
    // Each extreme endpoint belongs to both chains; emit it only once.
    lower.pop();
    upper.pop();
    lower.into_iter().chain(upper).cloned().collect()
}

fn chain<'a>(points: impl Iterator<Item = &'a Point>) -> Vec<&'a Point> {
    let mut hull: Vec<&Point> = Vec::new();
    let zero = Rational::from_integer(0.into());
    for point in points {
        while hull.len() >= 2 {
            let a = hull[hull.len() - 2];
            let b = hull[hull.len() - 1];
            let turn = orientation(a, b, point);
            if turn > zero {
                break;
            }
            hull.pop();
        }
        hull.push(point);
    }
    hull
}
