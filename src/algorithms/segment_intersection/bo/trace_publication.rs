//! Publishes finalized observations without mutating delivered steps.
use super::teaching::{SweepStep, SweepTrace};
use crate::geometry::PointRepresentation;
use crate::{Point, Rational};
use std::sync::Arc;

pub(super) struct TracePublication<'a> {
    steps: Vec<SweepStep>,
    retained: bool,
    projection: TraceProjection,
    emit: &'a mut dyn FnMut(SweepTrace) -> bool,
}

impl<'a> TracePublication<'a> {
    pub(super) fn new(shear: &Rational, emit: &'a mut dyn FnMut(SweepTrace) -> bool) -> Self {
        Self {
            steps: Vec::new(),
            retained: false,
            projection: TraceProjection::new(shear),
            emit,
        }
    }

    pub(super) fn steps(&mut self) -> &mut Vec<SweepStep> {
        &mut self.steps
    }

    pub(super) fn finish_event(
        &mut self,
        first_step: usize,
        checked: &[[usize; 2]],
        participants: (Vec<usize>, Vec<usize>, Vec<usize>),
    ) -> bool {
        let mut completed = self
            .steps
            .last()
            .expect("publish entry was captured")
            .clone();
        completed.action = "complete";
        completed.phase = "processed";
        completed.checked = checked.to_vec();
        completed.execution.boundary = Some(6);
        completed
            .execution
            .calls
            .last_mut()
            .expect("publish call")
            .result = super::teaching::Variable::available("return_value", "()", "()");
        self.steps.push(completed);
        let (starts, ends, passes) = participants;
        for step in &mut self.steps[first_step..] {
            step.starts.clone_from(&starts);
            step.ends.clone_from(&ends);
            step.passes.clone_from(&passes);
        }
        SweepStep::coalesce_block_successors(&mut self.steps, first_step);
        self.publish()
    }

    pub(super) fn publish(&mut self) -> bool {
        // Preserve the last observation in sweep coordinates for the next capture.
        let previous = self.steps.last().cloned();
        let mut ready: Vec<_> = self
            .steps
            .drain(..)
            .skip(usize::from(self.retained))
            .collect();
        self.projection.restore(&mut ready);
        if let Some(previous) = previous {
            self.steps.push(previous);
            self.retained = true;
        }
        ready.is_empty()
            || (self.emit)(SweepTrace {
                shear: self.projection.shear.clone(),
                steps: ready,
            })
    }
}

struct TraceProjection {
    shear: Rational,
    points: std::collections::HashMap<PointRepresentation, Point>,
    pending: Option<PendingProjection>,
}

struct PendingProjection {
    // Keep the source alive: its identity must remain valid across publication batches.
    source: Arc<[Point]>,
    restored: Arc<[Point]>,
}

impl TraceProjection {
    fn new(shear: &Rational) -> Self {
        Self {
            shear: shear.clone(),
            points: std::collections::HashMap::new(),
            pending: None,
        }
    }

    fn restore(&mut self, steps: &mut [SweepStep]) {
        for step in steps {
            if let Some(point) = &mut step.current {
                *point = self.restore_point(point);
            }
            if self
                .pending
                .as_ref()
                .is_none_or(|pending| !Arc::ptr_eq(&pending.source, &step.pending))
            {
                let restored = step
                    .pending
                    .iter()
                    .map(|point| self.restore_point(point))
                    .collect();
                self.pending = Some(PendingProjection {
                    source: Arc::clone(&step.pending),
                    restored,
                });
            }
            step.pending = Arc::clone(
                &self
                    .pending
                    .as_ref()
                    .expect("pending projection exists")
                    .restored,
            );
        }
    }

    fn restore_point(&mut self, point: &Point) -> Point {
        self.points
            .entry(PointRepresentation(point.clone()))
            .or_insert_with(|| {
                let mut original = point.clone();
                original.x -= &self.shear * &original.y;
                original
            })
            .clone()
    }
}

#[cfg(test)]
#[path = "trace_publication_tests.rs"]
mod tests;
