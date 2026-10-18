//! HTTP route assembly for the computational geometry service.

use axum::Router;

pub(crate) mod protocol;

/// Assemble the algorithm HTTP routes.
pub fn router() -> Router {
    Router::new()
        .merge(crate::algorithms::segment_intersection::bo::http::router())
        .merge(crate::algorithms::convex_hull::http::router())
        .merge(crate::algorithms::convex_polygon_intersection::http::router())
}
