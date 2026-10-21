//! HTTP boundary for exact intersections of two ordered convex boundaries.
//!
//! `POST /api/convex-polygon-intersection` accepts `{first: Point[], second: Point[]}`.
//! Each coordinate uses decimal-string `{numerator, denominator}` fields, shared
//! with the hull and segment-intersection APIs. Both boundaries are validated by
//! `ConvexPolygon::new`; invalid JSON, coordinates, or boundaries return HTTP 400
//! with `{error: string}`. No convex hull is substituted for invalid input.
//!
//! A successful response is tagged by `kind`: `empty` has no additional fields;
//! `point` carries `point`; `segment` carries ordered `start` and `end`; `polygon`
//! carries canonical counterclockwise `vertices` without a closing duplicate.
//! All returned coordinates remain exact, normalized rationals.

use super::{ConvexPolygon, ConvexPolygonIntersection, convex_polygon_intersection};
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
    first: Vec<PointDto>,
    second: Vec<PointDto>,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum Response {
    Empty,
    Point { point: PointDto },
    Segment { start: PointDto, end: PointDto },
    Polygon { vertices: Vec<PointDto> },
}

impl From<ConvexPolygonIntersection> for Response {
    fn from(intersection: ConvexPolygonIntersection) -> Self {
        match intersection {
            ConvexPolygonIntersection::Empty => Self::Empty,
            ConvexPolygonIntersection::Point(point) => Self::Point {
                point: point.into(),
            },
            ConvexPolygonIntersection::Segment { start, end } => Self::Segment {
                start: start.into(),
                end: end.into(),
            },
            ConvexPolygonIntersection::Polygon(polygon) => Self::Polygon {
                vertices: polygon
                    .vertices()
                    .iter()
                    .cloned()
                    .map(PointDto::from)
                    .collect(),
            },
        }
    }
}

fn boundary(points: Vec<PointDto>, name: &str) -> Result<ConvexPolygon, ApiError> {
    Ok(parse_boundary(points, name)?.1)
}

fn parse_boundary(
    points: Vec<PointDto>,
    name: &str,
) -> Result<(Vec<crate::Point>, ConvexPolygon), ApiError> {
    let points = points
        .into_iter()
        .map(PointDto::into_point)
        .collect::<Result<Vec<_>, _>>()?;
    let boundary =
        ConvexPolygon::new(&points).map_err(|error| bad_request(format!("{name}: {error}")))?;
    Ok((points, boundary))
}

async fn compute(
    payload: Result<Json<Request>, JsonRejection>,
) -> Result<Json<Response>, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let response = tokio::task::spawn_blocking(move || {
        let first = boundary(request.first, "first")?;
        let second = boundary(request.second, "second")?;
        Ok::<_, ApiError>(Response::from(convex_polygon_intersection(&first, &second)))
    })
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorBody {
                error: "凸多边形交集计算失败".into(),
            }),
        )
    })??;
    Ok(Json(response))
}

pub(crate) fn router() -> Router {
    Router::new()
        .route("/api/convex-polygon-intersection", post(compute))
        .route("/api/convex-polygon-intersection/trace", post(trace))
        .layer(DefaultBodyLimit::disable())
}

/// NDJSON start preserves original input positions, with canonical-to-input orders.
/// Each step is a complete snapshot; absent action-specific fields are null.
/// Complete repeats the final step's exact result. Cancellation stops observation.
async fn trace(
    payload: Result<Json<Request>, JsonRejection>,
) -> Result<axum::response::Response, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let ((first, p), (second, q)) = tokio::task::spawn_blocking(move || {
        Ok::<_, ApiError>((
            parse_boundary(request.first, "first")?,
            parse_boundary(request.second, "second")?,
        ))
    })
    .await
    .map_err(|_| bad_request("Polygon validation failed"))??;
    let order = |input: &[crate::Point], polygon: &ConvexPolygon| {
        polygon
            .vertices()
            .iter()
            .map(|point| {
                input
                    .iter()
                    .position(|original| original == point)
                    .expect("canonical corners retain input identity")
            })
            .collect::<Vec<_>>()
    };
    let first_order = order(&first, &p);
    let second_order = order(&second, &q);
    Ok(crate::http::trace_delivery::response(move |delivery| {
        use serde_json::json;
        let points = |points: &[crate::Point]| {
            points
                .iter()
                .cloned()
                .map(PointDto::from)
                .collect::<Vec<_>>()
        };
        delivery.send(json!({"type":"start", "first":points(&first), "second":points(&second), "first_order":first_order, "second_order":second_order}), 0).then_some(())?;
        let result = super::execute(&p, &q, &mut |state| {
            if delivery.is_cancelled() {
                return false;
            }
            let vertex = state.vertex.map(|vertex| match state.boundary {
                Some(super::teaching::Boundary::First) => first_order[vertex],
                Some(super::teaching::Boundary::Second) => second_order[vertex],
                None => unreachable!("a checked vertex has an input boundary"),
            });
            let edges = state
                .edges
                .map(|[a, b]| [a.map(|id| first_order[id]), b.map(|id| second_order[id])]);
            delivery.send(json!({"type":"step", "step": {
                "phase":state.phase, "action":state.action, "boundary":state.boundary,
                "vertex":vertex, "contained":state.contained, "edges":edges,
                "relation":state.relation, "inside":state.inside, "candidates":points(&state.candidates),
                "added":state.added, "reason":state.reason, "result":state.result.clone().map(Response::from)
            }}), 1)
        })?;
        delivery
            .send(
                json!({"type":"complete", "result":Response::from(result)}),
                0,
            )
            .then_some(())
    }))
}
