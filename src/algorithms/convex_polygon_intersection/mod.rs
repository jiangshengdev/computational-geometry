//! Exact closed-region intersection by Edge Chasing.
//!
//! Advancement follows O'Rourke, *Computational Geometry in C*, second edition,
//! §7.6, Code 7.17. The author's [code distribution](https://www.science.smith.edu/~jorourke/books/ftp.html)
//! leaves containment unimplemented; here exact containment precedes chasing.
//! Same-direction shared edges contribute candidates, whereas opposite-direction
//! shared edges constrain the entire intersection to their supporting line.
//! See CNB #165 for the source audit and the complete contract.

mod polygon;
pub use polygon::{ConvexPolygon, ConvexPolygonError};

use crate::geometry::orientation;
use crate::{Geometry, Point, Rational, Segment, brute_force_intersections, convex_hull};

/// The complete intersection of two closed convex regions.
///
/// Results are canonical: segment endpoints are lexicographically increasing;
/// polygon vertices follow [`ConvexPolygon::vertices`]. Thus `Eq` compares
/// geometric results directly, including after swapping the two inputs.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ConvexPolygonIntersection {
    Empty,
    Point(Point),
    /// A nonzero closed segment, with `start < end`.
    Segment {
        start: Point,
        end: Point,
    },
    /// A convex region with positive area.
    Polygon(ConvexPolygon),
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Inside {
    Unknown,
    P,
    Q,
}

/// Construct the exact intersection of two validated, positive-area polygons.
///
/// No service, floating-point tolerance, or input hull construction is involved.
/// Boundary contacts remain points or segments. Containment includes touching
/// and equality. Inputs are not modified, and may be reused across calls.
///
/// For n and m canonical vertices, containment takes O(n log m + m log n)
/// geometric operations. Edge Chasing advances O(n+m) times, collecting
/// k=O(n+m) candidates. Andrew normalization of those **output** candidates
/// takes O(k log k) operations. Storage is O(n+m). This whole call is therefore
/// not claimed to be linear. [`ConvexPolygon::new`] separately takes O(n²)
/// operations. Arithmetic, comparisons and copies have arbitrary-precision
/// costs depending on operand bit lengths; none are constant-time bit costs.
///
/// ```
/// use computational_geometry::{ConvexPolygon, ConvexPolygonIntersection, Point,
///     Rational, convex_polygon_intersection};
/// let points: Vec<_> = [(0, 0), (2, 0), (0, 2)].into_iter().map(|(x, y)| Point {
///     x: Rational::from_integer(x.into()), y: Rational::from_integer(y.into()),
/// }).collect();
/// let p = ConvexPolygon::new(&points)?;
/// assert_eq!(convex_polygon_intersection(&p, &p), ConvexPolygonIntersection::Polygon(p));
/// # Ok::<(), computational_geometry::ConvexPolygonError>(())
/// ```
pub fn convex_polygon_intersection(
    p: &ConvexPolygon,
    q: &ConvexPolygon,
) -> ConvexPolygonIntersection {
    if p.vertices().iter().all(|point| q.contains(point)) {
        return ConvexPolygonIntersection::Polygon(p.clone());
    }
    if q.vertices().iter().all(|point| p.contains(point)) {
        return ConvexPolygonIntersection::Polygon(q.clone());
    }

    let p = p.vertices();
    let q = q.vertices();
    let (mut a, mut b, mut advances_p, mut advances_q) = (0, 0, 0, 0);
    let mut inside = Inside::Unknown;
    let mut first_crossing = true;
    let mut candidates = Vec::new();
    let zero = Rational::from_integer(0.into());
    loop {
        let pa = &p[(a + p.len() - 1) % p.len()];
        let pb = &p[a];
        let qa = &q[(b + q.len() - 1) % q.len()];
        let qb = &q[b];
        let ax = &pb.x - &pa.x;
        let ay = &pb.y - &pa.y;
        let bx = &qb.x - &qa.x;
        let by = &qb.y - &qa.y;
        let cross = &ax * &by - &ay * &bx;
        let a_in_b = orientation(qa, qb, pb);
        let b_in_a = orientation(pa, pb, qb);
        // Reuse the existing exact closed-segment primitive at fixed size.
        // Its pair identity is intentionally not part of the region result.
        let intersections = brute_force_intersections(&[
            Segment {
                start: pa.clone(),
                end: pb.clone(),
            },
            Segment {
                start: qa.clone(),
                end: qb.clone(),
            },
        ]);
        for intersection in intersections {
            if cross == zero && &ax * &bx + &ay * &by < zero {
                return match intersection.geometry {
                    Geometry::Point(point) => ConvexPolygonIntersection::Point(point),
                    Geometry::Overlap { start, end } => {
                        ConvexPolygonIntersection::Segment { start, end }
                    }
                };
            }
            match intersection.geometry {
                Geometry::Point(point) => {
                    candidates.push(point);
                    if cross != zero {
                        if first_crossing {
                            advances_p = 0;
                            advances_q = 0;
                            first_crossing = false;
                        }
                        if a_in_b > zero {
                            inside = Inside::P;
                        } else if b_in_a > zero {
                            inside = Inside::Q;
                        }
                    }
                }
                Geometry::Overlap { start, end } => {
                    candidates.extend([start, end]);
                }
            }
        }
        if cross == zero && a_in_b < zero && b_in_a < zero {
            return ConvexPolygonIntersection::Empty;
        }
        let collinear = cross == zero && a_in_b == zero && b_in_a == zero;
        let advance_p = if collinear {
            inside != Inside::P
        } else if cross >= zero {
            b_in_a > zero
        } else {
            a_in_b <= zero
        };
        if advance_p {
            if !collinear && inside == Inside::P {
                candidates.push(pb.clone());
            }
            a = (a + 1) % p.len();
            advances_p += 1;
        } else {
            if !collinear && inside == Inside::Q {
                candidates.push(qb.clone());
            }
            b = (b + 1) % q.len();
            advances_q += 1;
        }
        // Each iteration advances at least one boundary. Reset at most once;
        // stop after both complete a circuit or either completes two circuits.
        if (advances_p >= p.len() && advances_q >= q.len())
            || advances_p.saturating_sub(p.len()) >= p.len()
            || advances_q.saturating_sub(q.len()) >= q.len()
        {
            break;
        }
    }
    let vertices = convex_hull(&candidates);
    match vertices.as_slice() {
        [] => ConvexPolygonIntersection::Empty,
        [point] => ConvexPolygonIntersection::Point(point.clone()),
        [start, end] => ConvexPolygonIntersection::Segment {
            start: start.clone(),
            end: end.clone(),
        },
        _ => ConvexPolygonIntersection::Polygon(ConvexPolygon::from_canonical(vertices)),
    }
}
