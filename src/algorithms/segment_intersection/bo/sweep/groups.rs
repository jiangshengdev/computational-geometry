//! Closed support-line intervals: each same-line pair is reported only at its
//! later start. Centered indexes store each original interval at exactly one node.
use super::SweepSegment;
use crate::{Geometry, Intersection, Point, Rational};
use std::collections::BTreeSet;

pub(super) struct Cover {
    pub line: usize,
    pub left: Point,
    pub right: Point,
}

pub(super) struct Line {
    pub slope: Rational,
    pub intercept: Rational,
    members: Option<Box<Index>>,
}

impl Line {
    pub fn y_at(&self, x: &Rational) -> Rational {
        &self.slope * x + &self.intercept
    }
    pub fn members(&self, x: &Rational, segments: &[SweepSegment]) -> Vec<usize> {
        let mut result = Vec::new();
        let mut node = self.members.as_deref();
        while let Some(index) = node {
            if x < &index.center {
                result.extend(
                    index
                        .by_start
                        .iter()
                        .copied()
                        .take_while(|&id| segments[id].left.x <= *x),
                );
                node = index.left.as_deref();
            } else if x > &index.center {
                result.extend(
                    index
                        .by_end
                        .iter()
                        .copied()
                        .take_while(|&id| segments[id].right.x >= *x),
                );
                node = index.right.as_deref();
            } else {
                result.extend(&index.by_start);
                break;
            }
        }
        result
    }
}

struct Index {
    center: Rational,
    by_start: Vec<usize>,
    by_end: Vec<usize>,
    left: Option<Box<Index>>,
    right: Option<Box<Index>>,
}

impl Index {
    fn build(
        ids: Vec<usize>,
        endpoints: Vec<(Rational, usize)>,
        segments: &[SweepSegment],
    ) -> Option<Box<Self>> {
        if ids.is_empty() {
            return None;
        }
        let center = endpoints[endpoints.len() / 2].0.clone();
        let mut left = Vec::new();
        let mut right = Vec::new();
        let mut by_start = Vec::new();
        for id in ids {
            if segments[id].right.x < center {
                left.push(id);
            } else if segments[id].left.x > center {
                right.push(id);
            } else {
                by_start.push(id);
            }
        }
        let mut left_ends = Vec::new();
        let mut right_ends = Vec::new();
        for endpoint in endpoints {
            if segments[endpoint.1].right.x < center {
                left_ends.push(endpoint);
            } else if segments[endpoint.1].left.x > center {
                right_ends.push(endpoint);
            }
        }
        // The parent vectors have been consumed before recursion. Sibling
        // workspaces contain disjoint intervals; peak live storage is linear.
        by_start.sort_by(|&a, &b| segments[a].left.x.cmp(&segments[b].left.x));
        let mut by_end = by_start.clone();
        by_end.sort_by(|&a, &b| segments[b].right.x.cmp(&segments[a].right.x));
        Some(Box::new(Self {
            center,
            by_start,
            by_end,
            left: Self::build(left, left_ends, segments),
            right: Self::build(right, right_ends, segments),
        }))
    }
}

pub(super) struct Groups {
    pub lines: Vec<Line>,
    pub covers: Vec<Cover>,
}

pub(super) enum Preparation<'a> {
    Pair {
        intersection: &'a Intersection,
        boundary: usize,
    },
    Line {
        members: &'a [usize],
        slope: &'a Rational,
        intercept: &'a Rational,
    },
    Union {
        cover: &'a Cover,
    },
    Indexed {
        members: &'a [usize],
    },
    Ready {
        groups: &'a Groups,
    },
}

/// Reporting is synchronous: there is no second O(k) result buffer.
pub(super) fn prepare(
    segments: &[SweepSegment],
    shear: &Rational,
    result: &mut Vec<Intersection>,
    report: &mut impl FnMut(&[Intersection], Preparation<'_>) -> Option<()>,
    cancelled: &dyn Fn() -> bool,
) -> Option<Groups> {
    let mut ids: Vec<_> = (0..segments.len())
        .filter(|&id| segments[id].slope.is_some())
        .collect();
    ids.sort_by(|&a, &b| {
        segments[a]
            .slope
            .cmp(&segments[b].slope)
            .then_with(|| segments[a].intercept.cmp(&segments[b].intercept))
            .then_with(|| segments[a].left.x.cmp(&segments[b].left.x))
            .then(a.cmp(&b))
    });
    let mut lines = Vec::new();
    let mut covers: Vec<Cover> = Vec::new();
    let mut offset = 0;
    while offset < ids.len() {
        if cancelled() {
            return None;
        }
        let first = &segments[ids[offset]];
        let mut end = offset + 1;
        while end < ids.len()
            && segments[ids[end]].slope == first.slope
            && segments[ids[end]].intercept == first.intercept
        {
            end += 1;
        }
        let members = &ids[offset..end];
        report(
            result,
            Preparation::Line {
                members,
                slope: first.slope.as_ref().expect("nonzero"),
                intercept: &first.intercept,
            },
        )?;
        let mut active: BTreeSet<(Rational, usize)> = BTreeSet::new();
        for &id in members {
            let segment = &segments[id];
            while active
                .first()
                .is_some_and(|(right, _)| right < &segment.left.x)
            {
                active.pop_first();
            }
            for (right, other) in &active {
                if cancelled() {
                    return None;
                }
                let start = restore(&segment.left, shear);
                let end = if right < &segment.right.x {
                    restore(&segments[*other].right, shear)
                } else {
                    restore(&segment.right, shear)
                };
                let pair = [id.min(*other), id.max(*other)];
                let intersection = Intersection {
                    segments: pair,
                    geometry: if start == end {
                        Geometry::Point(start)
                    } else {
                        Geometry::Overlap { start, end }
                    },
                };
                report(
                    result,
                    Preparation::Pair {
                        intersection: &intersection,
                        boundary: 0,
                    },
                )?;
                result.push(intersection);
                report(
                    result,
                    Preparation::Pair {
                        intersection: result.last().expect("just appended"),
                        boundary: 1,
                    },
                )?;
            }
            active.insert((segment.right.x.clone(), id));
            if let Some(cover) = covers.last_mut()
                && cover.line == lines.len()
                && segment.left.x <= cover.right.x
            {
                if segment.right.x > cover.right.x {
                    cover.right = segment.right.clone();
                }
            } else {
                covers.push(Cover {
                    line: lines.len(),
                    left: segment.left.clone(),
                    right: segment.right.clone(),
                });
            }
            report(
                result,
                Preparation::Union {
                    cover: covers.last().expect("cover exists"),
                },
            )?;
        }
        let mut endpoints: Vec<_> = members
            .iter()
            .flat_map(|&id| {
                [
                    (segments[id].left.x.clone(), id),
                    (segments[id].right.x.clone(), id),
                ]
            })
            .collect();
        endpoints.sort();
        lines.push(Line {
            slope: first.slope.clone().expect("nonzero"),
            intercept: first.intercept.clone(),
            members: Index::build(members.to_vec(), endpoints, segments),
        });
        report(result, Preparation::Indexed { members })?;
        offset = end;
    }
    let groups = Groups { lines, covers };
    report(result, Preparation::Ready { groups: &groups })?;
    Some(groups)
}

pub(super) fn restore(point: &Point, shear: &Rational) -> Point {
    Point {
        x: &point.x - shear * &point.y,
        y: point.y.clone(),
    }
}

#[cfg(test)]
#[path = "groups_tests.rs"]
mod tests;
