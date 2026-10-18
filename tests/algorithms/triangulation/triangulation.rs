mod support;

use computational_geometry::{Point, Rational, TriangulationError, triangulate};
use support::{assert_triangulation, point, polygon};

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
        for shift in 0..boundary.len() {
            for reverse in [false, true] {
                let mut input = boundary.clone();
                input.rotate_left(shift);
                if reverse {
                    input.reverse();
                }
                assert_triangulation(&input);
                input.push(input[0].clone());
                assert_triangulation(&input);
            }
        }
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
