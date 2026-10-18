mod support;

use computational_geometry::{Point, Rational, TriangulationError, triangulate};
use support::{assert_boundary_representations, assert_triangulation, point, polygon};

#[test]
fn triangulates_convex_concave_and_non_monotone_boundaries() {
    let cases = [
        polygon(&[(0, 0), (5, 1), (2, 4)]),
        polygon(&[(0, 0), (5, 1), (7, 4), (3, 7), (-2, 3)]),
        polygon(&[(0, 0), (5, 1), (2, 2), (5, 4), (-1, 5)]),
        // An invertible shear gives this U-shaped polygon distinct heights.
        // Its two upper arms require monotone decomposition.
        polygon(&[
            (0, 0),
            (6, 6),
            (6, 66),
            (4, 64),
            (4, 24),
            (2, 22),
            (2, 62),
            (0, 60),
        ]),
    ];
    for boundary in cases {
        assert_boundary_representations(&boundary);
    }
}

#[test]
fn preserves_fractional_geometry_beyond_float_precision() {
    let origin = Rational::from_integer(10.into()).pow(80);
    let unit = Rational::new(1.into(), 10.into()).pow(80);
    let input: Vec<_> = polygon(&[(0, 0), (5, 1), (2, 2), (5, 4), (-1, 5)])
        .into_iter()
        .map(|p| Point {
            x: &origin + p.x * &unit / Rational::from_integer(3.into()),
            y: -&origin + p.y * &unit / Rational::from_integer(7.into()),
        })
        .collect();
    assert_triangulation(&input);
}

#[test]
fn rejects_invalid_boundaries_instead_of_repairing_them() {
    let cases = [
        vec![],
        vec![point(0, 0)],
        polygon(&[(0, 0), (1, 1)]),
        polygon(&[(0, 0), (1, 1), (0, 0)]),
        polygon(&[(0, 0), (1, 1), (2, 2)]),
        polygon(&[(0, 0), (4, 1), (4, 1), (1, 5)]),
        polygon(&[(0, 0), (4, 1), (1, 5), (4, 1), (-1, 3)]),
        // Crossing, non-adjacent vertex/edge contact, and backtracking.
        polygon(&[(0, 0), (4, 5), (0, 4), (4, 1)]),
        polygon(&[(0, 0), (4, 4), (0, 5), (2, 2), (-1, 3)]),
        polygon(&[(0, 0), (4, 4), (2, 2), (5, 6), (-1, 7)]),
        // Only one final repeated start is an equivalent closure.
        polygon(&[(0, 0), (4, 1), (1, 5), (0, 0), (0, 0)]),
    ];
    for input in cases {
        let result: Result<Vec<[usize; 3]>, TriangulationError> = triangulate(&input);
        assert!(result.is_err(), "invalid boundary accepted: {input:?}");
    }
}

#[test]
fn preserves_horizontal_equal_height_and_collinear_boundary_vertices() {
    let cases = [
        polygon(&[(0, 0), (4, 0), (4, 3), (0, 3)]),
        polygon(&[
            (0, 0),
            (1, 0),
            (2, 0),
            (4, 0),
            (4, 1),
            (4, 3),
            (2, 3),
            (0, 3),
            (0, 1),
        ]),
        // Several horizontal plateaus and two concave corners at one height.
        polygon(&[
            (0, 0),
            (6, 0),
            (6, 6),
            (4, 6),
            (4, 4),
            (4, 2),
            (3, 2),
            (2, 2),
            (2, 4),
            (2, 6),
            (0, 6),
        ]),
        // Collinear vertices on both sides of a concave tip.
        polygon(&[(0, 0), (6, 0), (6, 6), (4, 4), (3, 3), (2, 4), (0, 6)]),
        // A flat top and bottom with collinear sloping chains.
        polygon(&[
            (0, 0),
            (2, 0),
            (3, 1),
            (4, 2),
            (3, 3),
            (2, 4),
            (0, 4),
            (-1, 3),
            (-2, 2),
            (-1, 1),
        ]),
    ];
    for boundary in cases {
        for fractional in [false, true] {
            let boundary: Vec<_> = boundary
                .iter()
                .map(|p| {
                    if fractional {
                        Point {
                            x: (&p.x + Rational::new(1.into(), 5.into()))
                                / Rational::from_integer(3.into()),
                            y: (&p.y - Rational::new(1.into(), 7.into()))
                                / Rational::from_integer(11.into()),
                        }
                    } else {
                        p.clone()
                    }
                })
                .collect();
            assert_boundary_representations(&boundary);
        }
    }
}

#[test]
fn rejects_horizontal_backtracking_overlaps_and_nonadjacent_contacts() {
    for input in [
        polygon(&[(0, 0), (4, 0), (2, 0), (5, 0), (5, 4), (0, 4)]),
        polygon(&[
            (0, 0),
            (6, 0),
            (6, 4),
            (2, 4),
            (2, 0),
            (4, 0),
            (4, 2),
            (0, 2),
        ]),
        polygon(&[(0, 0), (6, 0), (6, 4), (3, 0), (0, 4)]),
    ] {
        assert_eq!(
            triangulate(&input),
            Err(TriangulationError::SelfIntersection)
        );
    }
}

#[test]
fn classifies_small_boundary_permutations_against_all_edge_pairs() {
    use computational_geometry::{Geometry, Segment, brute_force_intersections};

    // Fixed five-point set exercises equal-height events, collinear diagonal
    // contacts and changing sweep neighbors without randomized input or timing.
    fn visit_permutations(input: &mut [Point], position: usize) {
        if position != input.len() {
            for index in position..input.len() {
                input.swap(position, index);
                visit_permutations(input, position + 1);
                input.swap(position, index);
            }
            return;
        }
        let n = input.len();
        let edges: Vec<_> = (0..n)
            .map(|index| Segment {
                start: input[index].clone(),
                end: input[(index + 1) % n].clone(),
            })
            .collect();
        let simple = brute_force_intersections(&edges).iter().all(|intersection| {
            let [a, b] = intersection.segments;
            let shared = if (a + 1) % n == b {
                Some(&input[b])
            } else if (b + 1) % n == a {
                Some(&input[a])
            } else {
                None
            };
            matches!((&intersection.geometry, shared), (Geometry::Point(point), Some(shared)) if point == shared)
        });
        let area: Rational = edges
            .iter()
            .map(|edge| &edge.start.x * &edge.end.y - &edge.start.y * &edge.end.x)
            .sum();
        if simple && area != Rational::from_integer(0.into()) {
            assert_triangulation(input);
        } else {
            assert!(triangulate(input).is_err(), "invalid boundary: {input:?}");
        }
    }
    visit_permutations(&mut polygon(&[(0, 0), (4, 0), (4, 4), (0, 4), (2, 2)]), 0);
}
