//! HTTP boundary for exact intersections of submitted closed segments.

use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, rejection::JsonRejection},
    http::StatusCode,
    routing::post,
};
use serde::{Deserialize, Serialize};

#[cfg(test)]
#[path = "case_performance.rs"]
mod case_performance;

use crate::{
    Geometry, Intersection, Point, Rational, Segment, SweepTrace, intersections,
    trace_intersections,
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
}

#[derive(Serialize)]
struct StepDto {
    execution: ExecutionDto,
    phase: &'static str,
    action: &'static str,
    subjects: Vec<usize>,
    current: Option<PointDto>,
    pending: Vec<PointDto>,
    active: Vec<usize>,
    results: Vec<IntersectionDto>,
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
        indices: &mut std::collections::HashMap<String, usize>,
    ) -> Self {
        let mut variable = |variable: crate::Variable| VariableDto {
            name: variable.name,
            r#type: variable.r#type,
            availability: variable.availability,
            value: variable.value.map(|value| {
                *indices.entry(value).or_insert_with_key(|value| {
                    let index = values.len();
                    values.push(value.clone());
                    index
                })
            }),
        };
        Self {
            module: execution.module,
            boundary: execution.boundary,
            entry: execution.entry,
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
        let mut values = Vec::new();
        let mut indices = std::collections::HashMap::new();
        Self {
            shear: trace.shear.into(),
            steps: trace
                .steps
                .into_iter()
                .map(|step| StepDto {
                    execution: ExecutionDto::from_execution(
                        step.execution,
                        &mut values,
                        &mut indices,
                    ),
                    phase: step.phase,
                    action: step.action,
                    subjects: step.subjects,
                    current: step.current.map(PointDto::from),
                    pending: step.pending.into_iter().map(PointDto::from).collect(),
                    active: step.active,
                    results: step
                        .results
                        .into_iter()
                        .map(IntersectionDto::from)
                        .collect(),
                    checked: step.checked,
                    starts: step.starts,
                    ends: step.ends,
                    passes: step.passes,
                })
                .collect(),
            values,
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
) -> Result<Json<Response>, ApiError> {
    let Json(request) = payload.map_err(|error| bad_request(error.body_text()))?;
    let segments = request
        .segments
        .into_iter()
        .map(SegmentDto::into_segment)
        .collect::<Result<Vec<_>, _>>()?;
    let response = tokio::task::spawn_blocking(move || {
        let (results, trace) = if request.trace {
            let (results, trace) = trace_intersections(&segments);
            (results, Some(trace.into()))
        } else {
            (intersections(&segments), None)
        };
        Response {
            intersections: results.into_iter().map(IntersectionDto::from).collect(),
            trace,
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
    Ok(Json(response))
}

/// Serve the submitted geometry directly, independently of viewer presets.
pub fn router() -> Router {
    Router::new()
        .route("/api/intersections", post(compute))
        .layer(DefaultBodyLimit::disable())
}
