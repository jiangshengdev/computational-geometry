//! Closed-endpoint output. Each member visit produces a new original pair;
//! no old/old same-line pairs are enumerated at later events.
use super::*;
use std::ops::Bound::{Excluded, Unbounded};

pub(super) fn record(
    state: &mut SweepState,
    point: &Point,
    event: &Event,
    groups: &[usize],
    recording: &mut Recorder<'_, '_>,
) -> Option<()> {
    recording.enter("members", "record", "()", || {
        vec![
            Variable::available("event", "&Event", event_value(event)),
            Variable::available("incident_groups", "&[GroupId]", format!("{groups:?}")),
        ]
    });
    recording.observe(state, point, 0, "micro", || (vec![], vec![]))?;
    for &id in &event.starts {
        account!(access("event_metadata", 1));
        account!(access("group_of", 1));
        let g = state.group_of[id].expect("nonzero start");
        recording.observe(state, point, 1, "micro", || {
            (
                vec![id],
                vec![
                    Variable::available("id", "usize", id.to_string()),
                    Variable::available("group", "GroupId", g.to_string()),
                    Variable::absent("other", "usize", "unavailable"),
                ],
            )
        })?;
        recording.control(1, "for", "entered");
        // Range cursors let output borrow the whole live state for observation.
        // Each O(log n) advance is charged to the pair it emits, never to an
        // already reported pair. No member table is copied for insertion.
        account!(access("members", 1));
        account!(access("groups", 1));
        let mut next = state.groups[g].members.first().copied();
        while let Some(other) = next {
            account!(access("same_line_candidates", 1));
            account!(access("segments", 2));
            let a = &state.segments[id];
            let b = &state.segments[other];
            let start = (&a.left).max(&b.left);
            let end = (&a.right).min(&b.right);
            let geometry = if start == end {
                Geometry::Point(start.clone())
            } else {
                Geometry::Overlap {
                    start: start.clone(),
                    end: end.clone(),
                }
            };
            recording.observe(state, point, 6, "micro", || {
                (
                    vec![id, other],
                    vec![Variable::available("other", "usize", other.to_string())],
                )
            })?;
            recording.control(1, "for", "entered");
            recording.loops(6, 1, "entered");
            append(state, point, [id, other], geometry, recording)?;
            account!(access("members", 1));
            account!(access("groups", 1));
            next = state.groups[g]
                .members
                .range((Excluded(other), Unbounded))
                .next()
                .copied();
        }
        account!(access("groups", 1));
        account!(access("segments", 1));
        state.groups[g].insert(id, &state.segments[id]);
        state.groups_value.get_mut().take();
        recording.observe(state, point, 2, "join", || {
            (
                vec![id],
                vec![
                    Variable::available("id", "usize", id.to_string()),
                    Variable::available("group", "GroupId", g.to_string()),
                    Variable::absent("other", "usize", "unavailable"),
                ],
            )
        })?;
        recording.control(1, "for", "entered");
        recording.loops(6, 1, "exhausted");
        recording.block_end(1);
    }
    recording.observe(state, point, 3, "micro", || {
        (
            vec![],
            vec![
                Variable::absent("id", "usize", "unavailable"),
                Variable::absent("group", "GroupId", "unavailable"),
                Variable::absent("other", "usize", "unavailable"),
            ],
        )
    })?;
    recording.control(1, "for", "exhausted");
    recording.block_after(1);
    // Expansion is paid by cross-group/point output. A lone group without a
    // point input (e.g. a pure ending event) never expands its old members.
    if groups.len() > 1 || !event.points.is_empty() {
        recording.control(4, "if", "true");
        let members: Vec<Vec<_>> = groups
            .iter()
            .map(|&g| {
                account!(access("incident_list", 1));
                account!(access("groups", 1));
                state.groups[g].members.iter().copied().collect()
            })
            .collect();
        account!(add("expanded_groups", members.len()));
        account!(add("expanded_members", members.iter().map(Vec::len).sum()));
        account!(access("members", members.iter().map(|m| m.len() + 1).sum()));
        for (i, left) in members.iter().enumerate() {
            account!(access("expanded_groups", 1));
            for right in &members[i + 1..] {
                account!(access("expanded_groups", 1));
                for &a in left {
                    account!(access("expanded_members", 1));
                    for &b in right {
                        account!(access("expanded_members", 1));
                        account!(access("cross_group_candidates", 1));
                        recording.observe(state, point, 7, "micro", || {
                            (
                                vec![a, b],
                                vec![
                                    Variable::available("a", "usize", a.to_string()),
                                    Variable::available("b", "usize", b.to_string()),
                                ],
                            )
                        })?;
                        recording.control(4, "if", "true");
                        recording.loops(7, 4, "entered");
                        append(
                            state,
                            point,
                            [a, b],
                            Geometry::Point(point.clone()),
                            recording,
                        )?;
                    }
                }
            }
        }
        for &id in &event.points {
            account!(access("event_metadata", 1));
            for group in &members {
                account!(access("expanded_groups", 1));
                for &other in group {
                    account!(access("expanded_members", 1));
                    account!(access("point_member_candidates", 1));
                    recording.observe(state, point, 8, "micro", || {
                        (
                            vec![id, other],
                            vec![
                                Variable::available("id", "usize", id.to_string()),
                                Variable::available("other", "usize", other.to_string()),
                                Variable::absent("a", "usize", "unavailable"),
                                Variable::absent("b", "usize", "unavailable"),
                            ],
                        )
                    })?;
                    recording.control(4, "if", "true");
                    recording.loops(7, 4, "exhausted");
                    recording.loops(8, 3, "entered");
                    append(
                        state,
                        point,
                        [id, other],
                        Geometry::Point(point.clone()),
                        recording,
                    )?;
                }
            }
        }
        account!(delete(
            "expanded_members",
            members.iter().map(Vec::len).sum()
        ));
        account!(delete("expanded_groups", members.len()));
        recording.observe(state, point, 4, "micro", || {
            (
                vec![],
                vec![
                    Variable::absent("a", "usize", "unavailable"),
                    Variable::absent("b", "usize", "unavailable"),
                    Variable::absent("id", "usize", "unavailable"),
                    Variable::absent("other", "usize", "unavailable"),
                ],
            )
        })?;
        recording.control(4, "if", "true");
        recording.loops(7, 4, "exhausted");
        recording.loops(8, 3, "exhausted");
        recording.block_end(4);
        recording.observe(state, point, 4, "micro", || (vec![], vec![]))?;
        recording.control(4, "if", "true");
        recording.loops(7, 4, "exhausted");
        recording.loops(8, 3, "exhausted");
        recording.block_after(4);
    } else {
        recording.control(4, "if", "false");
    }
    for (i, &a) in event.points.iter().enumerate() {
        account!(access("event_metadata", 1));
        for &b in &event.points[i + 1..] {
            account!(access("event_metadata", 1));
            account!(access("point_pair_candidates", 1));
            recording.observe(state, point, 9, "micro", || {
                (
                    vec![a, b],
                    vec![
                        Variable::available("a", "usize", a.to_string()),
                        Variable::available("b", "usize", b.to_string()),
                    ],
                )
            })?;
            recording.loops(9, 2, "entered");
            append(
                state,
                point,
                [a, b],
                Geometry::Point(point.clone()),
                recording,
            )?;
        }
    }
    recording.observe(state, point, 5, "micro", || {
        (
            vec![],
            vec![
                Variable::absent("a", "usize", "unavailable"),
                Variable::absent("b", "usize", "unavailable"),
            ],
        )
    })?;
    recording.loops(9, 2, "exhausted");
    recording.control(5, "return", "pending");
    recording.leave(|| Variable::available("return_value", "()", "()"));
    Some(())
}

