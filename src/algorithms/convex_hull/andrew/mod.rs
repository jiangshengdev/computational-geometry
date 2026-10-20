//! Exact Andrew monotone-chain convex hulls.

use crate::geometry::orientation;
use crate::{Point, Rational};

/// Return the convex hull vertices of an exact planar point set.
///
/// Coordinates are compared and turns are evaluated with arbitrary-precision
/// rational arithmetic, without floating-point approximations or tolerances.
/// Equal coordinates are merged; interior points and collinear intermediate
/// points on hull edges are excluded. The input slice is not modified.
///
/// A nondegenerate hull starts at the lexicographically smallest point (x,
/// then y), runs counterclockwise, and does not repeat its first vertex.
/// Empty input returns an empty vector; a single distinct point returns that
/// point. Two distinct points or an entirely collinear set return the two
/// extreme endpoints in lexicographic order. Input order and duplicate
/// coordinates do not affect the result, which contains coordinates, not indices.
///
/// Andrew's algorithm sorts and deduplicates the points, then scans each way.
/// For n input points, it uses O(n log n) comparison and arithmetic operations
/// and O(n) storage. Arbitrary-precision operation and coordinate-copying costs
/// depend on operand bit lengths; these are not constant-time bit operations.
pub fn convex_hull(points: &[Point]) -> Vec<Point> {
    execute(points, &mut |_| true).expect("ordinary computation is never cancelled")
}

/// The observer borrows the actual algorithm state; false stops remaining work.
pub(super) fn execute(
    points: &[Point],
    observe: &mut impl FnMut(&State) -> bool,
) -> Option<Vec<Point>> {
    let mut state = State {
        phase: Phase::Preprocess,
        action: Action::Input,
        order: (0..points.len()).collect(),
        lower: Vec::new(),
        upper: Vec::new(),
        lower_complete: false,
        upper_complete: false,
        current: None,
        position: None,
        subjects: Vec::new(),
        turn: None,
        removed: None,
        result: None,
    };
    emit(&mut state, Action::Input, observe)?;
    state
        .order
        .sort_unstable_by(|&a, &b| points[a].cmp(&points[b]).then(a.cmp(&b)));
    emit(&mut state, Action::Sort, observe)?;
    state.order.dedup_by(|a, b| points[*a] == points[*b]);
    emit(&mut state, Action::Deduplicate, observe)?;
    if state.order.len() <= 1 {
        state.result = Some(state.order.clone());
    } else {
        state.phase = Phase::Lower;
        chain(points, &mut state, observe)?;
        state.phase = Phase::Upper;
        chain(points, &mut state, observe)?;
        state.phase = Phase::Join;
        state.removed = state.lower.pop();
        emit(&mut state, Action::TrimLower, observe)?;
        state.removed = state.upper.pop();
        emit(&mut state, Action::TrimUpper, observe)?;
        state.removed = None;
        state.result = Some(state.lower.iter().chain(&state.upper).copied().collect());
    }
    emit(&mut state, Action::Complete, observe)?;
    Some(
        state
            .result
            .unwrap()
            .iter()
            .map(|&i| points[i].clone())
            .collect(),
    )
}

fn emit(state: &mut State, action: Action, observe: &mut impl FnMut(&State) -> bool) -> Option<()> {
    state.action = action;
    observe(state).then_some(())
}

fn chain(
    points: &[Point],
    state: &mut State,
    observe: &mut impl FnMut(&State) -> bool,
) -> Option<()> {
    let zero = Rational::from_integer(0.into());
    for offset in 0..state.order.len() {
        let position = match state.phase {
            Phase::Lower => offset,
            Phase::Upper => state.order.len() - 1 - offset,
            Phase::Preprocess | Phase::Join => unreachable!(),
        };
        let point = state.order[position];
        state.current = Some(point);
        state.position = Some(position);
        state.subjects.clear();
        state.turn = None;
        state.removed = None;
        emit(state, Action::Select, observe)?;
        loop {
            let hull = state.chain();
            if hull.len() < 2 {
                break;
            }
            let a = hull[hull.len() - 2];
            let b = hull[hull.len() - 1];
            let turn = orientation(&points[a], &points[b], &points[point]);
            state.subjects = vec![a, b, point];
            state.turn = Some(match turn.cmp(&zero) {
                std::cmp::Ordering::Greater => Turn::Left,
                std::cmp::Ordering::Less => Turn::Right,
                std::cmp::Ordering::Equal => Turn::Collinear,
            });
            state.removed = None;
            emit(state, Action::Turn, observe)?;
            if turn > zero {
                break;
            }
            state.removed = state.chain().pop();
            emit(state, Action::Pop, observe)?;
        }
        state.chain().push(point);
        state.removed = None;
        state.subjects.clear();
        state.turn = None;
        emit(state, Action::Push, observe)?;
    }
    state.current = None;
    state.position = None;
    match state.phase {
        Phase::Lower => state.lower_complete = true,
        Phase::Upper => state.upper_complete = true,
        Phase::Preprocess | Phase::Join => unreachable!(),
    }
    emit(state, Action::ChainComplete, observe)
}

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Phase {
    Preprocess,
    Lower,
    Upper,
    Join,
}
#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Action {
    Input,
    Sort,
    Deduplicate,
    Select,
    Turn,
    Pop,
    Push,
    ChainComplete,
    TrimLower,
    TrimUpper,
    Complete,
}
#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum Turn {
    Left,
    Right,
    Collinear,
}

#[derive(Serialize)]
pub(super) struct State {
    phase: Phase,
    action: Action,
    order: Vec<usize>,
    lower: Vec<usize>,
    upper: Vec<usize>,
    lower_complete: bool,
    upper_complete: bool,
    current: Option<usize>,
    position: Option<usize>,
    subjects: Vec<usize>,
    turn: Option<Turn>,
    removed: Option<usize>,
    result: Option<Vec<usize>>,
}

impl State {
    fn chain(&mut self) -> &mut Vec<usize> {
        match self.phase {
            Phase::Lower => &mut self.lower,
            Phase::Upper => &mut self.upper,
            Phase::Preprocess | Phase::Join => unreachable!(),
        }
    }
}
