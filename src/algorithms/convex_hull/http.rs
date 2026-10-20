//! HTTP boundary for exact convex hulls of submitted points.

use crate::http::protocol::{ApiError, ErrorBody, PointDto, bad_request};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, rejection::JsonRejection},
    http::StatusCode,
    routing::post,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct Request {
    points: Vec<PointDto>,
}

#[derive(Serialize)]
struct Response {
    vertices: Vec<PointDto>,
}

async fn compute(
    payload: Result<Json<Request>, JsonRejection>,
) -> Result<Json<Response>, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let points = request
        .points
        .into_iter()
        .map(PointDto::into_point)
        .collect::<Result<Vec<_>, _>>()?;
    let response = tokio::task::spawn_blocking(move || Response {
        vertices: super::convex_hull(&points)
            .into_iter()
            .map(PointDto::from)
            .collect(),
    })
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorBody {
                error: "凸包计算失败".into(),
            }),
        )
    })?;
    Ok(Json(response))
}

pub(crate) fn router() -> Router {
    Router::new()
        .route("/api/convex-hull", post(compute))
        .route("/api/convex-hull/trace", post(trace))
        .layer(DefaultBodyLimit::disable())
}

async fn trace(
    payload: Result<Json<Request>, JsonRejection>,
) -> Result<axum::response::Response, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let points = request
        .points
        .into_iter()
        .map(PointDto::into_point)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(crate::http::trace_delivery::response(move |delivery| {
        delivery.send(serde_json::json!({"type": "start", "points": points.iter().cloned().map(PointDto::from).collect::<Vec<_>>()}), 0).then_some(())?;
        let vertices = super::andrew::execute(&points, &mut |step| {
            !delivery.is_cancelled()
                && delivery.send(serde_json::json!({"type": "step", "step": step}), 1)
        })?;
        delivery.send(serde_json::json!({"type": "complete", "vertices": vertices.into_iter().map(PointDto::from).collect::<Vec<_>>()}), 0).then_some(())
    }))
}
