use computational_geometry::{Point, Rational, convex_hull};

fn rational(numerator: i64, denominator: i64) -> Rational {
    Rational::new(numerator.into(), denominator.into())
}

fn point(x: i64, y: i64) -> Point {
    Point {
        x: rational(x, 1),
        y: rational(y, 1),
    }
}

#[test]
fn returns_only_extreme_vertices_in_canonical_counterclockwise_order() {
    let points = vec![
        point(2, 2),
        point(1, 1),
        point(0, 2),
        point(2, 0),
        point(0, 0),
        point(1, 0),
        point(2, 1),
        point(1, 2),
        point(0, 1),
        point(2, 2),
    ];
    assert_eq!(
        convex_hull(&points),
        vec![point(0, 0), point(2, 0), point(2, 2), point(0, 2)]
    );
}

#[test]
fn input_permutations_and_added_duplicates_preserve_the_hull() {
    let mut points = vec![point(-2, 0), point(0, -1), point(3, 1), point(0, 4)];
    let expected = points.clone();
    points.push(point(0, 0));
    for _ in 0..points.len() {
        points.rotate_left(1);
        assert_eq!(convex_hull(&points), expected);
        let mut reversed: Vec<_> = points.iter().rev().cloned().collect();
        assert_eq!(convex_hull(&reversed), expected);
        reversed.extend(points.iter().cloned());
        assert_eq!(convex_hull(&reversed), expected);
    }
}

#[test]
fn degenerate_inputs_return_their_distinct_extreme_points() {
    let cases = [
        (vec![], vec![]),
        (vec![point(3, -2)], vec![point(3, -2)]),
        (vec![point(3, -2); 4], vec![point(3, -2)]),
        (
            vec![point(5, 0), point(-1, 2)],
            vec![point(-1, 2), point(5, 0)],
        ),
        (
            vec![point(0, 0), point(2, -2), point(-2, 2), point(1, -1)],
            vec![point(-2, 2), point(2, -2)],
        ),
        (
            vec![point(1, 2), point(1, -3), point(1, 0), point(1, 2)],
            vec![point(1, -3), point(1, 2)],
        ),
        (
            vec![point(2, 1), point(-3, 1), point(0, 1), point(2, 1)],
            vec![point(-3, 1), point(2, 1)],
        ),
    ];
    for (input, expected) in cases {
        assert_eq!(convex_hull(&input), expected, "input: {input:?}");
    }
}

#[test]
fn preserves_turns_and_coordinate_order_beyond_float_precision() {
    // A thin diamond translated far from the origin: all four corners are
    // distinct even though binary64 would round away these displacements.
    let origin = Rational::from_integer(1.into()) * rational(10, 1).pow(80);
    let step = rational(1, 10).pow(80);
    let left = Point {
        x: &origin - &step,
        y: rational(1, 3),
    };
    let bottom = Point {
        x: origin.clone(),
        y: rational(1, 3) - &step,
    };
    let right = Point {
        x: &origin + &step,
        y: rational(1, 3),
    };
    let top = Point {
        x: origin.clone(),
        y: rational(1, 3) + &step,
    };
    let center = Point {
        x: origin.clone(),
        y: rational(1, 3),
    };
    let edge_midpoint = Point {
        x: &origin + &step / rational(2, 1),
        y: rational(1, 3) + &step / rational(2, 1),
    };
    assert_eq!(
        convex_hull(&[
            top.clone(),
            center,
            right.clone(),
            edge_midpoint,
            left.clone(),
            bottom.clone(),
        ]),
        vec![left, bottom, right, top]
    );
}
