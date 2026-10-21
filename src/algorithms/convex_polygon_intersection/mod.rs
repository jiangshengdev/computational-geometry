//! Exact closed-region intersection by Edge Chasing.
//!
//! Advancement follows O'Rourke, *Computational Geometry in C*, second edition,
//! §7.6, Code 7.17. The author's [code distribution](https://www.science.smith.edu/~jorourke/books/ftp.html)
//! leaves containment unimplemented; here exact containment precedes chasing.
//! Same-direction shared edges contribute candidates, whereas opposite-direction
//! shared edges constrain the entire intersection to their supporting line.
//! See CNB #165 for the source audit and the complete contract.

pub(crate) mod http;
mod polygon;
mod teaching;
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

#[derive(Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Inside {
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
    execute(p, q, &mut |_| true).expect("ordinary computation is never cancelled")
}

fn execute(
    p: &ConvexPolygon,
    q: &ConvexPolygon,
    observe: &mut impl FnMut(&teaching::State) -> bool,
) -> Option<ConvexPolygonIntersection> {
    use teaching::{Action, Boundary, Phase, Reason, State};
    let mut state = State::new();
    for (source, target, boundary) in [(p, q, Boundary::First), (q, p, Boundary::Second)] {
        let mut all_inside = true;
        for (vertex, point) in source.vertices().iter().enumerate() {
            let contained = target.contains(point);
            state.boundary = Some(boundary);
            state.vertex = Some(vertex);
            state.contained = Some(contained);
            state.emit(Action::Containment, observe)?;
            if !contained {
                all_inside = false;
                break;
            }
        }
        if all_inside {
            state.reason = Some(Reason::Contained);
            return state.finish(ConvexPolygonIntersection::Polygon(source.clone()), observe);
        }
    }
    state.phase = Phase::Chasing;
    state.boundary = None;
    state.vertex = None;
    state.contained = None;

    let p = p.vertices();
    let q = q.vertices();
    let (mut a, mut b, mut advances_p, mut advances_q) = (0, 0, 0, 0);
    let mut inside = Inside::Unknown;
    let mut first_crossing = true;
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
        state.edges = Some([
            [(a + p.len() - 1) % p.len(), a],
            [(b + q.len() - 1) % q.len(), b],
        ]);
        state.boundary = None;
        state.reason = None;
        state.added.clear();
        state.relation = Some(teaching::Relation {
            cross: cross.cmp(&zero).into(),
            first_side: a_in_b.cmp(&zero).into(),
            second_side: b_in_a.cmp(&zero).into(),
            contact: match intersections.first().map(|hit| &hit.geometry) {
                None => teaching::Contact::None,
                Some(Geometry::Point(_)) => teaching::Contact::Point,
                Some(Geometry::Overlap { .. }) => teaching::Contact::Overlap,
            },
        });
        state.emit(Action::Relation, observe)?;
        for intersection in intersections {
            if cross == zero && &ax * &bx + &ay * &by < zero {
                state.reason = Some(Reason::OppositeContact);
                state.emit(Action::Terminate, observe)?;
                let result = match intersection.geometry {
                    Geometry::Point(point) => ConvexPolygonIntersection::Point(point),
                    Geometry::Overlap { start, end } => {
                        ConvexPolygonIntersection::Segment { start, end }
                    }
                };
                return state.finish(result, observe);
            }
            match intersection.geometry {
                Geometry::Point(point) => {
                    state.added = vec![state.candidates.len()];
                    state.candidates.push(point);
                    state.reason = Some(Reason::Intersection);
                    state.emit(Action::Collect, observe)?;
                    state.added.clear();
                    if cross != zero {
                        let was_first = first_crossing;
                        let previous = inside;
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
                        state.inside = inside;
                        if was_first || previous != inside {
                            state.reason = Some(if was_first {
                                Reason::FirstCrossing
                            } else {
                                Reason::Crossing
                            });
                            state.emit(Action::Inside, observe)?;
                        }
                    }
                }
                Geometry::Overlap { start, end } => {
                    state.added = vec![state.candidates.len(), state.candidates.len() + 1];
                    state.candidates.extend([start, end]);
                    state.reason = Some(Reason::SharedEdge);
                    state.emit(Action::Collect, observe)?;
                    state.added.clear();
                }
            }
        }
        if cross == zero && a_in_b < zero && b_in_a < zero {
            state.reason = Some(Reason::SeparatedParallel);
            state.emit(Action::Terminate, observe)?;
            return state.finish(ConvexPolygonIntersection::Empty, observe);
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
                state.added = vec![state.candidates.len()];
                state.candidates.push(pb.clone());
                state.boundary = Some(Boundary::First);
                state.reason = Some(Reason::InteriorVertex);
                state.emit(Action::Collect, observe)?;
            }
            a = (a + 1) % p.len();
            advances_p += 1;
        } else {
            if !collinear && inside == Inside::Q {
                state.added = vec![state.candidates.len()];
                state.candidates.push(qb.clone());
                state.boundary = Some(Boundary::Second);
                state.reason = Some(Reason::InteriorVertex);
                state.emit(Action::Collect, observe)?;
            }
            b = (b + 1) % q.len();
            advances_q += 1;
        }
        state.added.clear();
        state.boundary = Some(if advance_p {
            Boundary::First
        } else {
            Boundary::Second
        });
        state.reason = Some(if collinear {
            Reason::CollinearOutside
        } else if cross >= zero {
            if advance_p {
                Reason::CrossLeftBInside
            } else {
                Reason::CrossLeftBOutside
            }
        } else if advance_p {
            Reason::CrossRightAOutside
        } else {
            Reason::CrossRightAInside
        });
        // The step shows the new active edges; relation still describes the decision's old pair.
        state.edges = Some([
            [(a + p.len() - 1) % p.len(), a],
            [(b + q.len() - 1) % q.len(), b],
        ]);
        state.emit(Action::Advance, observe)?;
        // Each iteration advances at least one boundary. Reset at most once;
        // stop after both complete a circuit or either completes two circuits.
        if (advances_p >= p.len() && advances_q >= q.len())
            || advances_p.saturating_sub(p.len()) >= p.len()
            || advances_q.saturating_sub(q.len()) >= q.len()
        {
            state.reason = Some(if advances_p >= p.len() && advances_q >= q.len() {
                Reason::BothCircuits
            } else if advances_p.saturating_sub(p.len()) >= p.len() {
                Reason::FirstTwoCircuits
            } else {
                Reason::SecondTwoCircuits
            });
            state.boundary = None;
            state.emit(Action::Terminate, observe)?;
            break;
        }
    }
    state.phase = Phase::Normalize;
    state.edges = None;
    state.relation = None;
    state.reason = Some(Reason::Candidates);
    state.emit(Action::Normalize, observe)?;
    let vertices = convex_hull(&state.candidates);
    let result = match vertices.as_slice() {
        [] => ConvexPolygonIntersection::Empty,
        [point] => ConvexPolygonIntersection::Point(point.clone()),
        [start, end] => ConvexPolygonIntersection::Segment {
            start: start.clone(),
            end: end.clone(),
        },
        _ => ConvexPolygonIntersection::Polygon(ConvexPolygon::from_canonical(vertices)),
    };
    state.finish(result, observe)
}