fn append(
    state: &mut SweepState,
    point: &Point,
    pair: [usize; 2],
    scan_geometry: Geometry,
    recording: &mut Recorder<'_, '_>,
) -> Option<()> {
    recording.enter("output", "append", "()", || {
        vec![
            Variable::available("pair", "[usize; 2]", format!("{pair:?}")),
            Variable::available("scan_geometry", "Geometry", geometry_value(&scan_geometry)),
        ]
    });
    recording.observe(state, point, 0, "micro", || {
        (
            pair.to_vec(),
            vec![Variable::absent("geometry", "Geometry", "unassigned")],
        )
    })?;
    account!(geometry_bits("scan_output", &scan_geometry));
    let mut ordered_pair = pair;
    ordered_pair.sort_unstable();
    let restore = |p: Point| {
        if state.shear.numer().bits() == 0 {
            return p;
        }
        Point {
            x: p.x - &state.shear * &p.y,
            y: p.y,
        }
    };
    let geometry = match scan_geometry {
        Geometry::Point(p) => Geometry::Point(restore(p)),
        Geometry::Overlap { start, end } => {
            let start = restore(start);
            let end = restore(end);
            if start <= end {
                Geometry::Overlap { start, end }
            } else {
                Geometry::Overlap {
                    start: end,
                    end: start,
                }
            }
        }
    };
    account!(geometry_bits("output", &geometry));
    recording.retire_parameter("scan_geometry");
    recording.observe(state, point, 1, "micro", || {
        (
            pair.to_vec(),
            vec![
                Variable::available("ordered_pair", "[usize; 2]", format!("{ordered_pair:?}")),
                Variable::available("geometry", "Geometry", geometry_value(&geometry)),
            ],
        )
    })?;
    let intersection = Intersection {
        segments: ordered_pair,
        geometry,
    };
    let arguments = recording.steps.as_ref().map(|_| {
        vec![
            Variable::available(
                "self",
                "&mut Vec<Intersection>",
                recording.capture.borrow_mut().result_value(&state.result),
            ),
            Variable::available("value", "Intersection", intersection_value(&intersection)),
        ]
    });
    recording.call(|| {
        ExecutionCall::pending(
            2,
            "push",
            0,
            arguments.clone().expect("trace arguments"),
            "()",
        )
    });
    account!(add("output", 1));
    state.result.push(intersection);
    recording.observe(state, point, 2, "record", || {
        (
            pair.to_vec(),
            vec![Variable::absent("geometry", "Geometry", "unavailable")],
        )
    })?;
    recording.call(|| ExecutionCall {
        line: 2,
        function: "push",
        occurrence: 0,
        arguments: arguments.expect("trace arguments"),
        result: Variable::available("return_value", "()", "()"),
    });
    recording.control(2, "return", "pending");
    recording.leave(|| Variable::available("return_value", "()", "()"));
    Some(())
}
