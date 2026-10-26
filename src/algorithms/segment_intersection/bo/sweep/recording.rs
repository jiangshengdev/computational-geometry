//! All full projections and textual values belong exclusively to recording.
use super::super::{teaching::*, trace_publication::TracePublication};
use super::{
    Event, SweepSegment,
    core::{Observer, Side, View},
};
use crate::{Rational, Segment};
use std::{cell::RefCell, collections::BTreeMap, sync::Arc};

pub(super) struct Recording<'emit, 'a, 'cancel> {
    publication: Option<TracePublication<'emit>>,
    segments: &'a [SweepSegment],
    shear: &'a Rational,
    input: Option<Arc<str>>,
    transformed: Option<Arc<str>>,
    capture: Option<RefCell<TraceCapture>>,
    cancelled: &'cancel dyn Fn() -> bool,
    next_call: usize,
    context: Option<ExecutionContext>,
    caller: Option<ExecutionContext>,
    event_projection: Option<EventProjection>,
    group_values: Option<Vec<Variable>>,
}

#[derive(Clone)]
struct EventProjection {
    point: Option<crate::Point>,
    side: Side,
    active: Vec<usize>,
    starts: Vec<usize>,
    ends: Vec<usize>,
    passes: Vec<usize>,
}

impl<'emit, 'a, 'cancel> Recording<'emit, 'a, 'cancel> {
    pub fn new(
        input: &[Segment],
        segments: &'a [SweepSegment],
        shear: &'a Rational,
        emit: Option<&'emit mut dyn FnMut(SweepTrace) -> bool>,
        cancelled: &'cancel dyn Fn() -> bool,
    ) -> Self {
        let enabled = emit.is_some();
        Self {
            publication: emit.map(|emit| TracePublication::new(shear, emit)),
            segments,
            shear,
            input: enabled.then(|| {
                Arc::from(format!(
                    "[{}]",
                    input
                        .iter()
                        .map(|s| format!(
                            "Segment {{ start: {}, end: {} }}",
                            point_value(&s.start),
                            point_value(&s.end)
                        ))
                        .collect::<Vec<_>>()
                        .join(", ")
                ))
            }),
            transformed: enabled.then(|| Arc::from(sweep_segments_value(segments))),
            capture: enabled.then(|| RefCell::new(TraceCapture::default())),
            cancelled,
            next_call: 1,
            context: None,
            caller: None,
            event_projection: None,
            group_values: None,
        }
    }
    fn project_event(&mut self, view: &View<'_>) {
        if self
            .event_projection
            .as_ref()
            .is_some_and(|p| p.point.as_ref() == view.point && p.side == view.side)
        {
            return;
        }
        let mut active = Vec::new();
        let mut starts = Vec::new();
        let mut ends = Vec::new();
        let mut passes = Vec::new();
        if let Some(p) = view.point {
            for (id, s) in self.segments.iter().enumerate() {
                if s.left == *p {
                    starts.push(id);
                }
                if s.right == *p {
                    ends.push(id);
                }
                if s.slope.is_none() {
                    continue;
                }
                let present = match view.side {
                    Side::Before => s.left.x < p.x && s.right.x >= p.x,
                    Side::Closed => s.left.x <= p.x && s.right.x >= p.x,
                    Side::After => s.left.x <= p.x && s.right.x > p.x,
                };
                if present {
                    active.push(id);
                }
                if s.left.x < p.x && s.right.x > p.x && s.y_at(&p.x) == p.y {
                    passes.push(id);
                }
            }
            active.sort_by(|&a, &b| {
                self.segments[a]
                    .y_at(&p.x)
                    .cmp(&self.segments[b].y_at(&p.x))
                    .then_with(|| match view.side {
                        Side::Before | Side::Closed => {
                            self.segments[b].slope.cmp(&self.segments[a].slope)
                        }
                        Side::After => self.segments[a].slope.cmp(&self.segments[b].slope),
                    })
                    .then(a.cmp(&b))
            });
        }
        self.event_projection = Some(EventProjection {
            point: view.point.cloned(),
            side: view.side,
            active,
            starts,
            ends,
            passes,
        });
    }
}

