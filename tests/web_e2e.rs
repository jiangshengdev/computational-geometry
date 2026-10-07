//! The public browser-to-HTTP seam: a real ephemeral server, no binary build.
#[tokio::test(flavor = "multi_thread")]
async fn browser_to_bo() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move {
        axum::serve(listener, computational_geometry::http::router())
            .await
            .unwrap();
    });
    let status = tokio::task::spawn_blocking(move || {
        let mut command = std::process::Command::new("pnpm");
        command
            .current_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/web"))
            .args(["exec", "playwright", "test"])
            .env("BO_API_URL", format!("http://{address}"));
        if let Ok(filter) = std::env::var("BO_E2E_GREP") {
            command.args(["--grep", &filter]);
        }
        command
            .status()
            .expect("pnpm and Playwright must be installed")
    })
    .await
    .unwrap();
    server.abort();
    assert!(
        status.success(),
        "browser-to-BO acceptance failed: {status}"
    );
}
