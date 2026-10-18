//! HTTP boundary for exact simple-polygon triangulation.
//!
//! `POST /api/triangulation` accepts `{vertices: Point[]}` in boundary order.
//! Each coordinate uses decimal-string `{numerator, denominator}` fields.
//! A successful response is `{triangles: [number, number, number][]}`: each
//! counterclockwise triangle references zero-based indices in the submitted
//! vertices. Either winding is accepted; an optional terminal copy of the first
//! vertex is ignored and uses the first vertex's index. No vertex is added.
//!
//! Invalid JSON, coordinates, or polygon boundaries return HTTP 400 with
//! `{error: string}`. Validation and triangulation use the existing exact
//! `triangulate` API without repairing the submitted boundary.

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
    vertices: Vec<PointDto>,
}

#[derive(Serialize)]
struct Response {
    triangles: Vec<[usize; 3]>,
}

async fn compute(
    payload: Result<Json<Request>, JsonRejection>,
) -> Result<Json<Response>, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let response = tokio::task::spawn_blocking(move || {
        let vertices = request
            .vertices
            .into_iter()
            .map(PointDto::into_point)
            .collect::<Result<Vec<_>, _>>()?;
        let triangles =
            super::triangulate(&vertices).map_err(|error| bad_request(error.to_string()))?;
        Ok::<_, ApiError>(Response { triangles })
    })
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorBody {
                error: "三角剖分计算失败".into(),
            }),
        )
    })??;
    Ok(Json(response))
}

pub(crate) fn router() -> Router {
    Router::new()
        .route("/api/triangulation", post(compute))
        .layer(DefaultBodyLimit::disable())
}
