#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let port = match std::env::var("BO_PORT") {
        Ok(value) => value.parse::<u16>()?,
        Err(std::env::VarError::NotPresent) => 3001,
        Err(error) => return Err(error.into()),
    };
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port)).await?;
    println!("BO API listening on http://{}", listener.local_addr()?);
    axum::serve(listener, computational_geometry::http::router()).await?;
    Ok(())
}
