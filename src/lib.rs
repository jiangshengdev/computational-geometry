//! Exact planar geometry: convex hulls and closed-segment intersections.
//!
//! [convex_hull] computes an Andrew monotone-chain hull using the shared
//! [Point] and [Rational] types. See its documentation for ordering, collinear
//! point handling, degenerate inputs, and operation-count guarantees.
//!
//! # Bentley–Ottmann intersections
//!
//! Endpoint contacts, multiway crossings, vertical segments and distinct events
//! at the same sweep coordinate are supported, including positive-length
//! overlaps and duplicate inputs. Zero-length inputs participate as points;
//! empty and singleton collections return no pairs.
//!
//! An invertible exact shear (x, y) -> (x + s*y, y) avoids vertical segments in
//! sweep coordinates; s is bounded from input coordinates to preserve original
//! event order, without enumerating intersections. Point events group all
//! incident segments. Only adjacent active segments schedule future crossings;
//! pair enumeration is confined to segments incident at one event. Overlapping
//! pairs emit their full interval at its beginning, never fragments at later
//! endpoints or crossings. Coincident active segments retain separate identities.
//! Point inputs join their exact event but never enter the active sequence.
//! At a point inside an overlap group, all containing members participate:
//! point-member pairs are emitted while previously emitted member intervals
//! remain intact. Duplicate inputs retain their own pairs in mixed events too.
//!
//! With n inputs and k intersecting pairs, the number of events E is O(n + k).
//! Shear selection uses O(n) arithmetic operations; vector status scans and updates cost
//! O(E*n), and incident-block sorting costs O(E*n*log(n + 1)). Queue work,
//! including initialization from all n inputs, costs O((n + E)*log(E + 1)).
//! For m incident segments, each event inspects O(m*m) pairs; overlapping pairs
//! can be inspected at multiple events (including point-input events), so the
//! conservative total bound for these inspections is O(E*n*n), not O(k).
//! There are k outputs.
//! Storage is O(n + k), including the output. These operation counts exclude the
//! cost of arbitrary-precision rational arithmetic and comparisons, which
//! depends on operand bit lengths; this is not an O((n + k) log n) claim.

mod geometry;
pub use geometry::{Point, Rational};

mod algorithms;
pub use algorithms::convex_hull;
pub use algorithms::convex_polygon_intersection::{
    ConvexPolygon, ConvexPolygonError, ConvexPolygonIntersection, convex_polygon_intersection,
};
pub use algorithms::segment_intersection::{Geometry, Intersection, Segment, intersections};
pub use algorithms::triangulation::{TriangulationError, triangulate};

pub mod http;

pub use algorithms::segment_intersection::brute_force_intersections;

pub use algorithms::segment_intersection::{
    DuplicatePair, GeometryMismatch, ValidationReport, validate_intersections,
};
