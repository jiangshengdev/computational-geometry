use super::*;

async fn trace(points: Value) -> Vec<Value> {
    let response = computational_geometry::http::router()
        .oneshot(
            Request::post("/api/convex-hull/trace")
                .header("content-type", "application/json")
                .body(Body::from(json!({"points": points}).to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["content-type"], "application/x-ndjson");
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    std::str::from_utf8(&bytes)
        .unwrap()
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect()
}

#[tokio::test]
async fn preprocessing_preserves_identity_and_exact_early_return() {
    let p = json!({"x": {"numerator":"9007199254740993", "denominator":"2"}, "y": {"numerator":"0", "denominator":"1"}});
    let frames = trace(json!([p, p])).await;
    assert_eq!(frames[0]["points"], json!([p, p]));
    let actions: Vec<_> = frames
        .iter()
        .skip(1)
        .filter_map(|frame| frame["step"]["action"].as_str())
        .collect();
    assert_eq!(actions, ["input", "sort", "deduplicate", "complete"]);
    assert_eq!(frames[1]["step"]["order"], json!([0, 1]));
    assert_eq!(frames[3]["step"]["order"], json!([0]));
    assert_eq!(frames[4]["step"]["result"], json!([0]));
    assert_eq!(
        frames.last().unwrap(),
        &json!({"type":"complete", "vertices":[p]})
    );
    let empty = trace(json!([])).await;
    assert_eq!(empty.last().unwrap()["vertices"], json!([]));
}

#[tokio::test]
async fn scan_records_each_turn_pop_push_and_endpoint_trim() {
    let points = json!([
        point("0", "0"),
        point("1", "0"),
        point("2", "1"),
        point("3", "-1")
    ]);
    let frames = trace(points.clone()).await;
    let steps: Vec<_> = frames
        .iter()
        .filter_map(|frame| frame.get("step"))
        .collect();
    let current: Vec<_> = steps
        .iter()
        .filter(|step| step["phase"] == "lower" && step["current"] == 3)
        .collect();
    assert_eq!(
        current
            .iter()
            .map(|s| s["action"].as_str().unwrap())
            .collect::<Vec<_>>(),
        ["select", "turn", "pop", "turn", "pop", "push"]
    );
    assert_eq!(current[1]["subjects"], json!([1, 2, 3]));
    assert_eq!(current[1]["turn"], "right");
    assert_eq!(current[1]["lower"], json!([0, 1, 2]));
    assert_eq!(current[2]["removed"], 2);
    assert_eq!(current[2]["lower"], json!([0, 1]));
    assert_eq!(current[3]["subjects"], json!([0, 1, 3]));
    assert_eq!(current[4]["lower"], json!([0]));
    assert_eq!(current[5]["lower"], json!([0, 3]));
    assert!(
        steps
            .iter()
            .filter(|s| s["phase"] == "upper")
            .all(|s| s["lower_complete"] == true && s["lower"] == json!([0, 3]))
    );
    let join: Vec<_> = steps.iter().filter(|s| s["phase"] == "join").collect();
    assert_eq!(
        join.iter()
            .map(|s| s["action"].as_str().unwrap())
            .collect::<Vec<_>>(),
        ["trim_lower", "trim_upper", "complete"]
    );
    assert_eq!(join[0]["removed"], 3);
    assert_eq!(join[1]["removed"], 0);
    assert_eq!(join[2]["result"], json!([0, 3, 2]));
    assert!(
        steps[..steps.len() - 1]
            .iter()
            .all(|s| s["result"].is_null())
    );
    let (_, normal) = post("/api/convex-hull", json!({"points":points})).await;
    assert_eq!(frames.last().unwrap()["vertices"], normal["vertices"]);
}

#[tokio::test]
async fn collinear_points_and_two_points_follow_the_real_scan() {
    for points in [
        json!([point("2", "2"), point("0", "0")]),
        json!([point("2", "2"), point("0", "0"), point("1", "1")]),
    ] {
        let frames = trace(points.clone()).await;
        let steps: Vec<_> = frames
            .iter()
            .filter_map(|frame| frame.get("step"))
            .collect();
        let turns: Vec<_> = steps.iter().filter(|s| s["action"] == "turn").collect();
        if points.as_array().unwrap().len() == 2 {
            assert!(turns.is_empty());
        } else {
            assert_eq!(turns.len(), 2);
            assert!(turns.iter().all(|s| s["turn"] == "collinear"));
        }
        assert_eq!(
            frames.last().unwrap()["vertices"],
            json!([point("0", "0"), point("2", "2")])
        );
    }
}
