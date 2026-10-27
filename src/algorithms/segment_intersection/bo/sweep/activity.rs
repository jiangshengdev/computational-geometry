//! Close endpoints before removing members; reinsert only this event's block.
use super::*;
use groups::{Side, compare};

pub(super) fn update(
    state: &mut SweepState,
    point: &Point,
    event: &Event,
    groups: &[usize],
    recording: &mut Recorder<'_, '_>,
) -> Option<Vec<usize>> {
    recording.enter("activity", "update", "Vec<GroupId>", (3, 0), || {
        vec![
            Variable::available("event", "&Event", event_value(event)),
            Variable::available("incident_groups", "&[GroupId]", format!("{groups:?}")),
        ]
    });
    recording.observe(state, point, 0, "micro", || (vec![], vec![]))?;
    for &id in &event.ends {
        account!(access("event_metadata", 1));
        account!(access("group_of", 1));
        account!(access("groups", 1));
        account!(access("segments", 1));
        let g = state.group_of[id].expect("nonzero end");
        recording.observe(state, point, 5, "micro", || {
            (
                vec![id],
                vec![
                    Variable::available("id", "usize", id.to_string()),
                    Variable::available("group", "GroupId", g.to_string()),
                ],
            )
        })?;
        recording.control(1, "for", "entered");
        state.groups[g].remove(id, &state.segments[id]);
        state.groups_value.get_mut().take();
        recording.observe(state, point, 1, "leave", || {
            (
                vec![id],
                vec![
                    Variable::available("id", "usize", id.to_string()),
                    Variable::available("group", "GroupId", g.to_string()),
                ],
            )
        })?;
        recording.control(1, "for", "entered");
        recording.iteration_end(state, point, 1, 8, &[("id", "usize"), ("group", "GroupId")])?;
    }
    recording.observe(state, point, 2, "micro", || {
        (
            vec![],
            vec![
                Variable::absent("id", "usize", "unavailable"),
                Variable::absent("group", "GroupId", "unavailable"),
                Variable::absent("inserted", "Vec<GroupId>", "unassigned"),
            ],
        )
    })?;
    recording.control(1, "for", "exhausted");
    // The whole old block is already out of T. Only now is equality at p
    // ordered after the event; higher same-u crossings remain in before order.
    let mut inserted: Vec<_> = groups
        .iter()
        .copied()
        .filter(|&g| !state.groups[g].members.is_empty())
        .collect();
    account!(add("inserted_list", inserted.len()));
    account!(access("groups", groups.len()));
    account!(access("incident_list", groups.len()));
    inserted.sort_unstable_by(|&a, &b| {
        account!(access("groups", 2));
        state.groups[a].slope.cmp(&state.groups[b].slope)
    });
    recording.observe(state, point, 6, "micro", || {
        (
            vec![],
            vec![Variable::available(
                "inserted",
                "Vec<GroupId>",
                format!("{inserted:?}"),
            )],
        )
    })?;
    for &g in &inserted {
        recording.observe(state, point, 7, "micro", || {
            (
                state.groups[g].members.iter().copied().collect(),
                vec![Variable::available("group", "GroupId", g.to_string())],
            )
        })?;
        recording.control(3, "for", "entered");
        account!(access("inserted_list", 1));
        account!(access("active", 1));
        account!(add("active", 1));
        state
            .active
            .insert(g, &|a, b| compare(&state.groups, a, b, point, Side::After));
        recording.observe(state, point, 3, "insert", || {
            (
                state.groups[g].members.iter().copied().collect(),
                vec![Variable::available("group", "GroupId", g.to_string())],
            )
        })?;
        recording.control(3, "for", "entered");
        recording.iteration_end(state, point, 3, 6, &[("group", "GroupId")])?;
    }
    recording.observe(state, point, 4, "reorder", || {
        (
            vec![],
            vec![
                Variable::available("inserted", "Vec<GroupId>", format!("{inserted:?}")),
                Variable::absent("group", "GroupId", "unavailable"),
            ],
        )
    })?;
    recording.control(3, "for", "exhausted");
    recording.control(4, "return", "pending");
    recording
        .leave(|| Variable::available("return_value", "Vec<GroupId>", format!("{inserted:?}")));
    Some(inserted)
}
