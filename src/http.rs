//! HTTP boundary for exact intersections of submitted closed segments.

use crate::intersections;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, rejection::JsonRejection},
    http::StatusCode,
    response::IntoResponse,
    routing::post,
};
use protocol::{ApiError, ErrorBody, IntersectionDto, Request, Response, SegmentDto, bad_request};

mod delivery;
mod protocol;

#[cfg(test)]
#[path = "case_performance.rs"]
mod case_performance;

async fn compute(
    payload: Result<Json<Request>, JsonRejection>,
) -> Result<axum::response::Response, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let segments = request
        .segments
        .into_iter()
        .map(SegmentDto::into_segment)
        .collect::<Result<Vec<_>, _>>()?;
    if request.trace {
        return Ok(delivery::response(segments));
    }
    let response = tokio::task::spawn_blocking(move || Response {
        intersections: intersections(&segments)
            .into_iter()
            .map(IntersectionDto::from)
            .collect(),
        trace: None,
    })
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorBody {
                error: "交点计算失败".into(),
            }),
        )
    })?;
    Ok(Json(response).into_response())
}

/// Serve the submitted geometry directly, independently of viewer presets.
pub fn router() -> Router {
    Router::new()
        .route("/api/intersections", post(compute))
        .layer(DefaultBodyLimit::disable())
}
