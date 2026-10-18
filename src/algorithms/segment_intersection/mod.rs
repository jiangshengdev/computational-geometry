//! Exact closed-segment intersections and independent cross-validation.

pub(crate) mod bo;
mod brute_force;
mod geometry;
mod validation;

pub use bo::intersections;
pub use brute_force::brute_force_intersections;
pub use geometry::{Geometry, Intersection, Segment};
pub use validation::{DuplicatePair, GeometryMismatch, ValidationReport, validate_intersections};
