//! Fixed supporting lines and two indexes of the same dynamic membership.
use super::{Point, Rational, SweepSegment};
use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct Group {
    pub(super) slope: Rational,
    pub(super) intercept: Rational,
    pub(super) members: BTreeSet<usize>,
    right_ends: BTreeSet<(Rational, usize)>,
}

impl Group {
    pub(super) fn height(&self, u: &Rational) -> Rational {
        &self.slope * u + &self.intercept
    }

    pub(super) fn insert(&mut self, id: usize, segment: &SweepSegment) {
        self.members.insert(id);
        self.right_ends.insert((segment.right.x.clone(), id));
    }

    pub(super) fn remove(&mut self, id: usize, segment: &SweepSegment) {
        self.members.remove(&id);
        self.right_ends.remove(&(segment.right.x.clone(), id));
    }

    pub(super) fn farthest(&self) -> &(Rational, usize) {
        self.right_ends.last().expect("active group has a member")
    }
}

pub(super) fn initialize(
    segments: &[SweepSegment],
    cancelled: &dyn Fn() -> bool,
) -> Option<(Vec<Group>, Vec<Option<usize>>)> {
    let mut keys = BTreeMap::new();
    let mut groups = Vec::new();
    let mut group_of = Vec::with_capacity(segments.len());
    for segment in segments {
        if cancelled() {
            return None;
        }
        let Some(slope) = &segment.slope else {
            group_of.push(None);
            continue;
        };
        let id = *keys
            .entry((slope.clone(), segment.intercept.clone()))
            .or_insert_with(|| {
                let id = groups.len();
                groups.push(Group {
                    slope: slope.clone(),
                    intercept: segment.intercept.clone(),
                    members: BTreeSet::new(),
                    right_ends: BTreeSet::new(),
                });
                id
            });
        group_of.push(Some(id));
    }
    Some((groups, group_of))
}

#[derive(Clone, Copy)]
pub(super) enum Side {
    Before,
    After,
}

pub(super) fn compare(groups: &[Group], a: usize, b: usize, point: &Point, side: Side) -> Ordering {
    if a == b {
        return Ordering::Equal;
    }
    let height = groups[a].height(&point.x);
    height.cmp(&groups[b].height(&point.x)).then_with(|| {
        let slopes = groups[a].slope.cmp(&groups[b].slope);
        if height < point.y || (height == point.y && matches!(side, Side::After)) {
            slopes
        } else {
            slopes.reverse()
        }
    })
}
