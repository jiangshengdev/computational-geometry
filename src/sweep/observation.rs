//! Shared lazy teaching construction; state is only borrowed at each observation.
use super::{Event, Point, Rational};
use crate::Intersection;
use crate::teaching::*;
use std::{cell::Cell, collections::BTreeMap, sync::Arc};

pub(super) struct Recorder<'batch, 'run> {
    pub(super) steps: Option<&'batch mut Vec<SweepStep>>,
    pub(super) input_value: &'run Option<Arc<str>>,
    pub(super) trace_segments: &'run Option<Arc<str>>,
    pub(super) next_call: &'run Cell<usize>,
    pub(super) cancelled: &'run dyn Fn() -> bool,
}

/// A temporary read of the one sweep state, never a second owner.
pub(super) struct ObservationState<'a> {
    pub(super) queue: &'a BTreeMap<Point, Event>,
    pub(super) active: &'a [usize],
    pub(super) result: &'a [Intersection],
    pub(super) height_order: &'a [std::cmp::Ordering],
    pub(super) shear: &'a Rational,
}

impl Recorder<'_, '_> {
    pub(super) fn observe(
        &mut self,
        state: ObservationState<'_>,
        point: &Point,
        module: &'static str,
        boundary: usize,
        values: impl FnOnce() -> (Vec<usize>, Vec<Variable>),
    ) -> Option<()> {
        if (self.cancelled)() {
            return None;
        }
        if let Some(steps) = &mut self.steps {
            let (subjects, locals) = values();
            let mut step = SweepStep::capture(
                "micro",
                Some(point),
                state.queue,
                state.active,
                state.result,
                &[],
                &subjects,
                self.input_value.as_ref().expect("tracing captures input"),
            );
            step.sweep_context(
                self.trace_segments
                    .as_ref()
                    .expect("tracing captures segments"),
                state.shear,
            );
            step.execution.module = module;
            step.execution.boundary = Some(boundary);
            step.execution.entry = boundary == 0;
            if let Some(previous) = steps.last()
                && previous.execution.module == module
                && boundary != 0
            {
                step.execution
                    .controls
                    .clone_from(&previous.execution.controls);
            }
            step.execution.context.locals.push(Variable::available(
                "point",
                "Point",
                point_value(point),
            ));
            step.execution.context.locals.push(Variable::available(
                "height_order",
                "Vec<Ordering>",
                format!("{:?}", state.height_order),
            ));
            step.execution.context.locals.extend(locals);
            steps.push(step);
        }
        Some(())
    }

    pub(super) fn call(&mut self, build: impl FnOnce() -> ExecutionCall) {
        if let Some(steps) = &mut self.steps {
            steps
                .last_mut()
                .expect("operation observation exists")
                .execution
                .calls
                .push(build());
        }
    }

    pub(super) fn control(&mut self, line: usize, keyword: &'static str, state: &'static str) {
        if let Some(steps) = &mut self.steps {
            if keyword == "for" && state == "exhausted" {
                ExecutionControl::exhaust_loop(steps, line);
            } else {
                steps
                    .last_mut()
                    .expect("control observation exists")
                    .execution
                    .control(line, keyword, state);
            }
        }
    }

    pub(super) fn reset_controls(&mut self, line: usize) {
        if let Some(steps) = &mut self.steps {
            steps
                .last_mut()
                .expect("loop observation exists")
                .execution
                .controls
                .retain(|control| control.line < line);
        }
    }

    pub(super) fn block_end(&mut self, boundary: usize, line: usize) {
        if let Some(steps) = &mut self.steps {
            SweepStep::block_before(steps, boundary, line);
            SweepStep::block_after(steps, line);
        }
    }
}

// These macros preserve lazy expression evaluation at the real operation sites.
macro_rules! observe {
    ($recording:expr, $state:expr, $point:expr, $module:expr, $boundary:expr, $subjects:expr, $locals:expr) => {
        $recording.observe($state, $point, $module, $boundary, || {
            (($subjects).to_vec(), $locals)
        })?;
    };
}
macro_rules! call {
    ($recording:expr, $line:expr, $function:expr, $arguments:expr, $result:expr) => {
        $recording.call(|| ExecutionCall {
            line: $line,
            function: $function,
            occurrence: 0,
            arguments: $arguments,
            result: $result,
        });
    };
}
macro_rules! pending_call {
    ($recording:expr, $line:expr, $function:expr, $occurrence:expr, $arguments:expr, $result_type:expr) => {
        $recording.call(|| {
            ExecutionCall::pending($line, $function, $occurrence, $arguments, $result_type)
        });
    };
}
macro_rules! control {
    ($recording:expr, $line:expr, $keyword:expr, $state:expr) => {
        $recording.control($line, $keyword, $state);
    };
}
macro_rules! reset_controls {
    ($recording:expr, $line:expr) => {
        $recording.reset_controls($line);
    };
}
macro_rules! block_end {
    ($recording:expr, $boundary:expr, $line:expr) => {
        $recording.block_end($boundary, $line);
    };
}
macro_rules! closure_call {
    ($recording:expr, $module:expr, $function:expr, $parameters:expr, $captures:expr, $type:expr, $body:expr, $format:expr) => {{
        let trace = $recording.steps.as_mut().map(|steps| {
            ClosureTrace::enter(
                steps,
                $recording.next_call,
                $module,
                $function,
                $parameters,
                $captures,
                $type,
            )
        });
        let value = $body;
        if let Some(trace) = trace {
            trace.returned(
                $recording.steps.as_mut().expect("tracing is enabled"),
                ($format)(&value),
            );
        }
        value
    }};
}
pub(super) use {block_end, call, closure_call, control, observe, pending_call, reset_controls};
