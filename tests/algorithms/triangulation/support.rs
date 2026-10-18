use std::collections::{BTreeMap, BTreeSet};

use computational_geometry::{
    ConvexPolygon, ConvexPolygonIntersection, Point, Rational, convex_polygon_intersection,
    triangulate,
};

pub fn point(x: i64, y: i64) -> Point {
    Point {
        x: Rational::from_integer(x.into()),
        y: Rational::from_integer(y.into()),
    }
}

pub fn polygon(coordinates: &[(i64, i64)]) -> Vec<Point> {
    coordinates.iter().map(|&(x, y)| point(x, y)).collect()
}

pub fn assert_boundary_representations(boundary: &[Point]) {
    for shift in 0..boundary.len() {
        for reverse in [false, true] {
            let mut input = boundary.to_vec();
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

fn cross(a: &Point, b: &Point, c: &Point) -> Rational {
    (&b.x - &a.x) * (&c.y - &a.y) - (&b.y - &a.y) * (&c.x - &a.x)
}

fn strictly_inside(point: &Point, boundary: &[Point]) -> bool {
    let zero = Rational::from_integer(0.into());
    let mut winding = 0;
    for (a, b) in boundary.iter().zip(boundary.iter().cycle().skip(1)) {
        if a.y <= point.y && b.y > point.y && cross(a, b, point) > zero {
            winding += 1;
        } else if a.y > point.y && b.y <= point.y && cross(a, b, point) < zero {
            winding -= 1;
        }
    }
    winding != 0
}

pub fn assert_triangulation(input: &[Point]) {
    let boundary = if input.first() == input.last() {
        &input[..input.len() - 1]
    } else {
        input
    };
    let triangles = triangulate(input).unwrap_or_else(|error| panic!("{input:?}: {error:?}"));
    assert_eq!(triangles.len(), boundary.len() - 2, "{input:?}");
    let zero = Rational::from_integer(0.into());
    let mut area = zero.clone();
    let mut used = BTreeSet::new();
    let mut edges = BTreeMap::new();
    let mut triangle_polygons = Vec::new();
    for indices in triangles {
        assert!(indices.iter().all(|&index| index < boundary.len()));
        let [a, b, c] = indices.map(|index| &boundary[index]);
        let triangle_area = cross(a, b, c);
        assert!(
            triangle_area > zero,
            "triangle must be nondegenerate and CCW"
        );
        area += triangle_area;
        used.extend(indices);
        for (a, b) in indices.into_iter().zip(indices.into_iter().cycle().skip(1)) {
            *edges.entry((a.min(b), a.max(b))).or_insert(0) += 1;
        }
        let three = Rational::from_integer(3.into());
        let centroid = Point {
            x: (&a.x + &b.x + &c.x) / &three,
            y: (&a.y + &b.y + &c.y) / &three,
        };
        assert!(strictly_inside(&centroid, boundary));
        triangle_polygons.push(ConvexPolygon::new(&[a.clone(), b.clone(), c.clone()]).unwrap());
    }
    assert_eq!(used, (0..boundary.len()).collect());
    let boundary_edges: BTreeSet<_> = (0..boundary.len())
        .map(|a| {
            let b = (a + 1) % boundary.len();
            (a.min(b), a.max(b))
        })
        .collect();
    for edge in &boundary_edges {
        assert_eq!(
            edges.get(edge),
            Some(&1),
            "missing or repeated boundary edge"
        );
    }
    for (edge, count) in edges {
        assert_eq!(count, if boundary_edges.contains(&edge) { 1 } else { 2 });
    }
    let signed_area: Rational = boundary
        .iter()
        .zip(boundary.iter().cycle().skip(1))
        .map(|(a, b)| &a.x * &b.y - &a.y * &b.x)
        .sum();
    assert_eq!(
        area,
        if signed_area < zero {
            -signed_area
        } else {
            signed_area
        }
    );
    for (i, triangle) in triangle_polygons.iter().enumerate() {
        for other in &triangle_polygons[i + 1..] {
            assert!(
                !matches!(
                    convex_polygon_intersection(triangle, other),
                    ConvexPolygonIntersection::Polygon(_)
                ),
                "triangle interiors must not overlap"
            );
        }
    }
}
