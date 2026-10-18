//! Bentley–Ottmann computation, teaching observations and HTTP delivery.

mod sweep;
pub use sweep::intersections;

mod teaching;
mod trace_publication;

pub(crate) mod http;
