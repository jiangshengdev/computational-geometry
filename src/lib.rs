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
//! A positive exact shear (x, y) -> (x + s*y, y) makes every nonzero input
//! nonvertical and separates distinct event positions in sweep x order. It is
//! computed from input coordinates without enumerating intersections. Nonzero
//! inputs are grouped by exact support line. An endpoint-ordered interval sweep
//! reports each same-line pair once, preserving its full closed intersection.
//! Touching intervals are merged into maximal coverage segments; centered
//! interval indexes recover original input identities only where needed.
//!
//! A deterministic AVL orders the active coverage segments. At each event a
//! lower-bound search and consecutive equal-height range recover all participants.
//! The whole incident block is removed in left order and reinserted in right
//! order. Only the changed adjacencies are checked. A BTree event queue and
//! bidirectional ordered certificate indexes delete invalid candidates immediately;
//! neither stale events nor historical pairs are retained. Point inputs have
//! fixed events and never enter the active tree. At an intersection, cross-line
//! member products and point pairs append directly to the final result.
//!
//! # Operation and storage bounds
//!
//! For n original inputs and k intersecting unordered input pairs, total work is
//! worst-case O((n+k) log(n+1)) exact arithmetic, comparison and structural
//! operations; auxiliary storage is O(n) items and final output is O(k) items.
//! Empty and singleton inputs obey the same bounds. Repeated/reversed inputs
//! retain independent identities; k counts pairs, not distinct positions.
//!
//! Preparation sorts O(n) line keys and endpoints. Each interval enters/leaves
//! its same-line active set once; every enumerated member yields a result, so
//! that stage costs O(n log(n+1)+k_L). Centered indexes use presorted endpoints
//! and disjoint recursive partitions: O(n log(n+1)) construction, O(n) peak
//! workspace, and O(log(n+1)+m) query work for m reported original members.
//!
//! With N<=n coverage segments, their cross-line pair count K is at most k:
//! each pair has a distinct original-pair witness. The event count is at most
//! 2N+z+K, where z is the point-input count. Total incident coverage count D is
//! O(n+k): multiway incidences charge to intersecting pairs, other incidences
//! charge to endpoints or point-segment outputs. Each tree/queue operation is
//! logarithmic in n; local sorting and changed-edge checks cost O(D log(n+1)).
//! Member queries are skipped for ordinary single-cover endpoints. Otherwise,
//! the reported member count W is at most twice the new cross-line output count
//! (two or more covers), or is paid by point-segment outputs (one cover and a
//! point). Thus all member expansion and pair enumeration is output-sensitive.
//! There is no final deduplication pass or second production algorithm.
//!
//! Storage includes O(n) transformed inputs, covers, line/index records and
//! construction buffers, O(N) live AVL nodes and certificates, at most 2N+z
//! fixed sources, and O(n) current-event lists. BTree deletions release nodes;
//! allocation does not grow with historical candidates. Index intervals belong
//! to one node with two id orders; consumed parent partitions are not retained.
//! Only final Intersection records and their vector capacity count as output.
//!
//! This is an operation/item model, not a bit-complexity or elapsed-time bound.
//! The shear uses the least common multiple of coordinate denominators D, an integerized bound
//! M, and the bound 1/[256(M+1)^5]. It also bounds endpoint numerators and
//! denominators by H: homogeneous line/intersection determinants give event
//! denominators <=8H^8, so 1/[256(H+1)^17] is valid without integerizing all
//! inputs. The larger of these two valid coefficients avoids unnecessary bit
//! growth from unrelated denominators. Rational normalization,
//! allocation and arithmetic costs depend on operand bit lengths. Positive
//! shear is used even without vertical inputs and can increase numeric costs.
//! Optional teaching expands real state, formats values and retains delivery
//! dictionaries independently; these recording/transport costs are additional.
//! Ordinary calls never construct teaching projections or restoration caches.

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
