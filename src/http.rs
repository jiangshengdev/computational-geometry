//! HTTP route assembly for the computational geometry service.
//!
//! JSON requests retain Axum's default 2 MiB body limit, including streamed
//! bodies without Content-Length. Oversized requests use the existing HTTP 400
//! JSON error response. This bounds buffering, not geometry complexity or total
//! concurrent computation; upstream admission controls remain necessary.

use axum::Router;

pub(crate) mod protocol;
pub(crate) mod trace_delivery;

/// Assemble the algorithm HTTP routes.
pub fn router() -> Router {
    Router::new()
        .merge(crate::algorithms::segment_intersection::bo::http::router())
        .merge(crate::algorithms::convex_hull::http::router())
        .merge(crate::algorithms::convex_polygon_intersection::http::router())
        .merge(crate::algorithms::triangulation::http::router())
}
