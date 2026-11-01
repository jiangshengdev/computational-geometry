use super::{StatusCode, post_body};

#[tokio::test]
async fn oversized_json_is_rejected_before_geometry_deserialization() {
    // Whitespace is valid JSON padding and previously bypassed every route's
    // disabled extractor limit, even without a Content-Length header.
    let oversized = format!("{}{{}}", " ".repeat(2 * 1024 * 1024));
    for path in [
        "/api/bo/intersections",
        "/api/convex-hull",
        "/api/convex-hull/trace",
        "/api/convex-polygon-intersection",
        "/api/convex-polygon-intersection/trace",
        "/api/triangulation",
    ] {
        let (status, body) = post_body(path, oversized.clone()).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{path}");
        assert!(
            body["error"].as_str().unwrap().contains("length limit"),
            "{path}: {body}"
        );
    }
}
