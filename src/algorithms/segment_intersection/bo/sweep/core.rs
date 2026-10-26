//! Local block sweep. No original-member query is made at an ordinary cover
//! endpoint, and no certificate is created for an intermediate tree state.
use super::{
    SweepSegment,
    groups::{self, Groups},
    queue::{Queue, edge},
};
use crate::algorithms::status::Status;
use crate::{Geometry, Intersection, Point};
use std::cmp::Ordering;

#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum Side {
    Before,
    Closed,
    After,
}

#[derive(Default)]
pub(super) struct Details<'a> {
    pub incident: &'a [usize],
    pub members: Option<&'a [Vec<usize>]>,
    pub edge: Option<(usize, usize)>,
    pub candidate: Option<&'a Option<Point>>,
    pub preparation: Option<&'a groups::Preparation<'a>>,
    pub next: Option<&'a (Point, super::queue::Bucket)>,
}

pub(super) struct View<'a> {
    pub module: &'static str,
    pub boundary: usize,
    pub point: Option<&'a Point>,
    pub queue: &'a Queue,
    pub groups: Option<&'a Groups>,
    pub result: &'a [Intersection],
    pub subjects: &'a [usize],
    pub checked: Option<[usize; 2]>,
    pub intersection: Option<&'a Intersection>,
    pub details: Details<'a>,
    pub side: Side,
}

