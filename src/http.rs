//! HTTP boundary for exact intersections of submitted closed segments.

use axum::{
    Json, Router,
    body::Body,
    extract::{DefaultBodyLimit, rejection::JsonRejection},
    http::StatusCode,
    response::IntoResponse,
    routing::post,
};
use serde::{Deserialize, Serialize};
use std::{
    cell::Cell,
    sync::atomic::{AtomicU64, Ordering},
    time::Instant,
};

static NEXT_TRACE_ID: AtomicU64 = AtomicU64::new(1);

struct TraceLifecycle {
    id: u64,
    started: Instant,
    status: Cell<&'static str>,
    sent_steps: Cell<usize>,
}

impl TraceLifecycle {
    fn start(id: u64) -> Self {
        eprintln!("trace_lifecycle id={id} status=started sent_steps=0 elapsed_ms=0");
        Self {
            id,
            started: Instant::now(),
            // Unwinding or an unexpected exit must never report completion.
            status: Cell::new("failed"),
            sent_steps: Cell::new(0),
        }
    }
}

impl Drop for TraceLifecycle {
    fn drop(&mut self) {
        eprintln!(
            "trace_lifecycle id={} status={} sent_steps={} elapsed_ms={}",
            self.id,
            if std::thread::panicking() { "failed" } else { self.status.get() },
            self.sent_steps.get(),
            self.started.elapsed().as_millis(),
        );
    }
}

#[cfg(test)]
#[path = "case_performance.rs"]
mod case_performance;

use crate::{
    Geometry, Intersection, Point, Rational, Segment, SweepTrace, intersections,
    stream_intersections,
};

#[derive(Deserialize)]
struct Request {
    segments: Vec<SegmentDto>,
    #[serde(default)]
    trace: bool,
}

#[derive(Deserialize)]
struct SegmentDto {
    start: PointDto,
    end: PointDto,
}

#[derive(Deserialize, Serialize)]
struct PointDto {
    x: RationalDto,
    y: RationalDto,
}

#[derive(Deserialize, Serialize)]
struct RationalDto {
    numerator: String,
    denominator: String,
}

#[derive(Serialize)]
struct Response {
    intersections: Vec<IntersectionDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    trace: Option<TraceDto>,
}

#[derive(Serialize)]
struct TraceDto {
    shear: RationalDto,
    steps: Vec<StepDto>,
    values: Vec<String>,
    point_values: Vec<PointDto>,
    result_values: Vec<IntersectionDto>,
}

#[derive(Serialize)]
struct TraceFrame {
    #[serde(flatten)]
    trace: TraceDto,
    complete: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    intersections: Option<Vec<IntersectionDto>>,
}

#[derive(Default)]
struct TraceEncoder {
    indices: std::collections::HashMap<std::sync::Arc<str>, usize>,
    point_indices: std::collections::BTreeMap<Point, usize>,
    result_indices: std::collections::HashMap<[usize; 2], usize>,
}

#[derive(Serialize)]
struct StepDto {
    execution: ExecutionDto,
    phase: &'static str,
    action: &'static str,
    subjects: Vec<usize>,
    current: Option<PointDto>,
    pending: Vec<usize>,
    active: Vec<usize>,
    results: Vec<usize>,
    checked: Vec<[usize; 2]>,
    starts: Vec<usize>,
    ends: Vec<usize>,
    passes: Vec<usize>,
}

#[derive(Serialize)]
struct ExecutionDto {
    module: &'static str,
    boundary: Option<usize>,
    entry: bool,
    context: ExecutionContextDto,
    calls: Vec<ExecutionCallDto>,
}

#[derive(Serialize)]
struct ExecutionCallDto {
    line: usize,
    function: &'static str,
    occurrence: usize,
    arguments: Vec<VariableDto>,
    result: VariableDto,
}

#[derive(Serialize)]
struct ExecutionContextDto {
    function: &'static str,
    parameters: Vec<VariableDto>,
    locals: Vec<VariableDto>,
}

#[derive(Serialize)]
struct VariableDto {
    name: &'static str,
    r#type: &'static str,
    availability: &'static str,
    value: Option<usize>,
}

