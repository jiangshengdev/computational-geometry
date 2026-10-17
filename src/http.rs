//! HTTP route assembly for the computational geometry service.

use axum::Router;

/// Assemble the algorithm HTTP routes.
pub fn router() -> Router {
    Router::new().merge(crate::algorithms::bo::http::router())
}
