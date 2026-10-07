use std::collections::BTreeMap;

use crate::{Geometry, Intersection, Point, Rational, Segment};

fn cross(ax: &Rational, ay: &Rational, bx: &Rational, by: &Rational) -> Rational {
    ax * by - ay * bx
}

/// Independently enumerate every intersecting unordered pair of input indices.
///
/// Accepts the same normalized, exact rational closed segments as
/// [crate::intersections], including duplicate and zero-length inputs. Each
/// nonempty intersection appears once as a point or complete overlap interval.
/// Result order and interval endpoint order are not part of the contract.
///
/// Solves p + t*r = q + u*s with determinants, independently of the BO sweep.
/// Performs n(n-1)/2 pair tests; collecting k results in a tree costs
/// O(k log(k+1)) comparisons and converting to the returned vector costs O(k).
/// Storage is O(k). These counts exclude arbitrary-precision arithmetic and
/// coordinate copying costs, which depend on operand bit lengths.
pub fn brute_force_intersections(segments: &[Segment]) -> Vec<Intersection> {
    let zero = Rational::from_integer(0.into());
    let one = Rational::from_integer(1.into());
    let mut expected = BTreeMap::new();
    for (i, a) in segments.iter().enumerate() {
        for (j, b) in segments.iter().enumerate().skip(i + 1) {
            if a.start == a.end || b.start == b.end {
                let (p, line) = if a.start == a.end {
                    (&a.start, b)
                } else {
                    (&b.start, a)
                };
                // Collinearity plus the closed axis-aligned bounds also works
                // when line itself is a point; no slope or shear is involved.
                if cross(
                    &(&line.end.x - &line.start.x),
                    &(&line.end.y - &line.start.y),
                    &(&p.x - &line.start.x),
                    &(&p.y - &line.start.y),
                ) == zero
                    && (&line.start.x).min(&line.end.x) <= &p.x
                    && &p.x <= (&line.start.x).max(&line.end.x)
                    && (&line.start.y).min(&line.end.y) <= &p.y
                    && &p.y <= (&line.start.y).max(&line.end.y)
                {
                    expected.insert([i, j], Geometry::Point(p.clone()));
                }
                continue;
            }
            let rx = &a.end.x - &a.start.x;
            let ry = &a.end.y - &a.start.y;
            let sx = &b.end.x - &b.start.x;
            let sy = &b.end.y - &b.start.y;
            let qx = &b.start.x - &a.start.x;
            let qy = &b.start.y - &a.start.y;
            let determinant = cross(&rx, &ry, &sx, &sy);
            if determinant == zero {
                if cross(&qx, &qy, &rx, &ry) == zero {
                    // Lexicographic projection preserves order on any line,
                    // including a vertical one. Preserve the complete pairwise
                    // interval independently of all other input segments.
                    let low = (&a.start).min(&a.end).max((&b.start).min(&b.end));
                    let high = (&a.start).max(&a.end).min((&b.start).max(&b.end));
                    if low < high {
                        expected.insert(
                            [i, j],
                            Geometry::Overlap {
                                start: low.clone(),
                                end: high.clone(),
                            },
                        );
                    }
                    if low == high {
                        expected.insert([i, j], Geometry::Point(low.clone()));
                    }
                }
                continue;
            }
            let t = cross(&qx, &qy, &sx, &sy) / &determinant;
            let u = cross(&qx, &qy, &rx, &ry) / determinant;
            if zero <= t && t <= one && zero <= u && u <= one {
                expected.insert(
                    [i, j],
                    Geometry::Point(Point {
                        x: &a.start.x + &t * rx,
                        y: &a.start.y + &t * ry,
                    }),
                );
            }
        }
    }
    expected
        .into_iter()
        .map(|(segments, geometry)| Intersection { segments, geometry })
        .collect()
}
