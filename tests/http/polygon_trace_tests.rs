use super::*;

async fn trace(first: Value, second: Value) -> Vec<Value> {
    let response = computational_geometry::http::router()
        .oneshot(
            Request::post("/api/convex-polygon-intersection/trace")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"first":first,"second":second}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    std::str::from_utf8(&bytes)
        .unwrap()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect()
}

#[tokio::test]
async fn containment_preserves_original_identity_and_short_circuits() {
    // Clockwise, with a closing duplicate and a removed collinear vertex.
    let first = json!([
        point("2", "2"),
        point("2", "0"),
        point("1", "0"),
        point("0", "0"),
        point("0", "2"),
        point("2", "2")
    ]);
    let second = json!([
        point("-1", "-1"),
        point("3", "-1"),
        point("3", "3"),
        point("-1", "3")
    ]);
    let frames = trace(first.clone(), second.clone()).await;
    assert_eq!(frames[0]["first"], first);
    assert_eq!(frames[0]["first_order"], json!([3, 1, 0, 4]));
    let steps: Vec<_> = frames.iter().filter_map(|f| f.get("step")).collect();
    assert_eq!(
        steps
            .iter()
            .map(|s| s["action"].as_str().unwrap())
            .collect::<Vec<_>>(),
        [
            "containment",
            "containment",
            "containment",
            "containment",
            "complete"
        ]
    );
    assert_eq!(steps[0]["vertex"], 3);
    assert!(
        steps[..4].iter().all(|s| s["contained"] == true
            && s["result"].is_null()
            && s["candidates"] == json!([]))
    );
    let (_, normal) = post(
        "/api/convex-polygon-intersection",
        json!({"first":first,"second":second}),
    )
    .await;
    assert_eq!(steps.last().unwrap()["result"], normal);
    assert_eq!(frames.last().unwrap()["result"], normal);
}

#[tokio::test]
async fn chasing_records_separate_actions_and_all_result_kinds() {
    let square = json!([
        point("0", "0"),
        point("4", "0"),
        point("4", "4"),
        point("0", "4")
    ]);
    for (second, kind) in [
        (
            json!([
                point("2", "1"),
                point("6", "1"),
                point("6", "3"),
                point("2", "3")
            ]),
            "polygon",
        ),
        (
            json!([
                point("6", "0"),
                point("8", "0"),
                point("8", "2"),
                point("6", "2")
            ]),
            "empty",
        ),
        (
            json!([
                point("4", "4"),
                point("6", "4"),
                point("6", "6"),
                point("4", "6")
            ]),
            "point",
        ),
        (
            json!([
                point("4", "1"),
                point("6", "1"),
                point("6", "3"),
                point("4", "3")
            ]),
            "segment",
        ),
    ] {
        let frames = trace(square.clone(), second.clone()).await;
        let steps: Vec<_> = frames.iter().filter_map(|f| f.get("step")).collect();
        assert!(
            steps[..steps.len() - 1]
                .iter()
                .all(|s| s["result"].is_null())
        );
        assert_eq!(steps.last().unwrap()["result"]["kind"], kind);
        let (_, normal) = post(
            "/api/convex-polygon-intersection",
            json!({"first":square,"second":second}),
        )
        .await;
        assert_eq!(frames.last().unwrap()["result"], normal);
        assert!(steps.iter().any(|s| s["action"] == "terminate"));
        for pair in steps.windows(2) {
            if pair[0]["candidates"] != pair[1]["candidates"] {
                assert_eq!(pair[1]["action"], "collect");
                assert!(!pair[1]["added"].as_array().unwrap().is_empty());
            }
            if pair[1]["action"] == "advance" {
                assert_ne!(pair[0]["edges"], pair[1]["edges"]);
                assert_eq!(pair[0]["candidates"], pair[1]["candidates"]);
            }
        }
        if kind == "polygon" {
            for action in ["relation", "inside", "collect", "advance", "normalize"] {
                assert!(
                    steps.iter().any(|s| s["action"] == action),
                    "missing {action}"
                );
            }
        }
        if kind == "segment" {
            assert!(steps.iter().any(|s| s["reason"] == "opposite_contact"));
            assert!(!steps.iter().any(|s| s["action"] == "normalize"));
        }
    }
}

#[tokio::test]
async fn equality_second_containment_and_fractional_results_remain_exact() {
    let outer = json!([point("0", "0"), point("3", "0"), point("0", "3")]);
    for second in [
        outer.clone(),
        json!([point("0", "1"), point("1", "1"), point("0", "2")]),
        json!([point("0", "1"), point("3", "2"), point("0", "2")]),
    ] {
        let frames = trace(outer.clone(), second.clone()).await;
        let (_, normal) = post(
            "/api/convex-polygon-intersection",
            json!({"first":outer,"second":second}),
        )
        .await;
        assert_eq!(frames.last().unwrap()["result"], normal);
        let steps: Vec<_> = frames.iter().filter_map(|f| f.get("step")).collect();
        if second == outer {
            assert_eq!(steps.len(), 4);
        } else if second[1] == point("1", "1") {
            assert_eq!(steps.len(), 5);
            assert_eq!(steps[0]["contained"], false);
        } else {
            assert!(normal.to_string().contains("\"denominator\":\"2\""));
        }
    }
}

#[tokio::test]
async fn same_direction_overlap_collects_the_full_interval_before_advancing() {
    let first = json!([
        point("0", "0"),
        point("4", "0"),
        point("4", "4"),
        point("0", "4")
    ]);
    let second = json!([
        point("2", "0"),
        point("6", "0"),
        point("6", "3"),
        point("2", "3")
    ]);
    let frames = trace(first.clone(), second.clone()).await;
    let steps: Vec<_> = frames.iter().filter_map(|f| f.get("step")).collect();
    let shared = steps
        .iter()
        .position(|s| s["reason"] == "shared_edge")
        .expect("same-direction shared interval is collected");
    assert_eq!(steps[shared]["action"], "collect");
    assert_eq!(steps[shared - 1]["action"], "relation");
    assert_eq!(steps[shared - 1]["relation"]["contact"], "overlap");
    let added: Vec<_> = steps[shared]["added"]
        .as_array()
        .unwrap()
        .iter()
        .map(|id| steps[shared]["candidates"][id.as_u64().unwrap() as usize].clone())
        .collect();
    assert_eq!(added, vec![point("2", "0"), point("4", "0")]);
    assert_eq!(steps[shared + 1]["action"], "advance");
    let (_, normal) = post(
        "/api/convex-polygon-intersection",
        json!({"first":first,"second":second}),
    )
    .await;
    assert_eq!(frames.last().unwrap()["result"], normal);
}
