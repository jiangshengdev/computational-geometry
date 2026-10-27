//! Locate only the equal-height block, save its gap, then detach it.
use super::*;
use groups::{Side, compare};
use std::collections::BTreeSet;

pub(super) struct Located {
    pub(super) groups: Vec<usize>,
    pub(super) outside: (Option<usize>, Option<usize>),
}

pub(super) fn locate(
    state: &mut SweepState,
    point: &Point,
    event: &Event,
    recording: &mut Recorder<'_, '_>,
) -> Option<Located> {
    recording.enter("locate", "locate", "Located", || {
        vec![Variable::available("event", "&Event", event_value(event))]
    });
    recording.observe(state, point, 0, "micro", || {
        (
            vec![],
            vec![Variable::absent("block", "Vec<GroupId>", "unassigned")],
        )
    })?;
    let compare_before = |a, b| compare(&state.groups, a, b, point, Side::Before);
    let first = state
        .active
        .lower_bound(|g| !state.groups[g].compare_height(point).is_lt());
    let lower = first.map_or_else(
        || state.active.left_of(|_| true),
        |g| state.active.neighbors(g, &compare_before).0,
    );
    let mut upper = first;
    let mut block = Vec::new();
    while let Some(g) = upper {
        if (recording.cancelled)() {
            return None;
        }
        if !state.groups[g].compare_height(point).is_eq() {
            break;
        }
        block.push(g);
        upper = state.active.neighbors(g, &compare_before).1;
    }
    let mut groups: BTreeSet<_> = block.iter().copied().collect();
    groups.extend(
        event
            .starts
            .iter()
            .map(|&id| state.group_of[id].expect("nonzero start")),
    );
    let groups: Vec<_> = groups.into_iter().collect();
    recording.observe(state, point, 1, "locate", || {
        (
            groups
                .iter()
                .flat_map(|&g| state.groups[g].members.iter().copied())
                .collect(),
            vec![
                Variable::available("block", "Vec<GroupId>", format!("{block:?}")),
                Variable::available("incident_groups", "Vec<GroupId>", format!("{groups:?}")),
                Variable::available(
                    "outside",
                    "(Option<GroupId>, Option<GroupId>)",
                    format!("{lower:?}, {upper:?}"),
                ),
            ],
        )
    })?;
    for &g in &block {
        state
            .active
            .remove(g, &|a, b| compare(&state.groups, a, b, point, Side::Before));
        recording.observe(state, point, 2, "detach", || {
            (
                state.groups[g].members.iter().copied().collect(),
                vec![Variable::available("group", "GroupId", g.to_string())],
            )
        })?;
        recording.control(2, "for", "entered");
        recording.block_end(2);
    }
    recording.observe(state, point, 3, "micro", || {
        (
            vec![],
            vec![Variable::absent("group", "GroupId", "unavailable")],
        )
    })?;
    recording.control(2, "for", "exhausted");
    recording.block_after(2);
    recording.control(3, "return", "pending");
    let located = Located {
        groups,
        outside: (lower, upper),
    };
    recording.leave(|| {
        Variable::available(
            "return_value",
            "Located",
            format!(
                "{{ groups: {:?}, outside: {:?} }}",
                located.groups, located.outside
            ),
        )
    });
    Some(located)
}
