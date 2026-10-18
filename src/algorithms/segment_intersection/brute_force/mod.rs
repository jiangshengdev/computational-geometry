use std::collections::BTreeMap;

use crate::{Geometry, Intersection, Point, Rational, Segment};

struct Direction {
    x: Rational,
    y: Rational,
    x_is_zero: bool,
    y_is_zero: bool,
}

impl Direction {
    /// Compute (ax, ay) crossed with this precomputed direction.
    fn cross_from(&self, ax: &Rational, ay: &Rational) -> Rational {
        if self.x_is_zero {
            ax * &self.y
        } else if self.y_is_zero {
            -(ay * &self.x)
        } else {
            ax * &self.y - ay * &self.x
        }
    }
}

/// Independently enumerate every intersecting unordered pair of input indices.
///
/// Accepts the same normalized, exact rational closed segments as
/// [crate::intersections], including duplicate and zero-length inputs. Each
/// nonempty intersection appears once as a point or complete overlap interval.
/// Result order and interval endpoint order are not part of the contract.
///
/// Solves p + t*r = q + u*s with determinants, independently of the BO sweep.
/// Precomputes n direction vectors and performs n(n-1)/2 pair tests;
/// collecting k results in a tree costs
/// O(k log(k+1)) comparisons and converting to the returned vector costs O(k).
/// Storage is O(n+k). These counts exclude arbitrary-precision arithmetic and
/// coordinate copying costs, which depend on operand bit lengths.
pub fn brute_force_intersections(segments: &[Segment]) -> Vec<Intersection> {
    let zero = Rational::from_integer(0.into());
    let one = Rational::from_integer(1.into());
    let directions: Vec<_> = segments
        .iter()
        .map(|segment| Direction {
            x: &segment.end.x - &segment.start.x,
            y: &segment.end.y - &segment.start.y,
            x_is_zero: segment.end.x == segment.start.x,
            y_is_zero: segment.end.y == segment.start.y,
        })
        .collect();
    let mut expected = BTreeMap::new();
    for (i, a) in segments.iter().enumerate() {
        let r = &directions[i];
        for (j, b) in segments.iter().enumerate().skip(i + 1) {
            let s = &directions[j];
            if (r.x_is_zero && r.y_is_zero) || (s.x_is_zero && s.y_is_zero) {
                let (p, line, direction) = if r.x_is_zero && r.y_is_zero {
                    (&a.start, b, s)
                } else {
                    (&b.start, a, r)
                };
                // Collinearity plus the closed axis-aligned bounds also works
                // when line itself is a point; no slope or shear is involved.
                // Reversing the cross-product operands preserves its zero test.
                if direction.cross_from(&(&p.x - &line.start.x), &(&p.y - &line.start.y)) == zero
                    && (&line.start.x).min(&line.end.x) <= &p.x
                    && &p.x <= (&line.start.x).max(&line.end.x)
                    && (&line.start.y).min(&line.end.y) <= &p.y
                    && &p.y <= (&line.start.y).max(&line.end.y)
                {
                    expected.insert([i, j], Geometry::Point(p.clone()));
                }
                continue;
            }
            let qx = &b.start.x - &a.start.x;
            let qy = &b.start.y - &a.start.y;
            let determinant = s.cross_from(&r.x, &r.y);
            if determinant == zero {
                if r.cross_from(&qx, &qy) == zero {
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
            let t = s.cross_from(&qx, &qy) / &determinant;
            let u = r.cross_from(&qx, &qy) / determinant;
            if zero <= t && t <= one && zero <= u && u <= one {
                expected.insert(
                    [i, j],
                    Geometry::Point(Point {
                        x: &a.start.x + &t * &r.x,
                        y: &a.start.y + &t * &r.y,
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