/// Observers only read real operation boundaries; the disabled observer does
/// not expand the active tree, member lists, or any historical state.
pub(super) trait Observer {
    fn observe(&mut self, view: View<'_>) -> Option<()>;
}

pub(super) fn run(
    segments: &[SweepSegment],
    shear: &crate::Rational,
    observer: &mut impl Observer,
    cancelled: &dyn Fn() -> bool,
) -> Option<Vec<Intersection>> {
    let mut result = Vec::new();
    let mut queue = Queue::default();
    observer.observe(View {
        module: "initial",
        boundary: 0,
        point: None,
        queue: &queue,
        groups: None,
        result: &result,
        subjects: &[],
        checked: None,
        intersection: None,
        details: Details::default(),
        side: Side::Before,
    })?;
    observer.observe(View {
        module: "prepare",
        boundary: 0,
        point: None,
        queue: &queue,
        groups: None,
        result: &result,
        subjects: &[],
        checked: None,
        intersection: None,
        details: Details::default(),
        side: Side::Before,
    })?;
    let groups = groups::prepare(
        segments,
        shear,
        &mut result,
        &mut |result, preparation| {
            let (module, boundary, intersection) = match &preparation {
                groups::Preparation::Pair {
                    intersection,
                    boundary,
                } => ("same_line", *boundary, Some(*intersection)),
                groups::Preparation::Line { .. } => ("line_group", 0, None),
                groups::Preparation::Union { .. } => ("line_group", 1, None),
                groups::Preparation::Indexed { .. } => ("line_group", 2, None),
                groups::Preparation::Ready { .. } => ("prepare", 3, None),
            };
            let groups = match &preparation {
                groups::Preparation::Ready { groups } => Some(*groups),
                _ => None,
            };
            observer.observe(View {
                module,
                boundary,
                point: None,
                queue: &queue,
                groups,
                result,
                subjects: intersection.map_or(&[], |i| &i.segments),
                checked: intersection.map(|i| i.segments),
                intersection,
                details: Details {
                    preparation: Some(&preparation),
                    ..Details::default()
                },
                side: Side::Before,
            })
        },
        cancelled,
    )?;
    observer.observe(View {
        module: "prepare",
        boundary: 2,
        point: None,
        queue: &queue,
        groups: Some(&groups),
        result: &result,
        subjects: &[],
        checked: None,
        intersection: None,
        details: Details::default(),
        side: Side::Before,
    })?;
    observer.observe(View {
        module: "prepare",
        boundary: 1,
        point: None,
        queue: &queue,
        groups: Some(&groups),
        result: &result,
        subjects: &[],
        checked: None,
        intersection: None,
        details: Details::default(),
        side: Side::Before,
    })?;
    for (id, cover) in groups.covers.iter().enumerate() {
        queue
            .buckets
            .entry(cover.left.clone())
            .or_default()
            .starts
            .push(id);
        queue
            .buckets
            .entry(cover.right.clone())
            .or_default()
            .ends
            .push(id);
    }
    for (id, segment) in segments.iter().enumerate() {
        if segment.slope.is_none() {
            queue
                .buckets
                .entry(segment.left.clone())
                .or_default()
                .points
                .push(id);
        }
    }
    observer.observe(View {
        module: "driver",
        boundary: 2,
        point: None,
        queue: &queue,
        groups: Some(&groups),
        result: &result,
        subjects: &[],
        checked: None,
        intersection: None,
        details: Details::default(),
        side: Side::Before,
    })?;
    let mut status = Status::default();
    let mut previous = None;
    loop {
        observer.observe(View {
            module: "take",
            boundary: 0,
            point: previous.as_ref(),
            queue: &queue,
            groups: Some(&groups),
            result: &result,
            subjects: &[],
            checked: None,
            intersection: None,
            details: Details::default(),
            side: Side::After,
        })?;
        let next = queue.pop();
        observer.observe(View {
            module: "take",
            boundary: 1,
            point: previous.as_ref(),
            queue: &queue,
            groups: Some(&groups),
            result: &result,
            subjects: &[],
            checked: None,
            intersection: None,
            details: Details {
                next: next.as_ref(),
                ..Details::default()
            },
            side: Side::After,
        })?;
        let Some((point, bucket)) = next else {
            break;
        };
        if cancelled() {
            return None;
        }
        let compare = |a: usize, b: usize, side: Side| {
            let a_line = &groups.lines[groups.covers[a].line];
            let b_line = &groups.lines[groups.covers[b].line];
            a_line
                .y_at(&point.x)
                .cmp(&b_line.y_at(&point.x))
                .then_with(|| match side {
                    Side::Before => b_line.slope.cmp(&a_line.slope),
                    Side::After | Side::Closed => a_line.slope.cmp(&b_line.slope),
                })
                .then(a.cmp(&b))
        };
        let before = |a, b| compare(a, b, Side::Before);
        let after = |a, b| compare(a, b, Side::After);
        macro_rules! observe {
            ($module:literal,$boundary:expr,$side:expr) => {
                observe!($module, $boundary, $side, Details::default());
            };
            ($module:literal,$boundary:expr,$side:expr,$details:expr) => {
                observer.observe(View {
                    module: $module,
                    boundary: $boundary,
                    point: Some(&point),
                    queue: &queue,
                    groups: Some(&groups),
                    result: &result,
                    subjects: &[],
                    checked: None,
                    intersection: None,
                    details: $details,
                    side: $side,
                })?;
            };
        }
        observe!("event", 0, Side::Before);
        let mut old = Vec::new();
        let mut cursor =
            status.lower_bound(|id| groups.lines[groups.covers[id].line].y_at(&point.x) >= point.y);
        while let Some(id) = cursor {
            if groups.lines[groups.covers[id].line].y_at(&point.x) != point.y {
                break;
            }
            old.push(id);
            cursor = status.neighbors(id, &before).1;
        }
        let mut incident = old.clone();
        incident.extend(&bucket.starts);
        observe!(
            "event",
            1,
            Side::Closed,
            Details {
                incident: &incident,
                ..Details::default()
            }
        );
        if incident.len() >= 2 || !bucket.points.is_empty() {
            observe!(
                "driver",
                3,
                Side::Closed,
                Details {
                    incident: &incident,
                    ..Details::default()
                }
            );
            observe!(
                "members",
                0,
                Side::Closed,
                Details {
                    incident: &incident,
                    ..Details::default()
                }
            );
            let members = recover_members(&groups, &incident, &point, segments, &mut |members| {
                observe!(
                    "members",
                    3,
                    Side::Closed,
                    Details {
                        incident: &incident,
                        members: Some(members),
                        ..Details::default()
                    }
                );
                Some(())
            })?;
            observe!(
                "members",
                2,
                Side::Closed,
                Details {
                    incident: &incident,
                    members: Some(&members),
                    ..Details::default()
                }
            );
            observe!(
                "members",
                1,
                Side::Closed,
                Details {
                    incident: &incident,
                    members: Some(&members),
                    ..Details::default()
                }
            );
            let original = groups::restore(&point, shear);
            let mut report = |a: usize, b: usize| -> Option<()> {
                if cancelled() {
                    return None;
                }
                let pair = [a.min(b), a.max(b)];
                let intersection = Intersection {
                    segments: pair,
                    geometry: Geometry::Point(original.clone()),
                };
                observer.observe(View {
                    module: "report",
                    boundary: 0,
                    point: Some(&point),
                    queue: &queue,
                    groups: Some(&groups),
                    result: &result,
                    subjects: &pair,
                    checked: Some(pair),
                    intersection: Some(&intersection),
                    details: Details::default(),
                    side: Side::Closed,
                })?;
                result.push(intersection);
                observer.observe(View {
                    module: "report",
                    boundary: 1,
                    point: Some(&point),
                    queue: &queue,
                    groups: Some(&groups),
                    result: &result,
                    subjects: &pair,
                    checked: Some(pair),
                    intersection: result.last(),
                    details: Details::default(),
                    side: Side::Closed,
                })
            };
            for i in 0..members.len() {
                for j in i + 1..members.len() {
                    for &a in &members[i] {
                        for &b in &members[j] {
                            report(a, b)?;
                        }
                    }
                }
                for &p in &bucket.points {
                    for &a in &members[i] {
                        report(p, a)?;
                    }
                }
            }
            for i in 0..bucket.points.len() {
                for j in i + 1..bucket.points.len() {
                    report(bucket.points[i], bucket.points[j])?;
                }
            }
        }
        let (lower, upper) = if let (Some(&first), Some(&last)) = (old.first(), old.last()) {
            (
                status.neighbors(first, &before).0,
                status.neighbors(last, &before).1,
            )
        } else {
            (
                status.left_of(|id| groups.lines[groups.covers[id].line].y_at(&point.x) < point.y),
                cursor,
            )
        };
        if !incident.is_empty() {
            if old.is_empty() {
                if let (Some(a), Some(b)) = (lower, upper) {
                    queue.cancel(edge(a, b));
                }
            } else {
                for &id in &old {
                    let (a, b) = status.neighbors(id, &before);
                    if let Some(a) = a {
                        queue.cancel(edge(a, id));
                    }
                    if let Some(b) = b {
                        queue.cancel(edge(id, b));
                    }
                }
            }
            observe!(
                "update",
                0,
                Side::Before,
                Details {
                    incident: &incident,
                    ..Details::default()
                }
            );
            for &id in &old {
                status.remove(id, &before);
            }
            incident.retain(|&id| groups.covers[id].right.x > point.x);
            incident.sort_by(|&a, &b| after(a, b));
            for &id in &incident {
                status.insert(id, &after);
            }
            observe!(
                "update",
                1,
                Side::After,
                Details {
                    incident: &incident,
                    ..Details::default()
                }
            );
            let mut previous = lower;
            for next in incident
                .iter()
                .copied()
                .map(Some)
                .chain(std::iter::once(upper))
            {
                if let (Some(a), Some(b)) = (previous, next) {
                    observe!(
                        "driver",
                        6,
                        Side::After,
                        Details {
                            edge: Some((a, b)),
                            ..Details::default()
                        }
                    );
                    observe!(
                        "certificate",
                        0,
                        Side::After,
                        Details {
                            edge: Some((a, b)),
                            ..Details::default()
                        }
                    );
                    let candidate = schedule(
                        &groups,
                        &mut queue,
                        a,
                        b,
                        &point,
                        &mut |queue, candidate| {
                            observer.observe(View {
                                module: "certificate",
                                boundary: 3,
                                point: Some(&point),
                                queue,
                                groups: Some(&groups),
                                result: &result,
                                subjects: &[],
                                checked: None,
                                intersection: None,
                                details: Details {
                                    edge: Some((a, b)),
                                    candidate: Some(candidate),
                                    ..Details::default()
                                },
                                side: Side::After,
                            })
                        },
                    )?;
                    observe!(
                        "certificate",
                        2,
                        Side::After,
                        Details {
                            edge: Some((a, b)),
                            candidate: Some(&candidate),
                            ..Details::default()
                        }
                    );
                    observe!(
                        "certificate",
                        1,
                        Side::After,
                        Details {
                            edge: Some((a, b)),
                            candidate: Some(&candidate),
                            ..Details::default()
                        }
                    );
                }
                previous = next;
            }
        }
        observe!("event", 2, Side::After);
        previous = Some(point);
    }
    observer.observe(View {
        module: "done",
        boundary: 0,
        point: previous.as_ref(),
        queue: &queue,
        groups: Some(&groups),
        result: &result,
        subjects: &[],
        checked: None,
        intersection: None,
        details: Details::default(),
        side: Side::After,
    })?;
    Some(result)
}

fn recover_members(
    groups: &Groups,
    incident: &[usize],
    point: &Point,
    segments: &[SweepSegment],
    returning: &mut impl FnMut(&[Vec<usize>]) -> Option<()>,
) -> Option<Vec<Vec<usize>>> {
    let members: Vec<_> = incident
        .iter()
        .map(|&id| groups.lines[groups.covers[id].line].members(&point.x, segments))
        .collect();
    returning(&members)?;
    Some(members)
}

fn schedule(
    groups: &Groups,
    queue: &mut Queue,
    a: usize,
    b: usize,
    current: &Point,
    returning: &mut impl FnMut(&Queue, &Option<Point>) -> Option<()>,
) -> Option<Option<Point>> {
    let candidate = intersection_candidate(groups, a, b);
    if let Some(point) = &candidate {
        queue.schedule(edge(a, b), point.clone(), current);
    }
    returning(queue, &candidate)?;
    Some(candidate)
}

fn intersection_candidate(groups: &Groups, a: usize, b: usize) -> Option<Point> {
    let ca = &groups.covers[a];
    let cb = &groups.covers[b];
    let la = &groups.lines[ca.line];
    let lb = &groups.lines[cb.line];
    if la.slope.cmp(&lb.slope) == Ordering::Equal {
        return None;
    }
    let x = (&lb.intercept - &la.intercept) / (&la.slope - &lb.slope);
    if x < ca.left.x || x > ca.right.x || x < cb.left.x || x > cb.right.x {
        return None;
    }
    let point = Point { y: la.y_at(&x), x };
    Some(point)
}

#[cfg(test)]
#[path = "core_tests.rs"]
mod tests;
