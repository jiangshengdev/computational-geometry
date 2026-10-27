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
    recording.enter("locate", "locate", "Located", (1, 0), || {
        vec![Variable::available("event", "&Event", event_value(event))]
    });
    recording.observe(state, point, 0, "micro", || {
        (
            vec![],
            vec![Variable::absent("block", "Vec<GroupId>", "unassigned")],
        )
    })?;
    let compare_before = |a, b| compare(&state.groups, a, b, point, Side::Before);
    account!(access("active", 1));
    account!(access("active", 1));
    let first = state.active.lower_bound(|g| {
        account!(access("groups", 1));
        !state.groups[g].compare_height(point).is_lt()
    });
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
        account!(access("groups", 1));
        if !state.groups[g].compare_height(point).is_eq() {
            break;
        }
        account!(add("block_list", 1));
        account!(access("active", 1));
        block.push(g);
        upper = state.active.neighbors(g, &compare_before).1;
    }
    recording.observe(state, point, 4, "micro", || {
        (
            vec![],
            vec![
                Variable::available("block", "Vec<GroupId>", format!("{block:?}")),
                Variable::available(
                    "outside",
                    "(Option<GroupId>, Option<GroupId>)",
                    format!("({lower:?}, {upper:?})"),
                ),
                Variable::absent("incident_groups", "Vec<GroupId>", "unassigned"),
            ],
        )
    })?;
    account!(access("block_list", block.len()));
    let mut groups: BTreeSet<_> = block.iter().copied().collect();
    account!(add("incident_set", groups.len()));
    groups.extend(event.starts.iter().map(|&id| {
        account!(access("event_metadata", 1));
        account!(access("group_of", 1));
        state.group_of[id].expect("nonzero start")
    }));
    account!(add("incident_set", groups.len() - block.len()));
    account!(access("incident_set", block.len() + event.starts.len()));
    let groups: Vec<_> = groups
        .into_iter()
        .inspect(|_| {
            account!(access("incident_set", 1));
            account!(delete("incident_set", 1));
            account!(add("incident_list", 1));
        })
        .collect();
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
                    format!("({lower:?}, {upper:?})"),
                ),
            ],
        )
    })?;
    for &g in &block {
        recording.observe(state, point, 5, "micro", || {
            (
                state.groups[g].members.iter().copied().collect(),
                vec![Variable::available("group", "GroupId", g.to_string())],
            )
        })?;
        recording.control(2, "for", "entered");
        account!(access("block_list", 1));
        account!(access("active", 1));
        state
            .active
            .remove(g, &|a, b| compare(&state.groups, a, b, point, Side::Before));
        account!(delete("active", 1));
        recording.observe(state, point, 2, "detach", || {
            (
                state.groups[g].members.iter().copied().collect(),
                vec![Variable::available("group", "GroupId", g.to_string())],
            )
        })?;
        recording.control(2, "for", "entered");
        recording.iteration_end(state, point, 2, 1, &[("group", "GroupId")])?;
    }
    recording.observe(state, point, 3, "micro", || {
        (
            vec![],
            vec![Variable::absent("group", "GroupId", "unavailable")],
        )
    })?;
    recording.control(2, "for", "exhausted");
    recording.control(3, "return", "pending");
    account!(delete("block_list", block.len()));
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
