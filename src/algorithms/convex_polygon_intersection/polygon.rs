use std::{collections::BTreeSet, fmt};

use crate::geometry::orientation;
use crate::{Point, Rational};

/// A validated positive-area convex boundary, stored in canonical order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ConvexPolygon {
    vertices: Vec<Point>,
}

/// Why an input boundary cannot represent a positive-area convex polygon.
/// Multiple defects may exist; the first detected defect is returned.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConvexPolygonError {
    TooFewVertices,
    DuplicateVertex,
    ZeroArea,
    NonConvexBoundary,
}

impl fmt::Display for ConvexPolygonError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::TooFewVertices => "a polygon needs at least three vertices",
            Self::DuplicateVertex => "only a single closing vertex may repeat",
            Self::ZeroArea => "a polygon must have nonzero area",
            Self::NonConvexBoundary => {
                "vertices must follow a simple convex boundary without backtracking"
            }
        })
    }
}

impl std::error::Error for ConvexPolygonError {}

impl ConvexPolygon {
    /// Validate an ordered boundary without replacing it by a convex hull.
    ///
    /// Either winding and any starting vertex are accepted, as is one repeated
    /// closing vertex. Other repeated vertices, including consecutive duplicates,
    /// are errors. Collinear intermediate vertices are removed, but backtracking,
    /// nonconvexity, self-intersections, repeated circuits and zero area are errors.
    /// Inputs are not modified. Coordinates use the existing [`Rational`]
    /// mathematical contract (valid normalized arbitrary-precision rationals).
    ///
    /// Validation checks every vertex against every supporting edge: O(n²)
    /// geometric operations and O(n) storage. This detects self-intersecting
    /// stars that a local-turn-only check would miss. Bit costs depend on operand
    /// lengths. The validated object can be reused without repeating this work.
    pub fn new(vertices: &[Point]) -> Result<Self, ConvexPolygonError> {
        let mut vertices = vertices.to_vec();
        if vertices.len() > 1 && vertices.first() == vertices.last() {
            vertices.pop();
        }
        if vertices.len() < 3 {
            return Err(ConvexPolygonError::TooFewVertices);
        }
        if vertices.iter().collect::<BTreeSet<_>>().len() != vertices.len() {
            return Err(ConvexPolygonError::DuplicateVertex);
        }
        let zero = Rational::from_integer(0.into());
        let area: Rational = (1..vertices.len() - 1)
            .map(|i| orientation(&vertices[0], &vertices[i], &vertices[i + 1]))
            .sum();
        if area == zero {
            return Err(ConvexPolygonError::ZeroArea);
        }
        if area < zero {
            vertices.reverse();
        }
        let n = vertices.len();
        for i in 0..n {
            let a = &vertices[i];
            let b = &vertices[(i + 1) % n];
            if vertices.iter().any(|c| orientation(a, b, c) < zero) {
                return Err(ConvexPolygonError::NonConvexBoundary);
            }
        }
        // Supporting-half-plane checks also reject collinear backtracking in
        // a positive-area boundary: the reversed edge excludes off-line points.
        let mut corners: Vec<_> = (0..n)
            .filter(|&i| {
                orientation(
                    &vertices[(i + n - 1) % n],
                    &vertices[i],
                    &vertices[(i + 1) % n],
                ) != zero
            })
            .map(|i| vertices[i].clone())
            .collect();
        let first = corners
            .iter()
            .enumerate()
            .min_by_key(|(_, point)| *point)
            .unwrap()
            .0;
        corners.rotate_left(first);
        Ok(Self { vertices: corners })
    }

    /// Counterclockwise corners, starting at the lexicographically smallest
    /// point; no closing duplicate or collinear intermediate vertices.
    pub fn vertices(&self) -> &[Point] {
        &self.vertices
    }

    // Only the enclosing algorithm may construct from Andrew's canonical hull.
    pub(super) fn from_canonical(vertices: Vec<Point>) -> Self {
        Self { vertices }
    }

    pub(super) fn contains(&self, point: &Point) -> bool {
        let vertices = &self.vertices;
        let origin = &vertices[0];
        let zero = Rational::from_integer(0.into());
        if orientation(origin, &vertices[1], point) < zero
            || orientation(origin, vertices.last().unwrap(), point) > zero
        {
            return false;
        }
        let (mut low, mut high) = (1, vertices.len() - 1);
        while high - low > 1 {
            let middle = low + (high - low) / 2;
            if orientation(origin, &vertices[middle], point) >= zero {
                low = middle;
            } else {
                high = middle;
            }
        }
        orientation(&vertices[low], &vertices[high], point) >= zero
    }
}
