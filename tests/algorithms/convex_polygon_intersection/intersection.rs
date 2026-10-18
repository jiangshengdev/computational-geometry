use computational_geometry::{
    ConvexPolygon, ConvexPolygonError, ConvexPolygonIntersection, Geometry, Point, Rational,
    Segment, brute_force_intersections, convex_hull, convex_polygon_intersection,
};

fn point(x: i64, y: i64) -> Point {
    Point {
        x: Rational::from_integer(x.into()),
        y: Rational::from_integer(y.into()),
    }
}

fn polygon(coords: &[(i64, i64)]) -> ConvexPolygon {
    ConvexPolygon::new(&coords.iter().map(|&(x, y)| point(x, y)).collect::<Vec<_>>()).unwrap()
}

fn assert_intersection(p: &ConvexPolygon, q: &ConvexPolygon, expected: ConvexPolygonIntersection) {
    assert_eq!(convex_polygon_intersection(p, q), expected);
    assert_eq!(convex_polygon_intersection(q, p), expected);
}

#[test]
fn constructs_complete_region_with_exact_fractional_crossing() {
    let p = polygon(&[(0, 0), (3, 0), (0, 3)]);
    let q = polygon(&[(0, 1), (3, 1), (3, 3)]);
    let expected = ConvexPolygon::new(&[
        point(0, 1),
        point(2, 1),
        Point {
            x: Rational::new(6.into(), 5.into()),
            y: Rational::new(9.into(), 5.into()),
        },
    ])
    .unwrap();
    assert_intersection(&p, &q, ConvexPolygonIntersection::Polygon(expected));
}

#[test]
fn distinguishes_empty_point_segment_containment_and_collinear_area() {
    use ConvexPolygonIntersection::{Empty, Point as Contact, Polygon, Segment};
    let outer = polygon(&[(0, 0), (4, 0), (4, 4), (0, 4)]);
    let inner = polygon(&[(1, 1), (2, 1), (2, 2), (1, 2)]);
    let touching_inner = polygon(&[(0, 0), (3, 0), (3, 2), (0, 2)]);
    let inscribed = polygon(&[(0, 2), (2, 0), (4, 2)]);
    for contained in [&outer, &inner, &touching_inner, &inscribed] {
        assert_intersection(&outer, contained, Polygon(contained.clone()));
    }
    for (coords, expected) in [
        (vec![(5, 0), (6, 0), (6, 1), (5, 1)], Empty),
        (vec![(4, 4), (5, 4), (5, 5), (4, 5)], Contact(point(4, 4))),
        (
            vec![(4, 1), (5, 1), (5, 3), (4, 3)],
            Segment {
                start: point(4, 1),
                end: point(4, 3),
            },
        ),
        (
            vec![(2, 0), (6, 0), (6, 3), (2, 3)],
            Polygon(polygon(&[(2, 0), (4, 0), (4, 3), (2, 3)])),
        ),
        (vec![(0, 4), (2, 5), (-2, 5)], Contact(point(0, 4))),
        (
            vec![(1, 4), (3, 4), (2, 5)],
            Segment {
                start: point(1, 4),
                end: point(3, 4),
            },
        ),
    ] {
        assert_intersection(&outer, &polygon(&coords), expected);
    }
}

#[test]
fn validates_boundary_order_and_normalizes_only_equivalent_representations() {
    let canonical = polygon(&[(0, 0), (4, 0), (4, 4), (0, 4)]);
    let boundary = vec![
        point(0, 0),
        point(2, 0),
        point(4, 0),
        point(4, 4),
        point(0, 4),
    ];
    for shift in 0..boundary.len() {
        for reverse in [false, true] {
            let mut input = boundary.clone();
            input.rotate_left(shift);
            if reverse {
                input.reverse();
            }
            assert_eq!(ConvexPolygon::new(&input).unwrap(), canonical);
            input.push(input[0].clone());
            assert_eq!(ConvexPolygon::new(&input).unwrap(), canonical);
        }
    }
    assert_eq!(
        canonical.vertices(),
        &[point(0, 0), point(4, 0), point(4, 4), point(0, 4)]
    );
    assert_eq!(
        ConvexPolygon::new(&[]),
        Err(ConvexPolygonError::TooFewVertices)
    );
    assert_eq!(
        ConvexPolygon::new(&[point(0, 0), point(1, 0), point(2, 0)]),
        Err(ConvexPolygonError::ZeroArea)
    );
    assert_eq!(
        ConvexPolygon::new(&[point(0, 0), point(1, 0), point(1, 0), point(0, 1)]),
        Err(ConvexPolygonError::DuplicateVertex)
    );
    // Concavity, bow tie, star with same-sign local turns, edge backtracking,
    // and repeated circuits must never be silently replaced by their hulls.
    for coords in [
        vec![(0, 0), (4, 0), (1, 1), (4, 4), (0, 4)],
        vec![(0, 0), (4, 4), (0, 4), (4, 0)],
        vec![(0, 3), (2, -3), (-3, 1), (3, 1), (-2, -3)],
        vec![(0, 0), (3, 0), (2, 0), (4, 0), (4, 4), (0, 4)],
        vec![(0, 0), (4, 0), (0, 4), (0, 0), (4, 0), (0, 4)],
    ] {
        let points: Vec<_> = coords.into_iter().map(|(x, y)| point(x, y)).collect();
        assert!(ConvexPolygon::new(&points).is_err(), "{points:?}");
    }
}

