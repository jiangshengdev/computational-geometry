//! Lazy snapshots of the sole live state, with actual function call identities.
use super::super::teaching::*;
use super::{Point, SweepState};
use std::{
    cell::{Cell, RefCell},
    sync::Arc,
};

pub(super) struct Recorder<'batch, 'run> {
    pub(super) steps: Option<&'batch mut Vec<SweepStep>>,
    pub(super) input_value: &'run Option<Arc<str>>,
    pub(super) trace_segments: &'run Option<Arc<str>>,
    pub(super) next_call: &'run Cell<usize>,
    pub(super) cancelled: &'run dyn Fn() -> bool,
    pub(super) capture: &'run RefCell<TraceCapture>,
    pub(super) frames: Vec<Frame>,
}

pub(super) struct Frame {
    id: usize,
    function: &'static str,
    module: &'static str,
    result_type: &'static str,
    parameters: Vec<Variable>,
    caller: SweepStep,
}

/// Everything here, including member expansion and formatting, is recording-only.
pub(super) fn active_members(state: &SweepState) -> Vec<usize> {
    state
        .active
        .ordered()
        .into_iter()
        .flat_map(|g| state.groups[g].members.iter().copied())
        .collect()
}

pub(super) fn status_bindings(state: &SweepState) -> Vec<Variable> {
    vec![
        Variable::available(
            "active_groups",
            "Status<GroupId>",
            format!("{:?}", state.active.ordered()),
        ),
        Variable::available(
            "groups",
            "Vec<Group>",
            format!(
                "[{}]",
                state
                    .groups
                    .iter()
                    .enumerate()
                    .map(|(id, g)| {
                        format!(
                            "{id}: {{ slope: {}, intercept: {}, members: {:?}, rightmost: {} }}",
                            g.slope,
                            g.intercept,
                            g.members,
                            if g.members.is_empty() {
                                "None".to_owned()
                            } else {
                                format!("Some({})", g.farthest().0)
                            }
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
        ),
    ]
}

fn shared_binding(name: &str) -> bool {
    matches!(name, "queue" | "result" | "groups" | "active_groups")
}

impl Recorder<'_, '_> {
    pub(super) fn observe(
        &mut self,
        state: &SweepState,
        point: &Point,
        boundary: usize,
        action: &'static str,
        values: impl FnOnce() -> (Vec<usize>, Vec<Variable>),
    ) -> Option<()> {
        if (self.cancelled)() {
            return None;
        }
        if let Some(steps) = &mut self.steps {
            let (subjects, locals) = values();
            let active_groups = state.active.ordered();
            let active = active_groups
                .iter()
                .flat_map(|&g| state.groups[g].members.iter().copied())
                .collect::<Vec<_>>();
            let mut step = SweepStep::capture(
                action,
                Some(point),
                &state.queue,
                &active,
                &state.result,
                &[],
                &subjects,
                self.input_value.as_ref().expect("trace input"),
                self.capture,
            );
            // The projected member list is canvas data, not the algorithm's status.
            step.execution.context.locals.retain(|v| v.name != "active");
            step.sweep_context(
                self.trace_segments.as_ref().expect("trace segments"),
                &state.shear,
            );
            step.execution.context.locals.extend(status_bindings(state));
            step.execution.context.locals.extend([Variable::available(
                "point",
                "&Point",
                point_value(point),
            )]);
            step.execution.context.locals.extend(locals);
            if let Some(frame) = self.frames.last() {
                step.execution.module = frame.module;
                step.execution.context.id = frame.id;
                step.execution.context.function = frame.function;
                step.execution
                    .context
                    .parameters
                    .clone_from(&frame.parameters);
                step.execution
                    .outer
                    .clone_from(&frame.caller.execution.outer);
                step.execution
                    .outer
                    .push(frame.caller.execution.context.clone());
                for outer in &mut step.execution.outer {
                    // A suspended mutable borrow cannot expose stale snapshots
                    // as the caller's current state. Refresh it on resumption.
                    for variable in &mut outer.locals {
                        if shared_binding(variable.name) {
                            variable.availability = "unavailable";
                            variable.value = None;
                        }
                    }
                }
                for variable in &mut step.execution.context.locals {
                    if !shared_binding(variable.name)
                        && !matches!(variable.name, "point" | "segments" | "shear")
                    {
                        variable.scope = Some(frame.function);
                    }
                }
                step.execution.context.locals.push(Variable::absent(
                    "return_value",
                    frame.result_type,
                    "unassigned",
                ));
            } else {
                step.execution.module = "sweep";
            }
            // Omitted bindings have not changed. Only an explicit absent
            // value at the actual scope exit makes a binding unavailable.
            if boundary != 0
                && let Some(previous) = steps.last()
                && previous.execution.context.id == step.execution.context.id
            {
                for variable in &previous.execution.context.locals {
                    if !step
                        .execution
                        .context
                        .locals
                        .iter()
                        .any(|current| current.name == variable.name)
                    {
                        step.execution.context.locals.push(variable.clone());
                    }
                }
            }
            step.execution.boundary = Some(boundary);
            step.execution.entry = boundary == 0;
            steps.push(step);
        }
        Some(())
    }

    pub(super) fn enter(
        &mut self,
        module: &'static str,
        function: &'static str,
        result_type: &'static str,
        parameters: impl FnOnce() -> Vec<Variable>,
    ) {
        if let Some(steps) = &mut self.steps {
            let caller = steps.last_mut().expect("caller observation");
            let parameters = parameters();
            caller.execution.calls.push(ExecutionCall::pending(
                caller.execution.boundary.unwrap_or(0),
                function,
                0,
                parameters.clone(),
                result_type,
            ));
            self.frames.push(Frame {
                id: self.next_call.get(),
                function,
                module,
                result_type,
                parameters,
                caller: caller.clone(),
            });
            self.next_call.set(self.next_call.get() + 1);
        }
    }

    /// Called after the actual return value was computed; never invent a call
    /// for an empty loop, and resume before the next real call.
    pub(super) fn leave(&mut self, result: impl FnOnce() -> Variable) {
        if let Some(steps) = &mut self.steps {
            let frame = self.frames.pop().expect("entered function");
            let result = result();
            let mut returned = steps.last().expect("return boundary").clone();
            returned.action = "micro";
            returned.execution.entry = false;
            returned.execution.returning = true;
            returned
                .execution
                .context
                .locals
                .retain(|v| v.name != "return_value");
            returned.execution.context.locals.push(result.clone());
            let return_line = returned
                .execution
                .controls
                .iter()
                .find(|control| control.keyword == "return" && control.state == "pending")
                .expect("real return has a pending boundary")
                .line;
            returned
                .execution
                .control(return_line, "return", "returned");
            steps.push(returned.clone());
            let live = returned.execution.context.locals.clone();
            let mut resumed = returned;
            resumed.execution = frame.caller.execution;
            resumed.execution.entry = false;
            resumed.execution.returning = false;
            resumed.execution.resuming = true;
            for variable in &mut resumed.execution.context.locals {
                if shared_binding(variable.name)
                    && let Some(value) = live.iter().find(|v| v.name == variable.name)
                {
                    *variable = value.clone();
                }
            }
            if let Some(call) = resumed.execution.calls.last_mut() {
                call.result = result;
            }
            steps.push(resumed);
        }
    }

    pub(super) fn retire_parameter(&mut self, name: &str) {
        if let Some(frame) = self.frames.last_mut() {
            let parameter = frame
                .parameters
                .iter_mut()
                .find(|p| p.name == name)
                .expect("live parameter");
            parameter.availability = "unavailable";
            parameter.value = None;
        }
    }

    pub(super) fn control(&mut self, line: usize, keyword: &'static str, status: &'static str) {
        if let Some(steps) = &mut self.steps {
            steps
                .last_mut()
                .expect("observation")
                .execution
                .control(line, keyword, status);
        }
    }

    pub(super) fn call(&mut self, build: impl FnOnce() -> ExecutionCall) {
        if let Some(steps) = &mut self.steps {
            steps
                .last_mut()
                .expect("observation")
                .execution
                .calls
                .push(build());
        }
    }

    pub(super) fn block_end(&mut self, line: usize) {
        if let Some(steps) = &mut self.steps {
            let mut before = steps.last().expect("block body").clone();
            before.action = "micro";
            before.execution.blocks = vec![ExecutionBlock {
                line,
                phase: "before",
            }];
            steps.push(before);
        }
    }

    pub(super) fn block_after(&mut self, line: usize) {
        if let Some(steps) = &mut self.steps {
            let step = steps.last_mut().expect("block successor");
            step.execution.blocks.push(ExecutionBlock {
                line,
                phase: "after",
            });
        }
    }
}
