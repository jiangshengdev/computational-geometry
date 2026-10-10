use axum::{Json, body::Body, http::Request};
use computational_geometry::http::router;
use serde::Deserialize;
use tower::ServiceExt;

#[derive(Deserialize)]
struct Response {
    trace: Trace,
}

#[derive(Deserialize)]
struct Trace {
    steps: Vec<Step>,
}

#[derive(Deserialize)]
struct Step {
    action: String,
    current: Option<Point>,
    active: Vec<usize>,
    starts: Vec<usize>,
    ends: Vec<usize>,
    passes: Vec<usize>,
}

#[derive(Deserialize)]
struct Point {
    x: Coordinate,
    y: Coordinate,
}

#[derive(Deserialize)]
struct Coordinate {
    numerator: String,
    denominator: String,
}

#[tokio::test]
async fn equal_x_trace_events_reorder_only_their_own_participants() {
    // Two separate crossings at (0,-2) and (0,2), followed by (2,0).
    // The latter catches stale height comparisons surviving to a different x.
    let segments = [
        (-1, -3, 3, 1),
        (-1, -1, 3, -5),
        (-1, 1, 3, 5),
        (-1, 3, 3, -1),
    ];
    let point = |x, y| {
        format!(
            r#"{{"x":{{"numerator":"{x}","denominator":"1"}},"y":{{"numerator":"{y}","denominator":"1"}}}}"#
        )
    };
    let segments = segments
        .into_iter()
        .map(|(x1, y1, x2, y2)| format!(r#"{{"start":{},"end":{}}}"#, point(x1, y1), point(x2, y2)))
        .collect::<Vec<_>>()
        .join(",");
    let response = router()
        .oneshot(
            Request::post("/api/intersections")
                .header("content-type", "application/json")
                .body(Body::from(format!(
                    r#"{{"segments":[{segments}],"trace":true}}"#
                )))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let Json(response) = Json::<Response>::from_bytes(&bytes).unwrap();
    for (x, y, before, after, mut participants, actions) in [
        (
            "0",
            "-2",
            vec![0, 1, 2, 3],
            vec![1, 0, 2, 3],
            vec![0, 1],
            vec!["take", "record", "reorder", "check", "complete"],
        ),
        (
            "0",
            "2",
            vec![1, 0, 2, 3],
            vec![1, 0, 3, 2],
            vec![2, 3],
            vec!["take", "record", "reorder", "check", "discover", "complete"],
        ),
        (
            "2",
            "0",
            vec![1, 0, 3, 2],
            vec![1, 3, 0, 2],
            vec![0, 3],
            vec!["take", "record", "reorder", "check", "check", "complete"],
        ),
    ] {
        let event: Vec<_> = response
            .trace
            .steps
            .iter()
            .filter(|step| {
                step.current.as_ref().is_some_and(|p| {
                    p.x.numerator == x
                        && p.y.numerator == y
                        && p.x.denominator == "1"
                        && p.y.denominator == "1"
                })
            })
            .collect();
        assert_eq!(
            event
                .iter()
                .map(|step| step.action.as_str())
                .collect::<Vec<_>>(),
            actions
        );
        assert_eq!(event[0].active, before);
        assert_eq!(event[1].active, before);
        for step in &event[2..] {
            assert_eq!(step.active, after);
        }
        participants.sort_unstable();
        for step in event {
            assert!(step.starts.is_empty());
            assert!(step.ends.is_empty());
            let mut passes = step.passes.clone();
            passes.sort_unstable();
            assert_eq!(passes, participants);
        }
    }
}
