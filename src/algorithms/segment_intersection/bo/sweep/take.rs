//! Pops and binds the next actual queue event, including the empty-queue exit.
use super::*;

pub(super) struct TakenEvent {
    pub(super) point: Point,
    pub(super) event: Event,
    pub(super) first_step: usize,
}

pub(super) fn take(state: &mut SweepState, recording: &mut Recorder<'_, '_>) -> Option<TakenEvent> {
    let SweepState {
        queue,
        active,
        result,
        shear,
        ..
    } = state;
    let shear = &*shear;
    let input_value = recording.input_value;
    let trace_segments = recording.trace_segments;
    if let Some(steps) = &mut recording.steps {
        let mut step = SweepStep::capture(
            "take-entry",
            None,
            queue,
            active,
            result,
            &[],
            &[],
            input_value.as_ref().expect("tracing captures input"),
            recording.capture,
        );
        step.preserve_geometry(steps.last().expect("initial snapshot exists"));
        step.take_context(
            0,
            None,
            None,
            trace_segments.as_ref().expect("tracing captures segments"),
            shear,
        );
        let queue_argument = step
            .execution
            .context
            .locals
            .iter()
            .find(|variable| variable.name == "queue")
            .and_then(|variable| variable.value.as_ref())
            .expect("queue is available")
            .clone();
        step.execution.calls.push(ExecutionCall::pending(
            1,
            "pop_first",
            0,
            vec![Variable::available(
                "self",
                "&mut BTreeMap<Point, Event>",
                queue_argument,
            )],
            "Option<(Point, Event)>",
        ));
        steps.push(step);
    }
    let next = queue.pop_first();
    if let Some(steps) = &mut recording.steps {
        let mut step = SweepStep::capture(
            "take-pop",
            None,
            queue,
            active,
            result,
            &[],
            &[],
            input_value.as_ref().expect("tracing captures input"),
            recording.capture,
        );
        step.preserve_geometry(steps.last().expect("entry snapshot exists"));
        step.take_context(
            1,
            Some(&next),
            None,
            trace_segments.as_ref().expect("tracing captures segments"),
            shear,
        );
        step.execution.calls.push(ExecutionCall {
            line: 1,
            function: "pop_first",
            occurrence: 0,
            arguments: vec![Variable::available(
                "self",
                "&mut BTreeMap<Point, Event>",
                steps
                    .last()
                    .expect("take entry exists")
                    .execution
                    .context
                    .locals
                    .iter()
                    .find(|variable| variable.name == "queue")
                    .and_then(|variable| variable.value.as_ref())
                    .expect("queue is available")
                    .clone(),
            )],
            result: Variable::available(
                "return_value",
                "Option<(Point, Event)>",
                next.as_ref().map_or_else(
                    || "None".to_owned(),
                    |(point, event)| {
                        format!("Some(({}, {}))", point_value(point), event_value(event))
                    },
                ),
            ),
        });
        steps.push(step);
    }
    let Some((point, event)) = next else {
        if let Some(steps) = &mut recording.steps {
            let mut step = SweepStep::capture(
                "take-empty",
                None,
                queue,
                active,
                result,
                &[],
                &[],
                input_value.as_ref().expect("tracing captures input"),
                recording.capture,
            );
            step.preserve_geometry(steps.last().expect("pop snapshot exists"));
            step.take_context(
                3,
                Some(&next),
                None,
                trace_segments.as_ref().expect("tracing captures segments"),
                shear,
            );
            step.execution.control(2, "else", "entered");
            step.execution.control(2, "break", "pending");
            step.execution.calls.clone_from(
                &steps
                    .last()
                    .expect("pop observation exists")
                    .execution
                    .calls,
            );
            step.action = "micro";
            steps.push(step.clone());
            step.execution.boundary = Some(4);
            step.execution.control(2, "break", "completed");
            step.action = "take-empty";
            steps.push(step);
        }
        return None;
    };
    let first_step = recording.steps.as_ref().map_or(0, |steps| steps.len());
    if let Some(steps) = &mut recording.steps {
        let mut step = SweepStep::capture(
            "take",
            Some(&point),
            queue,
            active,
            result,
            &[],
            &[],
            input_value.as_ref().expect("tracing captures input"),
            recording.capture,
        );
        step.take_context(
            2,
            None,
            Some((&point, &event)),
            trace_segments.as_ref().expect("tracing captures segments"),
            shear,
        );
        step.execution.control(2, "else", "skipped");
        step.execution.control(2, "break", "skipped");
        step.execution.calls.clone_from(
            &steps
                .last()
                .expect("pop observation exists")
                .execution
                .calls,
        );
        steps.push(step);
    }
    Some(TakenEvent {
        point,
        event,
        first_step,
    })
}

impl SweepStep {
    fn take_context(
        &mut self,
        boundary: usize,
        next: Option<&Option<(Point, Event)>>,
        bound: Option<(&Point, &Event)>,
        segments_value: &Arc<str>,
        shear: &Rational,
    ) {
        self.execution.module = "take";
        self.execution.boundary = Some(boundary);
        self.execution.entry = boundary == 0;
        self.sweep_context(segments_value, shear);
        self.take_bindings(boundary, next, bound);
    }

    fn take_bindings(
        &mut self,
        boundary: usize,
        next: Option<&Option<(Point, Event)>>,
        bound: Option<(&Point, &Event)>,
    ) {
        let locals = &mut self.execution.context.locals;
        locals.push(match next {
            Some(next) => Variable::available(
                "next",
                "Option<(Point, Event)>",
                next.as_ref().map_or_else(
                    || "None".to_owned(),
                    |(point, event)| {
                        format!("Some(({}, {}))", point_value(point), event_value(event))
                    },
                ),
            ),
            None => Variable::absent(
                "next",
                "Option<(Point, Event)>",
                if boundary == 0 {
                    "unassigned"
                } else {
                    "unavailable"
                },
            ),
        });
        match bound {
            Some((point, event)) => {
                locals.push(Variable::available("point", "Point", point_value(point)));
                locals.push(Variable::available("event", "Event", event_value(event)));
            }
            None => {
                let availability = if boundary < 2 {
                    "unassigned"
                } else {
                    "unavailable"
                };
                locals.push(Variable::absent("point", "Point", availability));
                locals.push(Variable::absent("event", "Event", availability));
            }
        }
    }
}
