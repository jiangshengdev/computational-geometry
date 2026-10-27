//! Exact planar geometry: polygon triangulation, convex hulls and intersections.
//!
//! [triangulate] validates a simple polygon boundary and returns triangles as
//! original vertex indices, using monotone partition and stack triangulation.
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
//! An invertible exact shear (x, y) -> (x + s*y, y) is used only when an input
//! has nonzero vertical extent and equal endpoint x coordinates. Its input-only
//! bound preserves strictly different original event x coordinates. Otherwise
//! s=0. Distinct equal-x events retain separate, locally ordered status blocks.
//! Each fixed supporting line has dynamic original members and one AVL node.
//! Only adjacent active groups schedule future crossings covered by current
//! members. Overlapping pairs emit their full interval when the later member
//! starts, never fragments or old-pair revisits at later events.
//! Point inputs join their exact event but never enter the active status.
//! At a point inside an overlap group, all containing members participate:
//! point-member pairs are emitted while previously emitted member intervals
//! remain intact. Duplicate inputs retain their own pairs in mixed events too.
//!
//! With n original inputs and k intersecting unordered input pairs, ordinary
//! computation takes O((n+k) log(n+1)) exact arithmetic/comparison and state
//! operations (plus constant empty-input handling), including initialization,
//! dynamic member indexes, event location, queue and output maintenance.
//! Auxiliary storage is O(n+k) records and results use O(k); cumulative logical
//! record maintenance is O(n+k), with logarithmic tree work per operation.
//! These are operation/record counts, not bit-complexity or byte guarantees.
//! With B-bit normalized input integers, fixed endpoint/line formulas have
//! O(B)-bit operands without shear and O(nB)-bit operands with the current
//! common-denominator shear. Rational arithmetic and gcd costs depend on those
//! lengths. Teaching snapshots, formatting, transmission and retained history
//! are additional costs, paid only by the recording path through the same core.

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
