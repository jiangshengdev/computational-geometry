//! Borrowed snapshots of the single intersection execution path.
use super::{ConvexPolygonIntersection, Inside};
use crate::Point;
use serde::Serialize;

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Phase {
    Containment,
    Chasing,
    Normalize,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Action {
    Containment,
    Relation,
    Collect,
    Inside,
    Advance,
    Terminate,
    Normalize,
    Complete,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Boundary {
    First,
    Second,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Reason {
    Contained,
    Intersection,
    SharedEdge,
    InteriorVertex,
    FirstCrossing,
    Crossing,
    CollinearOutside,
    CrossLeftBInside,
    CrossLeftBOutside,
    CrossRightAOutside,
    CrossRightAInside,
    OppositeContact,
    SeparatedParallel,
    BothCircuits,
    FirstTwoCircuits,
    SecondTwoCircuits,
    Candidates,
}

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Side {
    Left,
    Right,
    Collinear,
}

impl From<std::cmp::Ordering> for Side {
    fn from(value: std::cmp::Ordering) -> Self {
        match value {
            std::cmp::Ordering::Less => Self::Right,
            std::cmp::Ordering::Equal => Self::Collinear,
            std::cmp::Ordering::Greater => Self::Left,
        }
    }
}

#[derive(Serialize)]
pub(super) struct Relation {
    pub cross: Side,
    pub first_side: Side,
    pub second_side: Side,
    pub contact: Contact,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Contact {
    None,
    Point,
    Overlap,
}

pub(super) struct State {
    pub phase: Phase,
    pub action: Action,
    pub boundary: Option<Boundary>,
    pub vertex: Option<usize>,
    pub contained: Option<bool>,
    pub edges: Option<[[usize; 2]; 2]>,
    pub relation: Option<Relation>,
    pub inside: Inside,
    pub candidates: Vec<Point>,
    pub added: Vec<usize>,
    pub reason: Option<Reason>,
    pub result: Option<ConvexPolygonIntersection>,
}

impl State {
    pub fn new() -> Self {
        Self {
            phase: Phase::Containment,
            action: Action::Containment,
            boundary: None,
            vertex: None,
            contained: None,
            edges: None,
            relation: None,
            inside: Inside::Unknown,
            candidates: Vec::new(),
            added: Vec::new(),
            reason: None,
            result: None,
        }
    }
    pub fn emit(&mut self, action: Action, observe: &mut impl FnMut(&Self) -> bool) -> Option<()> {
        self.action = action;
        observe(self).then_some(())
    }
    pub fn finish(
        &mut self,
        result: ConvexPolygonIntersection,
        observe: &mut impl FnMut(&Self) -> bool,
    ) -> Option<ConvexPolygonIntersection> {
        self.added.clear();
        self.result = Some(result);
        self.emit(Action::Complete, observe)?;
        self.result.take()
    }
}
