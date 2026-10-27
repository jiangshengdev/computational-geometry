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
    captures: Option<Vec<Variable>>,
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
    // All displayed group fields are fixed geometry or membership-derived.
    // Preserve immutable Arc values held by earlier steps on invalidation.
    let mut groups_value = state.groups_value.borrow_mut();
    let groups_value = groups_value.get_or_insert_with(|| {
        Arc::from(format!(
            "[{}]",
            state
                .groups
                .iter()
                .enumerate()
                .map(|(id, g)| format!(
                    "{id}: {{ slope: {}, intercept: {}, members: {:?}, rightmost: {} }}",
                    g.slope,
                    g.intercept,
                    g.members,
                    if g.members.is_empty() {
                        "None".to_owned()
                    } else {
                        format!("Some({})", g.farthest().0)
                    }
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ))
    });
    vec![
        Variable::available(
            "active_groups",
            "Status<GroupId>",
            format!("{:?}", state.active.ordered()),
        ),
        Variable::available("groups", "Vec<Group>", Arc::clone(groups_value)),
        Variable::available(
            "group_of",
            "Vec<Option<GroupId>>",
            format!("{:?}", state.group_of),
        ),
    ]
}

fn shared_binding(name: &str) -> bool {
    matches!(
        name,
        "state" | "queue" | "result" | "groups" | "active_groups"
    )
}

pub(super) fn state_binding(locals: &[Variable]) -> Variable {
    let fields = locals
        .iter()
        .filter(|v| {
            matches!(
                v.name,
                "segments" | "shear" | "queue" | "result" | "groups" | "active_groups" | "group_of"
            )
        })
        .map(|v| {
            format!(
                "{}: {}",
                v.name,
                v.value.as_deref().expect("live state field")
            )
        })
        .collect::<Vec<_>>()
        .join(", ");
    Variable::available("state", "&mut SweepState", format!("{{ {fields} }}"))
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
            let state_value = state_binding(&step.execution.context.locals);
            step.execution.context.locals.push(state_value.clone());
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
                if let Some(parameter) = step
                    .execution
                    .context
                    .parameters
                    .iter_mut()
                    .find(|v| v.name == "state")
                {
                    *parameter = state_value;
                    step.execution.context.locals.retain(|v| v.name != "state");
                }
                if frame.parameters.iter().any(|v| v.name == "point") {
                    step.execution.context.locals.retain(|v| v.name != "point");
                }
                step.execution
                    .outer
                    .clone_from(&frame.caller.execution.outer);
                step.execution
                    .outer
                    .push(frame.caller.execution.context.clone());
                for outer in &mut step.execution.outer {
                    // A suspended mutable borrow cannot expose stale snapshots
                    // as the caller's current state. Refresh it on resumption.
                    for variable in outer.locals.iter_mut().chain(&mut outer.parameters) {
                        if frame.captures.is_none() && shared_binding(variable.name) {
                            variable.availability = "unavailable";
                            variable.value = None;
                        }
                    }
                }
                if let Some(captures) = &frame.captures {
                    step.execution.context.locals.clear();
                    step.execution.context.captures.clone_from(captures);
                }
                for variable in &mut step.execution.context.locals {
                    if !shared_binding(variable.name)
                        && !matches!(variable.name, "point" | "segments" | "shear")
                    {
                        variable.scope = Some(frame.function);
                        if frame.module == "members" {
                            variable.scope = match (boundary, variable.name) {
                                (
                                    1 | 2 | 3 | 6 | 10 | 11 | 12 | 18 | 19,
                                    "id" | "other" | "group" | "scan_geometry",
                                ) => Some("members.starts"),
                                (7 | 13 | 14 | 15, "a" | "b") => Some("members.cross"),
                                (4 | 8 | 14 | 16 | 20, "id" | "other") => Some("members.points"),
                                (4 | 5 | 9 | 17, "a" | "b") => Some("members.point_pairs"),
                                _ => variable.scope,
                            };
                        }
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
        call_site: (usize, usize),
        parameters: impl FnOnce() -> Vec<Variable>,
    ) {
        if let Some(steps) = &mut self.steps {
            let caller = steps.last_mut().expect("caller observation");
            let mut parameters = parameters();
            if matches!(
                module,
                "locate" | "members" | "activity" | "neighbors" | "schedule"
            ) {
                let binding = |name| {
                    caller
                        .execution
                        .context
                        .locals
                        .iter()
                        .chain(&caller.execution.context.parameters)
                        .find(|v| v.name == name)
                        .expect("actual call argument")
                        .clone()
                };
                let mut point = binding("point");
                point.r#type = "&Point";
                parameters.splice(0..0, [binding("state"), point]);
            }
            caller.execution.calls.push(ExecutionCall::pending(
                call_site.0,
                function,
                call_site.1,
                parameters.clone(),
                result_type,
            ));
            self.frames.push(Frame {
                id: self.next_call.get(),
                function,
                module,
                result_type,
                parameters,
                captures: None,
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
            let live = returned
                .execution
                .context
                .locals
                .iter()
                .chain(&returned.execution.context.parameters)
                .cloned()
                .collect::<Vec<_>>();
            let mut resumed = returned;
            resumed.execution = frame.caller.execution;
            resumed.execution.entry = false;
            resumed.execution.returning = false;
            resumed.execution.resuming = true;
            for variable in resumed
                .execution
                .context
                .locals
                .iter_mut()
                .chain(&mut resumed.execution.context.parameters)
            {
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

    /// A value moved into this call remains visible in the call arguments,
    /// but is no longer owned by the suspended caller or its resumed frame.
    pub(super) fn consume_caller_local(&mut self, name: &str) {
        if let Some(frame) = self.frames.last_mut()
            && let Some(variable) = frame
                .caller
                .execution
                .context
                .locals
                .iter_mut()
                .find(|v| v.name == name)
        {
            variable.availability = "unavailable";
            variable.value = None;
        }
    }

    /// Read-only closures expose only parameters, captures and their own locals.
    pub(super) fn capture(&mut self, names: &[&str]) {
        if let Some(frame) = self.frames.last_mut() {
            frame.captures = Some(
                names
                    .iter()
                    .map(|name| {
                        frame
                            .caller
                            .execution
                            .context
                            .locals
                            .iter()
                            .find(|v| v.name == *name)
                            .expect("captured binding")
                            .clone()
                    })
                    .collect(),
            );
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

    /// Finish one actual iteration, then expose its scope exit before asking
    /// for another element. Empty loops never call this method.
    pub(super) fn iteration_end(
        &mut self,
        state: &SweepState,
        point: &Point,
        line: usize,
        boundary: usize,
        bindings: &[(&'static str, &'static str)],
    ) -> Option<()> {
        self.block_end(line);
        self.observe(state, point, boundary, "micro", || {
            (
                vec![],
                bindings
                    .iter()
                    .map(|&(name, kind)| Variable::absent(name, kind, "unavailable"))
                    .collect(),
            )
        })?;
        self.block_after(line);
        self.control(line, "for", "pending");
        Some(())
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