impl Observer for Recording<'_, '_, '_> {
    fn observe(&mut self, view: View<'_>) -> Option<()> {
        if (self.cancelled)() {
            return None;
        }
        if self.publication.is_none() {
            return Some(());
        }
        self.project_event(&view);
        let publication = self.publication.as_mut().expect("enabled recording");
        // Event queue geometry is exact. Its display starts are original ids;
        // cover ids are exposed separately as execution variables below.
        let queue: BTreeMap<_, _> = view
            .queue
            .buckets
            .iter()
            .map(|(point, bucket)| {
                let starts = view.groups.map_or_else(Vec::new, |groups| {
                    bucket
                        .starts
                        .iter()
                        .flat_map(|&id| {
                            groups.lines[groups.covers[id].line].members(&point.x, self.segments)
                        })
                        .collect()
                });
                (point.clone(), Event { starts })
            })
            .collect();
        let projection = self
            .event_projection
            .as_ref()
            .expect("enabled event projection")
            .clone();
        let EventProjection {
            active,
            starts,
            ends,
            passes,
            ..
        } = projection;
        let checked: Vec<_> = view.checked.into_iter().collect();
        let mut subjects = view.subjects.to_vec();
        if let (Some((a, b)), Some(groups), Some(point)) =
            (view.details.edge, view.groups, view.point)
        {
            for id in [a, b] {
                subjects
                    .extend(groups.lines[groups.covers[id].line].members(&point.x, self.segments));
            }
        }
        let action = if view.module == "initial" {
            "initial"
        } else if view.module == "take" {
            if view.boundary == 0 {
                "take-entry"
            } else {
                "take-pop"
            }
        } else if view.module == "done" {
            "take-empty"
        } else if view.intersection.is_some() && view.boundary == 1 {
            "record"
        } else if view.module == "event" && view.boundary == 0 {
            "take"
        } else if view.module == "event" && view.boundary == 2 {
            "complete"
        } else if view.module == "update" && view.boundary == 1 {
            if starts.iter().any(|id| !ends.contains(id)) {
                subjects = starts
                    .iter()
                    .copied()
                    .filter(|id| !ends.contains(id))
                    .collect();
                "insert"
            } else if passes.len() > 1 {
                subjects = passes.clone();
                "reorder"
            } else {
                subjects = ends
                    .iter()
                    .copied()
                    .filter(|id| !starts.contains(id))
                    .collect();
                "remove"
            }
        } else if view.module == "certificate" && view.boundary == 0 {
            "check"
        } else if view.module == "certificate"
            && view.boundary == 3
            && view.details.candidate.is_some_and(|c| {
                c.as_ref().is_some_and(|p| {
                    view.point.is_some_and(|current| p > current)
                        && publication
                            .steps()
                            .last()
                            .is_none_or(|previous| !previous.pending.contains(p))
                })
            })
        {
            "discover"
        } else {
            "micro"
        };
        let mut step = SweepStep::capture(
            action,
            view.point,
            &queue,
            &active,
            view.result,
            &checked,
            &subjects,
            self.input.as_ref().expect("enabled recording"),
            self.capture.as_ref().expect("enabled recording"),
        );
        step.sweep_context(
            self.transformed.as_ref().expect("enabled recording"),
            self.shear,
        );
        step.starts = starts;
        step.ends = ends;
        step.passes = passes;
        step.execution.module = view.module;
        step.execution.boundary = Some(view.boundary);
        step.execution.entry = view.boundary == 0
            && matches!(
                view.module,
                "prepare" | "members" | "certificate" | "take" | "event" | "update"
            );
        if let Some(p) = view.point {
            step.execution.context.locals.push(Variable::available(
                "point",
                "Point",
                point_value(p),
            ));
        }
        if view.module == "take" || view.module == "done" {
            let next = if view.module == "take" && view.boundary == 0 {
                Variable::absent("next", "Option<(Point, Bucket)>", "unassigned")
            } else {
                Variable::available("next","Option<(Point, Bucket)>",view.details.next.map_or_else(||"None".to_owned(),|(p,b)|format!("Some(({}, Bucket {{ cover_starts: {:?}, cover_ends: {:?}, points: {:?} }}))",point_value(p),b.starts,b.ends,b.points)))
            };
            if view.module == "take" {
                let mut call =
                    ExecutionCall::pending(1, "pop", 0, Vec::new(), "Option<(Point, Bucket)>");
                if view.boundary == 1 {
                    call.result = next.clone();
                }
                step.execution.calls.push(call);
            }
            step.execution.context.locals.push(next);
        }
        if view.groups.is_some() && self.group_values.is_none() {
            let mut variables = Vec::new();
            if let Some(groups) = view.groups {
                variables.push(Variable::available(
                    "covers",
                    "Vec<Cover>",
                    format!(
                        "[{}]",
                        groups
                            .covers
                            .iter()
                            .enumerate()
                            .map(|(id, c)| format!(
                                "Cover {{ id: {id}, line: {}, left: {}, right: {} }}",
                                c.line,
                                point_value(&c.left),
                                point_value(&c.right)
                            ))
                            .collect::<Vec<_>>()
                            .join(", ")
                    ),
                ));
            }
            if let Some(groups) = view.groups {
                let covers = variables
                    .iter()
                    .find(|v| v.name == "covers")
                    .and_then(|v| v.value.as_ref())
                    .expect("cover display");
                let lines = groups
                    .lines
                    .iter()
                    .map(|line| {
                        format!(
                            "Line {{ slope: {}, intercept: {} }}",
                            line.slope, line.intercept
                        )
                    })
                    .collect::<Vec<_>>()
                    .join(", ");
                variables.push(Variable::available(
                    "groups",
                    "Groups",
                    format!("Groups {{ lines: [{lines}], covers: {covers} }}"),
                ));
            }
            self.group_values = Some(variables);
        }
        if view.groups.is_some() {
            step.execution.context.locals.extend(
                self.group_values
                    .as_ref()
                    .expect("prepared group values")
                    .iter()
                    .cloned(),
            );
        }
        if !view.details.incident.is_empty()
            || matches!(view.module, "members" | "update")
            || (view.module == "driver" && view.boundary == 3)
        {
            step.execution.context.locals.push(Variable::available(
                "incident",
                "Vec<CoverId>",
                format!("{:?}", view.details.incident),
            ));
        }
        if let Some(members) = view.details.members {
            step.execution.context.locals.push(Variable::available(
                "members",
                "Vec<Vec<InputId>>",
                format!("{members:?}"),
            ));
        }
        if let Some(edge) = view.details.edge {
            step.execution.context.locals.push(Variable::available(
                "edge",
                "(CoverId, CoverId)",
                format!("{edge:?}"),
            ));
        }
        if let Some(candidate) = view.details.candidate {
            step.execution.context.locals.push(Variable::available(
                "candidate",
                "Option<Point>",
                optional_point_value(candidate),
            ));
        }
        if let Some(preparation) = view.details.preparation {
            use super::groups::Preparation;
            match preparation {
                Preparation::Line {
                    members,
                    slope,
                    intercept,
                } => {
                    step.execution.context.locals.push(Variable::available(
                        "line_members",
                        "Vec<InputId>",
                        format!("{members:?}"),
                    ));
                    step.execution.context.locals.push(Variable::available(
                        "line",
                        "(Rational, Rational)",
                        format!("({slope}, {intercept})"),
                    ));
                }
                Preparation::Union { cover } => {
                    step.execution.context.locals.push(Variable::available(
                        "cover",
                        "Cover",
                        format!(
                            "line: {}, {} → {}",
                            cover.line,
                            point_value(&cover.left),
                            point_value(&cover.right)
                        ),
                    ))
                }
                Preparation::Indexed { members } => step.execution.context.locals.push(
                    Variable::available("indexed_members", "Vec<InputId>", format!("{members:?}")),
                ),
                Preparation::Pair { .. } => {}
                Preparation::Ready { .. } => {}
            }
        }
        step.execution.context.locals.push(Variable::available(
            "side",
            "EventSide",
            match view.side {
                Side::Before => "Before",
                Side::Closed => "Closed",
                Side::After => "After",
            },
        ));
        if let Some(intersection) = view.intersection {
            step.execution.context.locals.push(Variable::available(
                "pair",
                "[usize; 2]",
                format!("{:?}", intersection.segments),
            ));
            step.execution.context.locals.push(Variable::available(
                "geometry",
                "Geometry",
                geometry_value(&intersection.geometry),
            ));
            let previous = if view.boundary == 0 {
                view.result
            } else {
                &view.result[..view.result.len() - 1]
            };
            let arguments = vec![
                Variable::available(
                    "self",
                    "&mut Vec<Intersection>",
                    intersections_value(previous),
                ),
                Variable::available("value", "Intersection", intersection_value(intersection)),
            ];
            let mut call = ExecutionCall::pending(1, "push", 0, arguments, "()");
            if view.boundary == 1 {
                call.result = Variable::available("return_value", "()", "()");
            }
            step.execution.calls.push(call);
        }
        if matches!(view.module, "prepare" | "members" | "certificate") {
            let return_type = match view.module {
                "prepare" => "Groups",
                "members" => "Vec<Vec<InputId>>",
                _ => "Option<Point>",
            };
            if view.boundary == 0 {
                self.caller = Some(step.execution.context.clone());
                self.context = Some(ExecutionContext {
                    id: self.next_call,
                    function: match view.module {
                        "prepare" => "prepare",
                        "members" => "recover_members",
                        _ => "schedule",
                    },
                    parameters: step
                        .execution
                        .context
                        .locals
                        .iter()
                        .filter(|v| match view.module {
                            "prepare" => matches!(v.name, "segments" | "shear"),
                            "members" => matches!(v.name, "incident" | "point"),
                            _ => matches!(v.name, "edge" | "point"),
                        })
                        .cloned()
                        .collect(),
                    locals: vec![Variable::absent("return_value", return_type, "unassigned")],
                    captures: Vec::new(),
                });
                self.next_call += 1;
            }
            if view.boundary == 2 {
                step.execution.returning = true;
                step.execution.control(
                    if view.module == "members" { 2 } else { 3 },
                    "return",
                    "returned",
                );
                let value = match view.module {
                    "prepare" => step
                        .execution
                        .context
                        .locals
                        .iter()
                        .find(|v| v.name == "groups")
                        .and_then(|v| v.value.clone())
                        .expect("prepared groups"),
                    "members" => Arc::from(format!(
                        "{:?}",
                        view.details.members.expect("recovered members")
                    )),
                    _ => Arc::from(optional_point_value(
                        view.details.candidate.expect("candidate computed"),
                    )),
                };
                if let Some(context) = &mut self.context {
                    context.locals[0] = Variable::available("return_value", return_type, value);
                }
            }
            if view.boundary == 3 {
                step.execution.control(
                    if view.module == "members" { 2 } else { 3 },
                    "return",
                    "pending",
                );
            }
            if view.boundary == 1 {
                let context = self.context.as_ref().expect("completed call");
                step.execution.calls.push(ExecutionCall {
                    line: match view.module {
                        "prepare" => 1,
                        "members" => 4,
                        _ => 7,
                    },
                    function: context.function,
                    occurrence: 0,
                    arguments: context.parameters.clone(),
                    result: context.locals[0].clone(),
                });
                self.context = None;
                self.caller = None;
                step.execution.resuming = true;
                step.execution.module = "driver";
                step.execution.boundary = Some(match view.module {
                    "prepare" => 1,
                    "members" => 4,
                    _ => 7,
                });
            }
        }
        if view.module == "initial" || (view.module == "driver" && matches!(view.boundary, 3 | 6)) {
            let (function, line, result_type) = if view.module == "initial" {
                ("prepare", 1, "Groups")
            } else if view.boundary == 3 {
                ("recover_members", 4, "Vec<Vec<InputId>>")
            } else {
                ("schedule", 7, "Option<Point>")
            };
            let arguments = step
                .execution
                .context
                .locals
                .iter()
                .filter(|v| match function {
                    "prepare" => matches!(v.name, "segments" | "shear" | "result"),
                    "recover_members" => {
                        matches!(v.name, "groups" | "incident" | "point" | "segments")
                    }
                    _ => matches!(v.name, "groups" | "queue" | "edge" | "point"),
                })
                .cloned()
                .collect();
            step.execution.calls.push(ExecutionCall::pending(
                line,
                function,
                0,
                arguments,
                result_type,
            ));
        }
        if let Some(context) = &self.context {
            step.execution
                .outer
                .push(self.caller.as_ref().expect("call has caller").clone());
            let values = &step.execution.context.locals;
            let parameter = |name| match context.function {
                "prepare" => matches!(name, "segments" | "shear" | "result"),
                "recover_members" => matches!(name, "groups" | "segments" | "incident" | "point"),
                "schedule" => matches!(name, "groups" | "queue" | "edge" | "point"),
                _ => false,
            };
            let local = |name| match context.function {
                "prepare" => matches!(
                    name,
                    "line_members"
                        | "line"
                        | "cover"
                        | "indexed_members"
                        | "geometry"
                        | "covers"
                        | "groups"
                        | "pair"
                ),
                "recover_members" => name == "members",
                "schedule" => name == "candidate",
                _ => false,
            };
            let parameters = values
                .iter()
                .filter(|v| parameter(v.name))
                .cloned()
                .collect();
            let mut locals = values
                .iter()
                .filter(|v| local(v.name))
                .cloned()
                .collect::<Vec<_>>();
            for previous in context.locals.iter().filter(|v| v.name != "return_value") {
                if locals.iter().any(|v| v.name == previous.name) {
                    continue;
                }
                let mut binding = previous.clone();
                let same_line_scope = context.function == "prepare"
                    && matches!(binding.name, "line_members" | "line")
                    && matches!(
                        view.details.preparation,
                        Some(
                            super::groups::Preparation::Pair { .. }
                                | super::groups::Preparation::Union { .. }
                                | super::groups::Preparation::Indexed { .. }
                        )
                    );
                if !same_line_scope {
                    binding.availability = "unavailable";
                    binding.value = None;
                }
                locals.push(binding);
            }
            step.execution.context = context.clone();
            step.execution.context.parameters = parameters;
            step.execution.context.locals.truncate(1);
            step.execution.context.locals.extend(locals);
            if let Some(stored) = &mut self.context {
                *stored = step.execution.context.clone();
            }
        }
        if view.module == "event" && view.boundary == 2 {
            step.execution.blocks = vec![ExecutionBlock {
                line: 3,
                phase: "before",
            }];
            let mut before = step.clone();
            before.action = "micro";
            before.phase = "processing";
            publication.steps().push(before);
            step.execution.blocks = vec![ExecutionBlock {
                line: 3,
                phase: "after",
            }];
        }
        publication.steps().push(step);
        publication.publish().then_some(())
    }
}

#[cfg(test)]
#[path = "recording_tests.rs"]
mod tests;
