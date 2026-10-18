//! Exact simple-polygon triangulation by monotone partition and stack sweeps.

mod monotone;
mod status;
mod validation;

use std::cmp::Ordering;
use std::fmt;

use crate::geometry::orientation;
use crate::{Point, Rational};

/// A polygon boundary that cannot be triangulated under the input contract.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TriangulationError {
    TooFewVertices,
    RepeatedVertex,
    ZeroArea,
    SelfIntersection,
    UnsupportedDegeneracy,
}

impl fmt::Display for TriangulationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::TooFewVertices => "a polygon needs at least three vertices",
            Self::RepeatedVertex => "polygon vertices must be distinct",
            Self::ZeroArea => "polygon area must be nonzero",
            Self::SelfIntersection => "polygon boundary must be simple",
            Self::UnsupportedDegeneracy => {
                "equal-height or consecutive collinear vertices are not supported"
            }
        })
    }
}

impl std::error::Error for TriangulationError {}

/// Triangulate a simple boundary, returning counterclockwise triangles as
/// indices into the original slice. Either winding and any starting vertex are
/// accepted; one optional terminal copy of the first vertex is ignored.
///
/// This general-position implementation rejects equal-height vertices and
/// consecutive collinear vertices. Other repeated vertices, self-intersections,
/// boundary contacts and zero area are errors. No input coordinate is changed.
///
/// Validation, monotone partition, and triangulation use O(n log n) exact
/// comparisons/arithmetic operations and O(n) storage, including invalid-input
/// validation. Arbitrary-precision operand bit costs are additional.
pub fn triangulate(input: &[Point]) -> Result<Vec<[usize; 3]>, TriangulationError> {
    let boundary = validation::normalize(input)?;
    validation::check_simple(&boundary)?;
    let diagonals = monotone::partition(&boundary);
    let faces = monotone::faces(&boundary, &diagonals);
    let mut result = Vec::with_capacity(boundary.points.len() - 2);
    for face in faces {
        monotone::triangulate_face(&boundary, &face, &mut result);
    }
    Ok(result)
}

struct Boundary<'a> {
    points: Vec<&'a Point>,
    original: Vec<usize>,
    events: Vec<usize>,
}

impl Boundary<'_> {
    fn next(&self, vertex: usize) -> usize {
        (vertex + 1) % self.points.len()
    }
    fn prev(&self, vertex: usize) -> usize {
        (vertex + self.points.len() - 1) % self.points.len()
    }

    fn above(&self, a: usize, b: usize) -> bool {
        self.points[a].y > self.points[b].y
    }

    fn turn(&self, a: usize, b: usize, c: usize) -> Rational {
        orientation(self.points[a], self.points[b], self.points[c])
    }

    fn edge_x(&self, edge: usize, y: &Rational) -> Rational {
        let a = self.points[edge];
        let b = self.points[self.next(edge)];
        &a.x + (y - &a.y) * (&b.x - &a.x) / (&b.y - &a.y)
    }

    fn edge_order(&self, a: usize, b: usize, y: &Rational, side: EventSide) -> Ordering {
        if a == b {
            return Ordering::Equal;
        }
        self.edge_x(a, y)
            .cmp(&self.edge_x(b, y))
            .then_with(|| {
                let slope = |edge| {
                    let a = self.points[edge];
                    let b = self.points[self.next(edge)];
                    (&b.x - &a.x) / (&b.y - &a.y)
                };
                let order = slope(a).cmp(&slope(b));
                match side {
                    EventSide::Above => order,
                    EventSide::Below => order.reverse(),
                }
            })
            .then(a.cmp(&b))
    }

    fn emit(&self, a: usize, b: usize, c: usize, output: &mut Vec<[usize; 3]>) {
        let turn = self.turn(a, b, c);
        assert_ne!(
            turn,
            zero(),
            "monotone triangulation must not emit zero area"
        );
        let mut triangle = [self.original[a], self.original[b], self.original[c]];
        if turn < zero() {
            triangle.swap(1, 2);
        }
        output.push(triangle);
    }
}

#[derive(Clone, Copy)]
enum EventSide {
    Above,
    Below,
}

fn zero() -> Rational {
    Rational::from_integer(0.into())
}