#[test]
fn preserves_sub_float_gaps_contacts_and_positive_area() {
    let denominator = Rational::from_integer(10.into()).pow(30);
    let tiny = Rational::from_integer(1.into()) / denominator;
    let left = polygon(&[(0, 0), (1, 0), (1, 1), (0, 1)]);
    for offset in [tiny.clone(), Rational::from_integer(0.into()), -&tiny] {
        let x = Rational::from_integer(1.into()) + &offset;
        let right = ConvexPolygon::new(&[
            Point {
                x: x.clone(),
                y: Rational::from_integer(0.into()),
            },
            point(2, 0),
            point(2, 1),
            Point {
                x: x.clone(),
                y: Rational::from_integer(1.into()),
            },
        ])
        .unwrap();
        let expected = if offset > Rational::from_integer(0.into()) {
            ConvexPolygonIntersection::Empty
        } else if offset == Rational::from_integer(0.into()) {
            ConvexPolygonIntersection::Segment {
                start: point(1, 0),
                end: point(1, 1),
            }
        } else {
            ConvexPolygonIntersection::Polygon(
                ConvexPolygon::new(&[
                    Point {
                        x: x.clone(),
                        y: Rational::from_integer(0.into()),
                    },
                    point(1, 0),
                    point(1, 1),
                    Point {
                        x,
                        y: Rational::from_integer(1.into()),
                    },
                ])
                .unwrap(),
            )
        };
        assert_intersection(&left, &right, expected);
    }
}

// Independent enumeration tests the chasing/inside-state completeness against
// all edge pairs and all input vertices. It is test-only, not a runtime fallback.
fn enumerated_intersection(p: &ConvexPolygon, q: &ConvexPolygon) -> ConvexPolygonIntersection {
    let inside = |point: &Point, polygon: &ConvexPolygon| {
        let vertices = polygon.vertices();
        (0..vertices.len()).all(|i| {
            let a = &vertices[i];
            let b = &vertices[(i + 1) % vertices.len()];
            (&b.x - &a.x) * (&point.y - &a.y) - (&b.y - &a.y) * (&point.x - &a.x)
                >= Rational::from_integer(0.into())
        })
    };
    let mut candidates: Vec<_> = p
        .vertices()
        .iter()
        .filter(|point| inside(point, q))
        .chain(q.vertices().iter().filter(|point| inside(point, p)))
        .cloned()
        .collect();
    let mut segments = Vec::new();
    for polygon in [p, q] {
        let vertices = polygon.vertices();
        segments.extend((0..vertices.len()).map(|i| Segment {
            start: vertices[i].clone(),
            end: vertices[(i + 1) % vertices.len()].clone(),
        }));
    }
    for intersection in brute_force_intersections(&segments) {
        if intersection.segments[0] < p.vertices().len()
            && intersection.segments[1] >= p.vertices().len()
        {
            match intersection.geometry {
                Geometry::Point(point) => candidates.push(point),
                Geometry::Overlap { start, end } => candidates.extend([start, end]),
            }
        }
    }
    let hull = convex_hull(&candidates);
    match hull.as_slice() {
        [] => ConvexPolygonIntersection::Empty,
        [point] => ConvexPolygonIntersection::Point(point.clone()),
        [start, end] => ConvexPolygonIntersection::Segment {
            start: start.clone(),
            end: end.clone(),
        },
        _ => ConvexPolygonIntersection::Polygon(ConvexPolygon::new(&hull).unwrap()),
    }
}

#[test]
fn chasing_matches_enumeration_on_varied_convex_boundaries() {
    // Small integer lattice deliberately creates exact contacts and collinearity.
    // Hull construction here generates legal test inputs, never repairs API input.
    let mut seed = 17_u64;
    let mut coordinate = || {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        ((seed >> 32) % 11) as i64 - 5
    };
    for _ in 0..200 {
        let mut polygons = Vec::new();
        for _ in 0..2 {
            let points: Vec<_> = (0..7).map(|_| point(coordinate(), coordinate())).collect();
            polygons.push(ConvexPolygon::new(&convex_hull(&points)).unwrap());
        }
        let expected = enumerated_intersection(&polygons[0], &polygons[1]);
        assert_intersection(&polygons[0], &polygons[1], expected);
    }
}