impl ExecutionDto {
    fn from_execution(
        execution: crate::Execution,
        values: &mut Vec<String>,
        indices: &mut std::collections::HashMap<std::sync::Arc<str>, usize>,
        offset: usize,
    ) -> Self {
        let mut variable = |variable: crate::Variable| VariableDto {
            name: variable.name,
            r#type: variable.r#type,
            availability: variable.availability,
            value: variable.value.map(|value| {
                *indices.entry(value).or_insert_with_key(|value| {
                    let index = offset + values.len();
                    values.push(value.to_string());
                    index
                })
            }),
        };
        Self {
            module: execution.module,
            boundary: execution.boundary,
            entry: execution.entry,
            calls: execution
                .calls
                .into_iter()
                .map(|call| ExecutionCallDto {
                    line: call.line,
                    function: call.function,
                    occurrence: call.occurrence,
                    arguments: call.arguments.into_iter().map(&mut variable).collect(),
                    result: variable(call.result),
                })
                .collect(),
            context: ExecutionContextDto {
                function: execution.context.function,
                parameters: execution
                    .context
                    .parameters
                    .into_iter()
                    .map(&mut variable)
                    .collect(),
                locals: execution.context.locals.into_iter().map(variable).collect(),
            },
        }
    }
}

impl From<SweepTrace> for TraceDto {
    fn from(trace: SweepTrace) -> Self {
        TraceEncoder::default().encode(trace)
    }
}

impl TraceEncoder {
    fn encode(&mut self, trace: SweepTrace) -> TraceDto {
        let mut values = Vec::new();
        let value_offset = self.indices.len();
        let mut point_values = Vec::new();
        let point_offset = self.point_indices.len();
        let mut result_values = Vec::new();
        let result_offset = self.result_indices.len();
        TraceDto {
            shear: trace.shear.into(),
            steps: trace
                .steps
                .into_iter()
                .map(|step| StepDto {
                    execution: ExecutionDto::from_execution(
                        step.execution,
                        &mut values,
                        &mut self.indices,
                        value_offset,
                    ),
                    phase: step.phase,
                    action: step.action,
                    subjects: step.subjects,
                    current: step.current.map(PointDto::from),
                    pending: step
                        .pending
                        .into_iter()
                        .map(|point| {
                            *self.point_indices.entry(point).or_insert_with_key(|point| {
                                let index = point_offset + point_values.len();
                                point_values.push(PointDto::from(point.clone()));
                                index
                            })
                        })
                        .collect(),
                    active: step.active,
                    results: step
                        .results
                        .into_iter()
                        .map(|intersection| {
                            *self.result_indices
                                .entry(intersection.segments)
                                .or_insert_with(|| {
                                    let index = result_offset + result_values.len();
                                    result_values.push(IntersectionDto::from(intersection));
                                    index
                                })
                        })
                        .collect(),
                    checked: step.checked,
                    starts: step.starts,
                    ends: step.ends,
                    passes: step.passes,
                })
                .collect(),
            values,
            point_values,
            result_values,
        }
    }
}

#[derive(Serialize)]
struct IntersectionDto {
    segments: [usize; 2],
    geometry: GeometryDto,
}

