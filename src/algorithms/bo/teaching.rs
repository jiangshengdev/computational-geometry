//! Teaching snapshots and reusable execution record construction.
use super::sweep::{Event, SweepSegment};
use crate::{Geometry, Intersection, Point, Rational};
use std::collections::BTreeMap;
use std::sync::Arc;

/// Teaching snapshots expose original coordinates and lexicographic event order.
/// Captured only when requested; ordinary callers use the same exact sweep.
#[derive(Clone, PartialEq, Eq)]
pub(crate) struct SweepStep {
    pub execution: Execution,
    pub phase: &'static str,
    pub action: &'static str,
    pub subjects: Vec<usize>,
    pub current: Option<Point>,
    pub pending: Vec<Point>,
    pub active: Vec<usize>,
    pub results: Vec<Intersection>,
    pub checked: Vec<[usize; 2]>,
    pub starts: Vec<usize>,
    pub ends: Vec<usize>,
    pub passes: Vec<usize>,
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct Execution {
    pub(crate) module: &'static str,
    pub(crate) boundary: Option<usize>,
    pub(crate) entry: bool,
    pub(crate) context: ExecutionContext,
    pub(crate) outer: Vec<ExecutionContext>,
    pub(crate) returning: bool,
    pub(crate) resuming: bool,
    pub(crate) calls: Vec<ExecutionCall>,
    pub(crate) controls: Vec<ExecutionControl>,
    pub(crate) blocks: Vec<ExecutionBlock>,
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionBlock {
    pub(crate) line: usize,
    pub(crate) phase: &'static str,
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionControl {
    pub(crate) line: usize,
    pub(crate) keyword: &'static str,
    pub(crate) occurrence: usize,
    pub(crate) state: &'static str,
}

impl Execution {
    pub(crate) fn control(&mut self, line: usize, keyword: &'static str, state: &'static str) {
        ExecutionControl::set(&mut self.controls, line, keyword, state);
    }
}

impl ExecutionControl {
    pub(crate) fn exhaust_loop(steps: &mut Vec<SweepStep>, line: usize) {
        let completed = steps.last_mut().expect("loop exit was captured");
        completed.execution.control(line, "for", "exhausted");
        if let [.., previous, completed] = steps.as_slice()
            && previous.execution.module == completed.execution.module
            && previous.execution.context.id == completed.execution.context.id
            && previous.execution.controls.iter().any(|control| {
                control.line == line && control.keyword == "for" && control.state == "pending"
            })
        {
            // The exit already carries the cleared bindings and control state.
            // Keep head stops only when another iteration actually follows.
            steps.remove(steps.len() - 2);
        }
    }

    pub(crate) fn set(
        controls: &mut Vec<Self>,
        line: usize,
        keyword: &'static str,
        state: &'static str,
    ) {
        if let Some(control) = controls
            .iter_mut()
            .find(|control| control.line == line && control.keyword == keyword)
        {
            control.state = state;
        } else {
            controls.push(ExecutionControl {
                line,
                keyword,
                occurrence: 0,
                state,
            });
        }
    }
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionCall {
    pub(crate) line: usize,
    pub(crate) function: &'static str,
    pub(crate) occurrence: usize,
    pub(crate) arguments: Vec<Variable>,
    pub(crate) result: Variable,
}

impl ExecutionCall {
    pub(crate) fn pending(
        line: usize,
        function: &'static str,
        occurrence: usize,
        arguments: Vec<Variable>,
        result_type: &'static str,
    ) -> Self {
        Self {
            line,
            function,
            occurrence,
            arguments,
            result: Variable::absent("return_value", result_type, "unassigned"),
        }
    }
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionContext {
    pub(crate) id: usize,
    pub(crate) function: &'static str,
    pub(crate) parameters: Vec<Variable>,
    pub(crate) locals: Vec<Variable>,
    pub(crate) captures: Vec<Variable>,
}

pub(crate) struct ClosureTrace {
    caller: SweepStep,
    current: SweepStep,
}

impl ClosureTrace {
    pub(crate) fn enter(
        steps: &mut Vec<SweepStep>,
        next_call: &std::cell::Cell<usize>,
        module: &'static str,
        function: &'static str,
        parameters: Vec<Variable>,
        captures: &[&str],
        result_type: &'static str,
    ) -> Self {
        let caller = steps.last().expect("call has a caller stop").clone();
        let mut current = caller.clone();
        current.action = "micro";
        current.execution.module = module;
        current.execution.boundary = Some(0);
        current.execution.entry = false;
        current.execution.resuming = false;
        current.execution.calls.clear();
        current.execution.controls.clear();
        current.execution.blocks.clear();
        current
            .execution
            .outer
            .push(caller.execution.context.clone());
        let id = next_call.get();
        next_call.set(id + 1);
        current.execution.context = ExecutionContext {
            id,
            function,
            parameters,
            locals: vec![Variable::absent("return_value", result_type, "unassigned")],
            captures: captures
                .iter()
                .map(|name| {
                    caller
                        .execution
                        .context
                        .locals
                        .iter()
                        .chain(&caller.execution.context.parameters)
                        .chain(&caller.execution.context.captures)
                        .find(|variable| variable.name == *name)
                        .expect("captured binding exists at the call site")
                        .clone()
                })
                .collect(),
        };
        steps.push(current.clone());
        Self { caller, current }
    }

    pub(crate) fn returned(mut self, steps: &mut Vec<SweepStep>, value: String) {
        self.current.execution.boundary = Some(1);
        self.current.execution.returning = true;
        let result_type = self.current.execution.context.locals[0].r#type;
        self.current.execution.context.locals[0] =
            Variable::available("return_value", result_type, value);
        steps.push(self.current);
        // Returning from one callback precedes any subsequent library callback.
        self.caller.execution.entry = false;
        self.caller.execution.resuming = true;
        self.caller.action = "micro";
        steps.push(self.caller);
    }
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct Variable {
    pub(crate) scope: Option<&'static str>,
    pub(crate) name: &'static str,
    pub(crate) r#type: &'static str,
    pub(crate) availability: &'static str,
    pub(crate) value: Option<Arc<str>>,
}

impl Variable {
    pub(crate) fn available(
        name: &'static str,
        r#type: &'static str,
        value: impl Into<Arc<str>>,
    ) -> Self {
        Self {
            name,
            scope: None,
            r#type,
            availability: "available",
            value: Some(value.into()),
        }
    }

    pub(crate) fn absent(
        name: &'static str,
        r#type: &'static str,
        availability: &'static str,
    ) -> Self {
        Self {
            name,
            scope: None,
            r#type,
            availability,
            value: None,
        }
    }
}

pub(crate) fn point_value(point: &Point) -> String {
    format!("({}, {})", point.x, point.y)
}

pub(crate) fn optional_point_value(point: &Option<Point>) -> String {
    point.as_ref().map_or_else(
        || "None".to_owned(),
        |point| format!("Some({})", point_value(point)),
    )
}

pub(crate) fn geometry_value(geometry: &Geometry) -> String {
    match geometry {
        Geometry::Point(point) => point_value(point),
        Geometry::Overlap { start, end } => {
            format!("{} → {}", point_value(start), point_value(end))
        }
    }
}

pub(crate) fn intersection_value(intersection: &Intersection) -> String {
    format!(
        "S{} × S{}: {}",
        intersection.segments[0],
        intersection.segments[1],
        geometry_value(&intersection.geometry)
    )
}

pub(crate) fn intersections_value(intersections: &[Intersection]) -> String {
    format!(
        "[{}]",
        intersections
            .iter()
            .map(intersection_value)
            .collect::<Vec<_>>()
            .join(", ")
    )
}

pub(crate) fn sweep_segment_value(segment: &SweepSegment) -> String {
    format!(
        "SweepSegment {{ left: {}, right: {}, slope: {}, intercept: {} }}",
        point_value(&segment.left),
        point_value(&segment.right),
        segment
            .slope
            .as_ref()
            .map_or_else(|| "None".to_owned(), |slope| format!("Some({slope})")),
        segment.intercept
    )
}

pub(crate) fn sweep_segments_value(segments: &[SweepSegment]) -> String {
    format!(
        "[{}]",
        segments
            .iter()
            .map(sweep_segment_value)
            .collect::<Vec<_>>()
            .join(", ")
    )
}

pub(crate) fn event_value(event: &Event) -> String {
    format!("Event {{ starts: {:?} }}", event.starts)
}

impl SweepStep {
    pub(crate) fn coalesce_block_successors(steps: &mut Vec<Self>, start: usize) {
        // A block-after observation and its immediate successor describe one
        // execution boundary. Compare every observable field (including call
        // identity, scope, availability and canvas), not merely the code line.
        // Finalize the event before publishing any of its frames: consumers
        // never have to revise an index they have already received.
        let observations = steps.split_off(start);
        for mut next in observations {
            if steps.len() > start {
                let previous = steps.last_mut().expect("preceding observation exists");
                if previous
                    .execution
                    .blocks
                    .iter()
                    .any(|block| block.phase == "after")
                {
                    let mut meanings = std::mem::take(&mut previous.execution.blocks);
                    let next_meanings = std::mem::take(&mut next.execution.blocks);
                    let same = *previous == next;
                    if same {
                        for meaning in next_meanings {
                            if !meanings.contains(&meaning) {
                                meanings.push(meaning);
                            }
                        }
                        previous.execution.blocks = meanings;
                        continue;
                    }
                    previous.execution.blocks = meanings;
                    next.execution.blocks = next_meanings;
                }
            }
            steps.push(next);
        }
    }

    pub(crate) fn block_before(steps: &mut Vec<Self>, boundary: usize, line: usize) {
        let mut before = steps.last().expect("block operation was captured").clone();
        before.execution.boundary = Some(boundary);
        before.execution.blocks = vec![ExecutionBlock {
            line,
            phase: "before",
        }];
        steps.insert(steps.len() - 1, before);
    }

    pub(crate) fn block_after(steps: &mut Vec<Self>, line: usize) {
        let mut after = steps.last().expect("block successor was captured").clone();
        after.execution.blocks = vec![ExecutionBlock {
            line,
            phase: "after",
        }];
        steps.insert(steps.len() - 1, after);
    }

    pub(crate) fn capture(
        action: &'static str,
        current: Option<&Point>,
        queue: &BTreeMap<Point, Event>,
        active: &[usize],
        results: &[Intersection],
        checked: &[[usize; 2]],
        subjects: &[usize],
        input_value: &Arc<str>,
    ) -> Self {
        Self {
            execution: Execution {
                outer: Vec::new(),
                returning: false,
                resuming: false,
                calls: Vec::new(),
                controls: Vec::new(),
                blocks: Vec::new(),
                module: action,
                boundary: None,
                entry: false,
                context: ExecutionContext {
                    id: 0,
                    captures: Vec::new(),
                    function: "sweep",
                    // The input binding has been shadowed by Vec<SweepSegment>.
                    parameters: vec![Variable {
                        scope: None,
                        name: "segments",
                        r#type: "&[Segment]",
                        availability: "shadowed",
                        value: Some(Arc::clone(input_value)),
                    }],
                    locals: vec![
                        Variable::available(
                            "queue",
                            "BTreeMap<Point, Event>",
                            format!(
                                "{{{}}}",
                                queue
                                    .iter()
                                    .map(|(point, event)| format!(
                                        "{}: {}",
                                        point_value(point),
                                        event_value(event)
                                    ))
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            ),
                        ),
                        Variable::available("active", "Vec<usize>", format!("{active:?}")),
                        Variable::available(
                            "result",
                            "Vec<Intersection>",
                            intersections_value(results),
                        ),
                    ],
                },
            },
            phase: match action {
                "initial" => "initial",
                "complete" => "processed",
                _ => "processing",
            },
            action,
            subjects: subjects.to_vec(),
            current: current.cloned(),
            pending: queue.keys().cloned().collect(),
            active: active.to_vec(),
            results: results.to_vec(),
            checked: checked.to_vec(),
            starts: Vec::new(),
            ends: Vec::new(),
            passes: Vec::new(),
        }
    }

    pub(crate) fn sweep_context(&mut self, segments_value: &Arc<str>, shear: &Rational) {
        let locals = &mut self.execution.context.locals;
        locals.push(Variable::available(
            "segments",
            "Vec<SweepSegment>",
            Arc::clone(segments_value),
        ));
        locals.push(Variable::available("shear", "Rational", shear.to_string()));
    }

    pub(crate) fn preserve_geometry(&mut self, previous: &Self) {
        self.current.clone_from(&previous.current);
        self.starts.clone_from(&previous.starts);
        self.ends.clone_from(&previous.ends);
        self.passes.clone_from(&previous.passes);
        self.checked.clone_from(&previous.checked);
        self.subjects.clone_from(&previous.subjects);
    }
}

pub(crate) struct SweepTrace {
    pub shear: Rational,
    pub steps: Vec<SweepStep>,
}

#[cfg(test)]
#[path = "teaching_tests.rs"]
mod tests;
