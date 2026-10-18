//! Algorithm implementations built on the shared exact geometry model.

pub(crate) mod convex_hull;
pub(crate) mod convex_polygon_intersection;
pub(crate) mod segment_intersection;
pub use convex_hull::convex_hull;