#[derive(Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
enum GeometryDto {
    Point { point: PointDto },
    Overlap { start: PointDto, end: PointDto },
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

type ApiError = (StatusCode, Json<ErrorBody>);

fn bad_request(message: impl Into<String>) -> ApiError {
    (
        StatusCode::BAD_REQUEST,
        Json(ErrorBody {
            error: message.into(),
        }),
    )
}

fn is_decimal_integer(value: &str) -> bool {
    let digits = value.strip_prefix(['-', '+']).unwrap_or(value);
    !digits.is_empty() && digits.bytes().all(|byte| byte.is_ascii_digit())
}

impl RationalDto {
    fn into_rational(self) -> Result<Rational, ApiError> {
        if !is_decimal_integer(&self.numerator) || !is_decimal_integer(&self.denominator) {
            return Err(bad_request("坐标的分子和分母必须是十进制整数字符串"));
        }
        format!("{}/{}", self.numerator, self.denominator)
            .parse()
            .map_err(|_| bad_request("坐标分母不得为零"))
    }
}

impl PointDto {
    fn into_point(self) -> Result<Point, ApiError> {
        Ok(Point {
            x: self.x.into_rational()?,
            y: self.y.into_rational()?,
        })
    }
}

impl SegmentDto {
    fn into_segment(self) -> Result<Segment, ApiError> {
        Ok(Segment {
            start: self.start.into_point()?,
            end: self.end.into_point()?,
        })
    }
}

impl From<Rational> for RationalDto {
    fn from(value: Rational) -> Self {
        Self {
            numerator: value.numer().to_string(),
            denominator: value.denom().to_string(),
        }
    }
}

impl From<Point> for PointDto {
    fn from(point: Point) -> Self {
        Self {
            x: point.x.into(),
            y: point.y.into(),
        }
    }
}

impl From<Intersection> for IntersectionDto {
    fn from(intersection: Intersection) -> Self {
        Self {
            segments: intersection.segments,
            geometry: match intersection.geometry {
                Geometry::Point(point) => GeometryDto::Point {
                    point: point.into(),
                },
                Geometry::Overlap { start, end } => GeometryDto::Overlap {
                    start: start.into(),
                    end: end.into(),
                },
            },
        }
    }
}

async fn compute(
    payload: Result<Json<Request>, JsonRejection>,
) -> Result<axum::response::Response, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let segments = request
        .segments
        .into_iter()
        .map(SegmentDto::into_segment)
        .collect::<Result<Vec<_>, _>>()?;
    if request.trace {
        let trace_id = NEXT_TRACE_ID.fetch_add(1, Ordering::Relaxed);
        let (sender, receiver) = tokio::sync::mpsc::channel::<Result<Vec<u8>, std::io::Error>>(1);
        tokio::task::spawn_blocking(move || {
            let lifecycle = TraceLifecycle::start(trace_id);
            let serialization_failed = Cell::new(false);
            let shear = crate::choose_shear(&segments);
            let mut encoder = TraceEncoder::default();
            let send = |frame: TraceFrame| {
                let step_count = frame.trace.steps.len();
                let bytes = serde_json::to_vec(&frame).map(|mut bytes| {
                    bytes.push(b'\n');
                    bytes
                });
                match bytes {
                    Ok(bytes) => {
                        if sender.blocking_send(Ok(bytes)).is_ok() {
                            // Accepted by the bounded transport queue, not proof of client receipt.
                            lifecycle.sent_steps.set(lifecycle.sent_steps.get() + step_count);
                            true
                        } else {
                            lifecycle.status.set("cancelled");
                            false
                        }
                    }
                    Err(error) => {
                        serialization_failed.set(true);
                        lifecycle.status.set("failed");
                        let _ = sender.blocking_send(Err(std::io::Error::other(error)));
                        false
                    }
                }
            };
            let results = stream_intersections(
                &segments,
                &mut |steps| {
                    send(TraceFrame {
                        trace: encoder.encode(SweepTrace { shear: shear.clone(), steps }),
                        complete: false,
                        intersections: None,
                    })
                },
                &|| sender.is_closed(),
            );
            if let Some(results) = results {
                if send(TraceFrame {
                    trace: encoder.encode(SweepTrace { shear, steps: Vec::new() }),
                    complete: true,
                    intersections: Some(results.into_iter().map(IntersectionDto::from).collect()),
                }) {
                    lifecycle.status.set("completed");
                }
            } else if !serialization_failed.get() {
                lifecycle.status.set("cancelled");
            }
        });
        let body = Body::from_stream(tokio_stream::wrappers::ReceiverStream::new(receiver));
        let mut response = ([(axum::http::header::CONTENT_TYPE, "application/x-ndjson")], body).into_response();
        response.headers_mut().insert(
            "x-trace-id",
            axum::http::HeaderValue::from_str(&trace_id.to_string()).expect("numeric trace id is a valid header"),
        );
        return Ok(response);
    }
    let response = tokio::task::spawn_blocking(move || {
        Response {
            intersections: intersections(&segments).into_iter().map(IntersectionDto::from).collect(),
            trace: None,
        }
    })
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorBody {
                error: "交点计算失败".into(),
            }),
        )
    })?;
    Ok(Json(response).into_response())
}

/// Serve the submitted geometry directly, independently of viewer presets.
pub fn router() -> Router {
    Router::new()
        .route("/api/intersections", post(compute))
        .layer(DefaultBodyLimit::disable())
}
