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
    recording.enter("members", "record", "()", (2, 0), || {
        vec![
            Variable::available("event", "&Event", event_value(event)),
            Variable::available("incident_groups", "&[GroupId]", format!("{groups:?}")),
        ]
    });
    recording.observe(state, point, 0, "micro", || (vec![], vec![]))?;
    for &id in &event.starts {
        recording.observe(state, point, 10, "micro", || {
            (
                vec![id],
                vec![
                    Variable::available("id", "usize", id.to_string()),
                    Variable::absent("group", "GroupId", "unassigned"),
                ],
            )
        })?;
        recording.control(1, "for", "entered");
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
            recording.observe(state, point, 6, "micro", || {
                (
                    vec![id, other],
                    vec![
                        Variable::available("other", "usize", other.to_string()),
                        Variable::absent("scan_geometry", "Geometry", "unassigned"),
                        Variable::absent("start", "&Point", "unassigned"),
                        Variable::absent("end", "&Point", "unassigned"),
                    ],
                )
            })?;
            recording.control(6, "for", "entered");
            account!(access("same_line_candidates", 1));
            account!(access("segments", 2));
            let a = &state.segments[id];
            let b = &state.segments[other];
            let start_arguments = || {
                vec![
                    Variable::available("self", "&Point", point_value(&a.left)),
                    Variable::available("other", "&Point", point_value(&b.left)),
                ]
            };
            recording.call(|| ExecutionCall::pending(6, "max", 0, start_arguments(), "&Point"));
            let start = (&a.left).max(&b.left);
            recording.observe(state, point, 21, "micro", || {
                (
                    vec![id, other],
                    vec![Variable::available("start", "&Point", point_value(start))],
                )
            })?;
            recording.call(|| ExecutionCall {
                line: 6,
                function: "max",
                occurrence: 0,
                arguments: start_arguments(),
                result: Variable::available("return_value", "&Point", point_value(start)),
            });
            let end_arguments = || {
                vec![
                    Variable::available("self", "&Point", point_value(&a.right)),
                    Variable::available("other", "&Point", point_value(&b.right)),
                ]
            };
            recording.call(|| ExecutionCall::pending(6, "min", 0, end_arguments(), "&Point"));
            let end = (&a.right).min(&b.right);
            recording.observe(state, point, 22, "micro", || {
                (
                    vec![id, other],
                    vec![Variable::available("end", "&Point", point_value(end))],
                )
            })?;
            recording.call(|| ExecutionCall {
                line: 6,
                function: "min",
                occurrence: 0,
                arguments: end_arguments(),
                result: Variable::available("return_value", "&Point", point_value(end)),
            });
            let is_point = start == end;
            let geometry = if is_point {
                recording.observe(state, point, 23, "micro", || (vec![id, other], vec![]))?;
                recording.control(6, "if", "true");
                recording.control(6, "else", "skipped");
                Geometry::Point(start.clone())
            } else {
                recording.observe(state, point, 24, "micro", || (vec![id, other], vec![]))?;
                recording.control(6, "if", "false");
                recording.control(6, "else", "entered");
                Geometry::Overlap {
                    start: start.clone(),
                    end: end.clone(),
                }
            };
            recording.observe(
                state,
                point,
                if is_point { 26 } else { 25 },
                "micro",
                || (vec![id, other], vec![]),
            )?;
            recording.control(6, "if", if is_point { "true" } else { "false" });
            recording.control(6, "else", if is_point { "skipped" } else { "entered" });
            recording.block_end(6);
            recording.observe(state, point, 11, "micro", || {
                (
                    vec![id, other],
                    vec![Variable::available(
                        "scan_geometry",
                        "Geometry",
                        geometry_value(&geometry),
                    )],
                )
            })?;
            recording.block_after(6);
            recording.control(1, "for", "entered");
            recording.control(6, "for", "entered");
            append(state, point, [id, other], geometry, 6, recording)?;
            recording.observe(state, point, 19, "micro", || {
                (
                    vec![id, other],
                    vec![Variable::absent("scan_geometry", "Geometry", "unavailable")],
                )
            })?;
            recording.iteration_end(
                state,
                point,
                6,
                1,
                &[
                    ("other", "usize"),
                    ("scan_geometry", "Geometry"),
                    ("start", "&Point"),
                    ("end", "&Point"),
                ],
            )?;
            account!(access("members", 1));
            account!(access("groups", 1));
            next = state.groups[g]
                .members
                .range((Excluded(other), Unbounded))
                .next()
                .copied();
        }
        recording.observe(state, point, 12, "micro", || {
            (
                vec![id],
                vec![
                    Variable::absent("other", "usize", "unavailable"),
                    Variable::absent("scan_geometry", "Geometry", "unavailable"),
                ],
            )
        })?;
        recording.control(6, "for", "exhausted");
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
        recording.control(6, "for", "exhausted");
        recording.iteration_end(
            state,
            point,
            1,
            18,
            &[("id", "usize"), ("group", "GroupId")],
        )?;
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
        recording.observe(state, point, 13, "micro", || (vec![], vec![]))?;
        recording.control(4, "if", "true");
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
                        recording.control(7, "for", "entered");
                        append(
                            state,
                            point,
                            [a, b],
                            Geometry::Point(point.clone()),
                            7,
                            recording,
                        )?;
                        recording.observe(state, point, 15, "micro", || (vec![a, b], vec![]))?;
                        recording.iteration_end(
                            state,
                            point,
                            7,
                            13,
                            &[("a", "usize"), ("b", "usize")],
                        )?;
                    }
                }
            }
        }
        recording.observe(state, point, 14, "micro", || {
            (
                vec![],
                vec![
                    Variable::absent("a", "usize", "unavailable"),
                    Variable::absent("b", "usize", "unavailable"),
                ],
            )
        })?;
        recording.control(7, "for", "exhausted");
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
                    recording.control(8, "for", "entered");
                    append(
                        state,
                        point,
                        [id, other],
                        Geometry::Point(point.clone()),
                        8,
                        recording,
                    )?;
                    recording.observe(state, point, 16, "micro", || (vec![id, other], vec![]))?;
                    recording.iteration_end(
                        state,
                        point,
                        8,
                        14,
                        &[("id", "usize"), ("other", "usize")],
                    )?;
                }
            }
        }
        account!(delete(
            "expanded_members",
            members.iter().map(Vec::len).sum()
        ));
        account!(delete("expanded_groups", members.len()));
        recording.observe(state, point, 20, "micro", || {
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
        recording.control(8, "for", "exhausted");
        recording.block_end(4);
        recording.observe(state, point, 4, "micro", || (vec![], vec![]))?;
        recording.control(4, "if", "true");
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
            recording.control(9, "for", "entered");
            append(
                state,
                point,
                [a, b],
                Geometry::Point(point.clone()),
                9,
                recording,
            )?;
            recording.observe(state, point, 17, "micro", || (vec![a, b], vec![]))?;
            recording.iteration_end(state, point, 9, 4, &[("a", "usize"), ("b", "usize")])?;
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
    recording.control(9, "for", "exhausted");
    recording.control(5, "return", "pending");
    recording.leave(|| Variable::available("return_value", "()", "()"));
    Some(())
}

fn append(
    state: &mut SweepState,
    point: &Point,
    pair: [usize; 2],
    scan_geometry: Geometry,
    call_line: usize,
    recording: &mut Recorder<'_, '_>,
) -> Option<()> {
    recording.enter("output", "append", "()", (call_line, 0), || {
        vec![
            Variable::available("pair", "[usize; 2]", format!("{pair:?}")),
            Variable::available("scan_geometry", "Geometry", geometry_value(&scan_geometry)),
        ]
    });
    recording.consume_caller_local("scan_geometry");
    recording.observe(state, point, 0, "micro", || {
        (
            pair.to_vec(),
            vec![Variable::absent("geometry", "Geometry", "unassigned")],
        )
    })?;
    account!(geometry_bits("scan_output", &scan_geometry));
    let mut ordered_pair = pair;
    ordered_pair.sort_unstable();
    recording.observe(state, point, 3, "micro", || {
        (
            pair.to_vec(),
            vec![Variable::available(
                "ordered_pair",
                "[usize; 2]",
                format!("{ordered_pair:?}"),
            )],
        )
    })?;
    let original = |p: Point, binding: &'static str, site, recording: &mut Recorder<'_, '_>| {
        recording.enter("original", "original", "Point", site, || {
            vec![Variable::available("p", "Point", point_value(&p))]
        });
        recording.consume_caller_local(binding);
        recording.capture(&["shear"]);
        recording.observe(state, point, 0, "micro", || (pair.to_vec(), vec![]))?;
        recording.control(0, "return", "pending");
        let restored = if state.shear.numer().bits() == 0 {
            p
        } else {
            Point {
                x: p.x - &state.shear * &p.y,
                y: p.y,
            }
        };
        recording.retire_parameter("p");
        recording.leave(|| Variable::available("return_value", "Point", point_value(&restored)));
        Some(restored)
    };
    recording.observe(state, point, 4, "micro", || {
        (
            pair.to_vec(),
            vec![Variable::available(
                "original",
                "closure",
                "|p| Point { x: p.x - shear * p.y, y: p.y }",
            )],
        )
    })?;
    recording.retire_parameter("scan_geometry");
    let restored_geometry = match scan_geometry {
        Geometry::Point(p) => {
            recording.observe(state, point, 5, "micro", || {
                (
                    pair.to_vec(),
                    vec![Variable::available("p", "Point", point_value(&p))],
                )
            })?;
            Geometry::Point(original(p, "p", (3, 0), recording)?)
        }
        Geometry::Overlap { start, end } => {
            recording.observe(state, point, 6, "micro", || {
                (
                    pair.to_vec(),
                    vec![
                        Variable::available("start", "Point", point_value(&start)),
                        Variable::available("end", "Point", point_value(&end)),
                    ],
                )
            })?;
            let start = original(start, "start", (4, 0), recording)?;
            recording.observe(state, point, 7, "micro", || {
                (
                    pair.to_vec(),
                    vec![Variable::available("start", "Point", point_value(&start))],
                )
            })?;
            let end = original(end, "end", (4, 1), recording)?;
            recording.observe(state, point, 8, "micro", || {
                (
                    pair.to_vec(),
                    vec![Variable::available("end", "Point", point_value(&end))],
                )
            })?;
            let restored = if start <= end {
                Geometry::Overlap { start, end }
            } else {
                Geometry::Overlap {
                    start: end,
                    end: start,
                }
            };
            recording.observe(state, point, 9, "micro", || {
                (
                    pair.to_vec(),
                    vec![
                        Variable::absent("start", "Point", "unavailable"),
                        Variable::absent("end", "Point", "unavailable"),
                    ],
                )
            })?;
            recording.block_end(4);
            restored
        }
    };
    recording.observe(state, point, 10, "micro", || {
        (
            pair.to_vec(),
            vec![
                Variable::absent("p", "Point", "unavailable"),
                Variable::absent("start", "Point", "unavailable"),
                Variable::absent("end", "Point", "unavailable"),
            ],
        )
    })?;
    if matches!(&restored_geometry, Geometry::Overlap { .. }) {
        recording.block_after(4);
    }
    recording.block_end(3);
    let geometry = restored_geometry;
    account!(geometry_bits("output", &geometry));
    recording.observe(state, point, 1, "micro", || {
        (
            pair.to_vec(),
            vec![
                Variable::available("ordered_pair", "[usize; 2]", format!("{ordered_pair:?}")),
                Variable::available("geometry", "Geometry", geometry_value(&geometry)),
                Variable::absent("p", "Point", "unavailable"),
                Variable::absent("start", "Point", "unavailable"),
                Variable::absent("end", "Point", "unavailable"),
            ],
        )
    })?;
    recording.block_after(3);
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
