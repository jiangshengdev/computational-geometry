use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use serde_json::{Value, json};
use tower::ServiceExt;

#[path = "http/convex_polygon_intersection_tests.rs"]
mod convex_polygon_intersection;

#[path = "http/triangulation_tests.rs"]
mod triangulation;

#[path = "http/convex_hull_trace_tests.rs"]
mod convex_hull_trace;

fn point(x: &str, y: &str) -> Value {
    json!({"x": {"numerator": x, "denominator": "1"}, "y": {"numerator": y, "denominator": "1"}})
}

async fn post(path: &str, body: Value) -> (StatusCode, Value) {
    post_body(path, body.to_string()).await
}

async fn post_body(path: &str, body: String) -> (StatusCode, Value) {
    let response = computational_geometry::http::router()
        .oneshot(
            Request::post(path)
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[tokio::test]
async fn convex_hull_returns_exact_ordered_vertices() {
    let a = point("9007199254740993", "0");
    let b = point("9007199254740995", "0");
    let c = point("9007199254740995", "2");
    let d = point("9007199254740993", "2");
    let (status, body) = post(
        "/api/convex-hull",
        json!({"points": [c, a, point("9007199254740994", "1"), b, d, a, point("9007199254740994", "0")]}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, json!({"vertices": [a, b, c, d]}));
}

#[tokio::test]
async fn convex_hull_handles_degenerate_inputs_and_normalizes_rationals() {
    for (points, vertices) in [
        (json!([]), json!([])),
        (
            json!([point("2", "3"), point("2", "3")]),
            json!([point("2", "3")]),
        ),
        (
            json!([point("2", "2"), point("0", "0")]),
            json!([point("0", "0"), point("2", "2")]),
        ),
        (
            json!([point("2", "2"), point("0", "0"), point("1", "1")]),
            json!([point("0", "0"), point("2", "2")]),
        ),
        (
            json!([{"x": {"numerator": "-2", "denominator": "-4"}, "y": {"numerator": "0", "denominator": "7"}}]),
            json!([{"x": {"numerator": "1", "denominator": "2"}, "y": {"numerator": "0", "denominator": "1"}}]),
        ),
    ] {
        let (status, body) = post("/api/convex-hull", json!({"points": points})).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body, json!({"vertices": vertices}));
    }
}

#[tokio::test]
async fn convex_hull_rejects_invalid_request_shapes_as_json_errors() {
    for request in [
        json!({}).to_string(),
        json!({"points": null}).to_string(),
        json!({"points": [{"x": {"numerator": 1, "denominator": "1"}, "y": {"numerator": "0", "denominator": "1"}}]}).to_string(),
        json!({"points": [{"x": {"numerator": "1", "denominator": "1"}}]}).to_string(),
        "{\"points\":".to_owned(),
    ] {
        let (status, body) = post_body("/api/convex-hull", request).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        let fields = body.as_object().unwrap();
        assert_eq!(fields.len(), 1);
        assert!(!fields["error"].as_str().unwrap().is_empty());
    }
}

#[tokio::test]
async fn algorithms_share_exact_coordinate_validation() {
    for (numerator, denominator, error) in [
        ("1", "0", "坐标分母不得为零"),
        ("1.5", "1", "坐标的分子和分母必须是十进制整数字符串"),
    ] {
        let invalid = json!({"x": {"numerator": numerator, "denominator": denominator}, "y": {"numerator": "0", "denominator": "1"}});
        for (path, request) in [
            ("/api/convex-hull", json!({"points": [invalid]})),
            ("/api/triangulation", json!({"vertices": [invalid]})),
            (
                "/api/bo/intersections",
                json!({"segments": [{"start": invalid, "end": point("1", "1")}]}),
            ),
        ] {
            let (status, body) = post(path, request).await;
            assert_eq!(status, StatusCode::BAD_REQUEST);
            assert_eq!(body, json!({"error": error}));
        }
    }
}

#[tokio::test]
async fn intersections_keep_their_exact_response_contract() {
    let (status, body) = post(
        "/api/bo/intersections",
        json!({"segments": [
            {"start": point("0", "0"), "end": point("1", "1")},
            {"start": point("0", "1"), "end": point("1", "0")}
        ]}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body,
        json!({"intersections": [{"segments": [0, 1], "geometry": {
            "type": "point", "point": {
                "x": {"numerator": "1", "denominator": "2"},
                "y": {"numerator": "1", "denominator": "2"}
            }
        }}]})
    );
}
