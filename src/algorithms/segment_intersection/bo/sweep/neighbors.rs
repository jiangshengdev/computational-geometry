//! Check only the new block and its gap boundaries. Queue entries are real
//! positions covered by current members, not revocable adjacency certificates.
use super::*;

pub(super) fn check(
    state: &mut SweepState,
    point: &Point,
    inserted: &[usize],
    outside: (Option<usize>, Option<usize>),
    recording: &mut Recorder<'_, '_>,
) -> Option<Vec<[usize; 2]>> {
    recording.enter("neighbors", "check", "()", || {
        vec![
            Variable::available("inserted", "&[GroupId]", format!("{inserted:?}")),
            Variable::available(
                "outside",
                "(Option<GroupId>, Option<GroupId>)",
                format!("{outside:?}"),
            ),
        ]
    });
    recording.observe(state, point, 0, "micro", || (vec![], vec![]))?;
    let mut checked = Vec::new();
    // Only the O(h+1) group IDs are assembled; no member data is copied.
    let neighbors: Vec<_> = outside
        .0
        .into_iter()
        .chain(inserted.iter().copied())
        .chain(outside.1)
        .collect();
    account!(access("inserted_list", inserted.len()));
    account!(add("neighbor_list", neighbors.len()));
    for pair in neighbors.windows(2) {
        account!(access("neighbor_list", 2));
        let pair = [pair[0], pair[1]];
        recording.observe(state, point, 1, "micro", || {
            (
                vec![],
                vec![Variable::available(
                    "pair",
                    "[GroupId; 2]",
                    format!("{pair:?}"),
                )],
            )
        })?;
        recording.control(1, "for", "entered");
        schedule(state, point, pair, recording)?;
        if recording.steps.is_some() {
            // Canvas shows one real witness pair, not a fictitious Cartesian
            // product of segment tests. Locals expose the checked group IDs.
            checked.push([
                state.groups[pair[0]].farthest().1,
                state.groups[pair[1]].farthest().1,
            ]);
        }
        recording.block_end(1);
    }
    recording.observe(state, point, 2, "micro", || {
        (
            vec![],
            vec![Variable::absent("pair", "[GroupId; 2]", "unavailable")],
        )
    })?;
    recording.control(1, "for", "exhausted");
    recording.block_after(1);
    recording.control(2, "return", "pending");
    recording.leave(|| Variable::available("return_value", "()", "()"));
    account!(delete("neighbor_list", neighbors.len()));
    Some(checked)
}

fn schedule(
    state: &mut SweepState,
    point: &Point,
    pair: [usize; 2],
    recording: &mut Recorder<'_, '_>,
) -> Option<()> {
    recording.enter("schedule", "schedule", "()", || {
        vec![Variable::available(
            "pair",
            "[GroupId; 2]",
            format!("{pair:?}"),
        )]
    });
    recording.observe(state, point, 0, "check", || {
        (
            pair.iter()
                .flat_map(|&g| state.groups[g].members.iter().copied())
                .collect(),
            vec![
                Variable::available("checked_groups", "[GroupId; 2]", format!("{pair:?}")),
                Variable::absent("candidate", "Point", "unassigned"),
            ],
        )
    })?;
    if let Some(steps) = &mut recording.steps {
        steps.last_mut().expect("check").checked = vec![[
            state.groups[pair[0]].farthest().1,
            state.groups[pair[1]].farthest().1,
        ]];
    }
    account!(access("groups", 2));
    let a = &state.groups[pair[0]];
    let b = &state.groups[pair[1]];
    if a.slope == b.slope {
        recording.observe(state, point, 1, "micro", || (vec![], vec![]))?;
        recording.control(1, "if", "true");
        recording.control(1, "return", "pending");
        recording.leave(|| Variable::available("return_value", "()", "()"));
        return Some(());
    }
    recording.control(1, "if", "false");
    let u = (&b.intercept - &a.intercept) / (&a.slope - &b.slope);
    let candidate = Point {
        y: a.height(&u),
        x: u,
    };
    recording.observe(state, point, 2, "micro", || {
        (
            vec![],
            vec![Variable::available(
                "candidate",
                "Point",
                point_value(&candidate),
            )],
        )
    })?;
    account!(point_bits("candidates", &candidate));
    let covered = candidate > *point
        && {
            account!(access("groups", 1));
            candidate.x <= state.groups[pair[0]].farthest().0
        }
        && {
            account!(access("groups", 1));
            candidate.x <= state.groups[pair[1]].farthest().0
        };
    recording.control(3, "if", if covered { "true" } else { "false" });
    if covered {
        let previous = state.queue.len();
        account!(access("queue", 1));
        state.queue.entry(candidate.clone()).or_insert_with(|| {
            account!(add("queue", 1));
            Event::default()
        });
        recording.observe(
            state,
            point,
            3,
            if state.queue.len() > previous {
                "discover"
            } else {
                "micro"
            },
            || {
                (
                    pair.iter()
                        .flat_map(|&g| state.groups[g].members.iter().copied())
                        .collect(),
                    vec![Variable::available(
                        "candidate",
                        "Point",
                        point_value(&candidate),
                    )],
                )
            },
        )?;
        if let Some(steps) = &mut recording.steps {
            steps.last_mut().expect("scheduled position").checked = vec![[
                state.groups[pair[0]].farthest().1,
                state.groups[pair[1]].farthest().1,
            ]];
        }
        recording.block_end(3);
    }
    recording.observe(state, point, 4, "micro", || {
        (
            vec![],
            vec![Variable::available(
                "candidate",
                "Point",
                point_value(&candidate),
            )],
        )
    })?;
    if covered {
        recording.block_after(3);
    }
    recording.control(4, "return", "pending");
    recording.leave(|| Variable::available("return_value", "()", "()"));
    Some(())
}
