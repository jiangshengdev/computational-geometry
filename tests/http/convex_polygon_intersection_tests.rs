use super::{point, post, post_body};
use axum::http::StatusCode;
use serde_json::{Value, json};

const PATH: &str = "/api/convex-polygon-intersection";

fn square() -> Value {
    json!([
        point("0", "0"),
        point("2", "0"),
        point("2", "2"),
        point("0", "2")
    ])
}

#[tokio::test]
async fn returns_all_four_exact_result_variants() {
    for (second, expected) in [
        (
            json!([point("3", "0"), point("4", "0"), point("3", "1")]),
            json!({"kind": "empty"}),
        ),
        (
            json!([point("2", "2"), point("3", "2"), point("2", "3")]),
            json!({"kind": "point", "point": point("2", "2")}),
        ),
        (
            json!([
                point("2", "0"),
                point("3", "0"),
                point("3", "2"),
                point("2", "2")
            ]),
            json!({"kind": "segment", "start": point("2", "0"), "end": point("2", "2")}),
        ),
        (
            json!([
                point("1", "1"),
                point("3", "1"),
                point("3", "3"),
                point("1", "3")
            ]),
            json!({"kind": "polygon", "vertices": [point("1", "1"), point("2", "1"), point("2", "2"), point("1", "2")]}),
        ),
    ] {
        let (status, body) = post(PATH, json!({"first": square(), "second": second})).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body, expected);
    }
}

#[tokio::test]
async fn normalizes_exact_rationals_without_losing_large_integers() {
    let fraction = json!({"x": {"numerator": "-2", "denominator": "-4"}, "y": {"numerator": "0", "denominator": "7"}});
    let a = point("9007199254740993", "0");
    let b = point("9007199254740993", "2");
    let boundary = json!([b, a, fraction, b]);
    let (status, body) = post(PATH, json!({"first": boundary, "second": boundary})).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body,
        json!({"kind": "polygon", "vertices": [
            {"x": {"numerator": "1", "denominator": "2"}, "y": {"numerator": "0", "denominator": "1"}}, a, b
        ]})
    );
}

#[tokio::test]
async fn rejects_invalid_shapes_rationals_and_boundaries() {
    for request in [
        json!({}).to_string(),
        json!({"first": square(), "second": null}).to_string(),
        json!({"first": square(), "second": [{"x": {"numerator": 1, "denominator": "1"}}]})
            .to_string(),
        "{\"first\":".to_owned(),
    ] {
        let (status, body) = post_body(PATH, request).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
        assert_eq!(body.as_object().unwrap().len(), 1);
        assert!(!body["error"].as_str().unwrap().is_empty());
    }
    for field in ["first", "second"] {
        for (numerator, denominator, error) in [
            ("1", "0", "坐标分母不得为零"),
            ("1.5", "1", "坐标的分子和分母必须是十进制整数字符串"),
        ] {
            let mut request = json!({"first": square(), "second": square()});
            request[field][0]["x"] = json!({"numerator": numerator, "denominator": denominator});
            let (status, body) = post(PATH, request).await;
            assert_eq!(status, StatusCode::BAD_REQUEST);
            assert_eq!(body, json!({"error": error}));
        }
        for invalid in [
            json!([]),
            json!([point("0", "0"), point("1", "0"), point("2", "0")]),
            json!([
                point("0", "0"),
                point("2", "0"),
                point("1", "1"),
                point("2", "2"),
                point("0", "2")
            ]),
        ] {
            let mut request = json!({"first": square(), "second": square()});
            request[field] = invalid;
            let (status, body) = post(PATH, request).await;
            assert_eq!(status, StatusCode::BAD_REQUEST);
            assert_eq!(body.as_object().unwrap().len(), 1);
            assert!(body["error"].as_str().unwrap().starts_with(field));
        }
    }
}
