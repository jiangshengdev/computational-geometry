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
    recording.enter("activity", "update", "Vec<GroupId>", || {
        vec![
            Variable::available("event", "&Event", event_value(event)),
            Variable::available("incident_groups", "&[GroupId]", format!("{groups:?}")),
        ]
    });
    recording.observe(state, point, 0, "micro", || (vec![], vec![]))?;
    for &id in &event.ends {
        let g = state.group_of[id].expect("nonzero end");
        state.groups[g].remove(id, &state.segments[id]);
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
        recording.block_end(1);
    }
    recording.observe(state, point, 2, "micro", || {
        (
            vec![],
            vec![
                Variable::absent("id", "usize", "unavailable"),
                Variable::absent("group", "GroupId", "unavailable"),
                Variable::available("side", "Side", "After"),
            ],
        )
    })?;
    recording.control(1, "for", "exhausted");
    recording.block_after(1);
    // The whole old block is already out of T. Only now is equality at p
    // ordered after the event; higher same-u crossings remain in before order.
    let mut inserted: Vec<_> = groups
        .iter()
        .copied()
        .filter(|&g| !state.groups[g].members.is_empty())
        .collect();
    inserted.sort_unstable_by(|&a, &b| state.groups[a].slope.cmp(&state.groups[b].slope));
    for &g in &inserted {
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
        recording.block_end(3);
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
    recording.block_after(3);
    recording.control(4, "return", "pending");
    recording
        .leave(|| Variable::available("return_value", "Vec<GroupId>", format!("{inserted:?}")));
    Some(inserted)
}
