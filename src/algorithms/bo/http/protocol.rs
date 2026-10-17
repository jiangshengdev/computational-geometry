//! Exact HTTP values and request-scoped trace dictionaries.
use super::super::sweep::SweepOutcome;
use super::super::teaching::{Execution, ExecutionContext, SweepTrace, Variable};
use crate::geometry::PointRepresentation;
use crate::{Geometry, Intersection, Point, Rational, Segment};
use axum::{Json, http::StatusCode};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub(super) struct Request {
    pub(super) segments: Vec<SegmentDto>,
    #[serde(default)]
    pub(super) trace: bool,
}

#[derive(Deserialize)]
pub(super) struct SegmentDto {
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
pub(super) struct Response {
    pub(super) intersections: Vec<IntersectionDto>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) trace: Option<TraceDto>,
}

#[derive(Serialize)]
pub(super) struct TraceDto {
    shear: RationalDto,
    steps: Vec<StepDto>,
    values: Vec<String>,
    point_values: Vec<PointDto>,
    result_values: Vec<IntersectionDto>,
}

#[derive(Serialize)]
pub(super) struct TraceFrame {
    #[serde(flatten)]
    trace: TraceDto,
    complete: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    intersections: Option<Vec<IntersectionDto>>,
}

impl TraceFrame {
    pub(super) fn step_count(&self) -> usize {
        self.trace.steps.len()
    }
}

#[derive(Default)]
pub(super) struct TraceEncoder {
    indices: std::collections::HashMap<std::sync::Arc<str>, usize>,
    point_indices: std::collections::HashMap<PointRepresentation, usize>,
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
    outer: Vec<ExecutionContextDto>,
    returning: bool,
    resuming: bool,
    calls: Vec<ExecutionCallDto>,
    controls: Vec<ExecutionControlDto>,
    blocks: Vec<ExecutionBlockDto>,
}

#[derive(Serialize)]
struct ExecutionBlockDto {
    line: usize,
    phase: &'static str,
}

#[derive(Serialize)]
struct ExecutionControlDto {
    line: usize,
    keyword: &'static str,
    occurrence: usize,
    state: &'static str,
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
    id: usize,
    function: &'static str,
    parameters: Vec<VariableDto>,
    locals: Vec<VariableDto>,
    captures: Vec<VariableDto>,
}

impl ExecutionContextDto {
    fn from_context(
        context: ExecutionContext,
        variable: &mut impl FnMut(Variable) -> VariableDto,
    ) -> Self {
        Self {
            id: context.id,
            function: context.function,
            parameters: context.parameters.into_iter().map(&mut *variable).collect(),
            locals: context.locals.into_iter().map(&mut *variable).collect(),
            captures: context.captures.into_iter().map(variable).collect(),
        }
    }
}

#[derive(Serialize)]
struct VariableDto {
    scope: Option<&'static str>,
    name: &'static str,
    r#type: &'static str,
    availability: &'static str,
    value: Option<usize>,
}

impl ExecutionDto {
    fn from_execution(
        execution: Execution,
        values: &mut Vec<String>,
        indices: &mut std::collections::HashMap<std::sync::Arc<str>, usize>,
        offset: usize,
    ) -> Self {
        let mut variable = |variable: Variable| VariableDto {
            scope: variable.scope,
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
            returning: execution.returning,
            resuming: execution.resuming,
            module: execution.module,
            boundary: execution.boundary,
            entry: execution.entry,
            blocks: execution
                .blocks
                .into_iter()
                .map(|block| ExecutionBlockDto {
                    line: block.line,
                    phase: block.phase,
                })
                .collect(),
            controls: execution
                .controls
                .into_iter()
                .map(|control| ExecutionControlDto {
                    line: control.line,
                    keyword: control.keyword,
                    occurrence: control.occurrence,
                    state: control.state,
                })
                .collect(),
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
            context: ExecutionContextDto::from_context(execution.context, &mut variable),
            outer: execution
                .outer
                .into_iter()
                .map(|context| ExecutionContextDto::from_context(context, &mut variable))
                .collect(),
        }
    }
}

impl From<SweepTrace> for TraceDto {
    fn from(trace: SweepTrace) -> Self {
        TraceEncoder::default().encode(trace)
    }
}

impl TraceEncoder {
    pub(super) fn batch(&mut self, trace: SweepTrace) -> TraceFrame {
        TraceFrame {
            trace: self.encode(trace),
            complete: false,
            intersections: None,
        }
    }

    pub(super) fn complete(&mut self, outcome: SweepOutcome) -> TraceFrame {
        TraceFrame {
            trace: self.encode(SweepTrace {
                shear: outcome.shear,
                steps: Vec::new(),
            }),
            complete: true,
            intersections: Some(
                outcome
                    .intersections
                    .into_iter()
                    .map(IntersectionDto::from)
                    .collect(),
            ),
        }
    }

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
                        .iter()
                        .map(|point| {
                            *self
                                .point_indices
                                .entry(PointRepresentation(point.clone()))
                                .or_insert_with_key(|point| {
                                    let index = point_offset + point_values.len();
                                    point_values.push(PointDto::from(point.0.clone()));
                                    index
                                })
                        })
                        .collect(),
                    active: step.active.to_vec(),
                    results: step
                        .results
                        .iter()
                        .map(|intersection| {
                            *self
                                .result_indices
                                .entry(intersection.segments)
                                .or_insert_with(|| {
                                    let index = result_offset + result_values.len();
                                    result_values.push(IntersectionDto::from(intersection.clone()));
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
pub(super) struct IntersectionDto {
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
pub(super) struct ErrorBody {
    pub(super) error: String,
}

pub(super) type ApiError = (StatusCode, Json<ErrorBody>);

pub(super) fn bad_request(message: impl Into<String>) -> ApiError {
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
    pub(super) fn into_segment(self) -> Result<Segment, ApiError> {
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
