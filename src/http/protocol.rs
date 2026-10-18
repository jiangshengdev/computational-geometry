//! Shared exact coordinate transport and validation for algorithm HTTP routes.

use crate::{Point, Rational};
use axum::{Json, http::StatusCode};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub(crate) struct PointDto {
    x: RationalDto,
    y: RationalDto,
}

#[derive(Deserialize, Serialize)]
pub(crate) struct RationalDto {
    numerator: String,
    denominator: String,
}

#[derive(Serialize)]
pub(crate) struct ErrorBody {
    pub(crate) error: String,
}

pub(crate) type ApiError = (StatusCode, Json<ErrorBody>);

pub(crate) fn bad_request(message: impl Into<String>) -> ApiError {
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
    pub(crate) fn into_point(self) -> Result<Point, ApiError> {
        Ok(Point {
            x: self.x.into_rational()?,
            y: self.y.into_rational()?,
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
