//! Only live certificates are stored. BTree nodes are freed on deletion, so
//! allocation is bounded by live sources rather than all historical events.
use crate::Point;
use std::collections::{BTreeMap, BTreeSet};

pub(super) type Edge = (usize, usize);

pub(super) fn edge(a: usize, b: usize) -> Edge {
    (a.min(b), a.max(b))
}

#[derive(Default)]
pub(super) struct Bucket {
    pub starts: Vec<usize>,
    pub ends: Vec<usize>,
    pub points: Vec<usize>,
    certificates: BTreeSet<Edge>,
}

impl Bucket {
    fn empty(&self) -> bool {
        self.starts.is_empty()
            && self.ends.is_empty()
            && self.points.is_empty()
            && self.certificates.is_empty()
    }
}

#[derive(Default)]
pub(super) struct Queue {
    pub buckets: BTreeMap<Point, Bucket>,
    certificates: BTreeMap<Edge, Point>,
}

impl Queue {
    #[cfg(test)]
    pub(super) fn storage(&self) -> (usize, usize, usize, usize) {
        (
            self.buckets.len(),
            self.certificates.len(),
            self.buckets.values().map(|b| b.certificates.len()).sum(),
            self.buckets
                .values()
                .map(|b| b.starts.len() + b.ends.len() + b.points.len())
                .sum(),
        )
    }
    pub fn cancel(&mut self, edge: Edge) {
        if let Some(point) = self.certificates.remove(&edge) {
            let bucket = self
                .buckets
                .get_mut(&point)
                .expect("certificate bucket exists");
            bucket.certificates.remove(&edge);
            if bucket.empty() {
                self.buckets.remove(&point);
            }
        }
    }

    pub fn schedule(&mut self, edge: Edge, point: Point, current: &Point) {
        self.cancel(edge);
        if point > *current {
            self.buckets
                .entry(point.clone())
                .or_default()
                .certificates
                .insert(edge);
            self.certificates.insert(edge, point);
        }
    }

    pub fn pop(&mut self) -> Option<(Point, Bucket)> {
        let (point, mut bucket) = self.buckets.pop_first()?;
        for edge in std::mem::take(&mut bucket.certificates) {
            self.certificates.remove(&edge);
        }
        Some((point, bucket))
    }
}

#[cfg(test)]
#[path = "queue_tests.rs"]
mod tests;
