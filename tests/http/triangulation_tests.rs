use super::{point, post, post_body};
use axum::http::StatusCode;
use serde_json::json;

const PATH: &str = "/api/triangulation";

#[tokio::test]
async fn returns_original_indices_for_exact_vertices_and_optional_closure() {
    let a = point("9007199254740992", "0");
    let b = point("9007199254740993", "0");
    let c = json!({
        "x": {"numerator": "9007199254740992", "denominator": "1"},
        "y": {"numerator": "1", "denominator": "3"}
    });
    for (vertices, expected) in [
        (json!([a, b, c]), [0, 1, 2]),
        (json!([a, c, b, a]), [0, 2, 1]),
    ] {
        let (status, body) = post(PATH, json!({"vertices": vertices})).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body.as_object().unwrap().len(), 1);
        let triangles: Vec<[usize; 3]> = serde_json::from_value(body["triangles"].clone()).unwrap();
        assert_eq!(triangles.len(), 1);
        let mut triangle = triangles[0];
        let start = triangle.iter().position(|index| *index == 0).unwrap();
        triangle.rotate_left(start);
        assert_eq!(triangle, expected);
    }
}

#[tokio::test]
async fn rejects_invalid_request_shapes_as_json_errors() {
    for request in [
        json!({}).to_string(),
        json!({"vertices": null}).to_string(),
        json!({"vertices": [{"x": {"numerator": 1, "denominator": "1"}, "y": {"numerator": "0", "denominator": "1"}}]}).to_string(),
        json!({"vertices": [{"x": {"numerator": "1", "denominator": "1"}}]}).to_string(),
        "{\"vertices\":".to_owned(),
    ] {
        let (status, body) = post_body(PATH, request).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body.as_object().unwrap().len(), 1);
        assert!(!body["error"].as_str().unwrap().is_empty());
    }
}

#[tokio::test]
async fn rejects_invalid_polygon_boundaries_as_json_errors() {
    for vertices in [
        json!([]),
        json!([point("0", "0"), point("1", "1"), point("2", "2")]),
        json!([
            point("0", "0"),
            point("4", "1"),
            point("4", "1"),
            point("1", "5")
        ]),
        json!([
            point("0", "0"),
            point("4", "5"),
            point("0", "4"),
            point("4", "1")
        ]),
    ] {
        let (status, body) = post(PATH, json!({"vertices": vertices})).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body.as_object().unwrap().len(), 1);
        assert!(!body["error"].as_str().unwrap().is_empty());
    }
}
