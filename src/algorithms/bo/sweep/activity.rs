//! Updates the one active sequence at the current exact event.
use super::observation::closure_call;
use super::*;

pub(super) struct ActivityUpdate {
    pub(super) position: usize,
    pub(super) inserted: usize,
}

pub(super) fn update(
    state: &mut SweepState,
    point: &Point,
    mut incident: Vec<usize>,
    recording: &mut Recorder<'_, '_>,
) -> Option<ActivityUpdate> {
    let SweepState {
        segments,
        shear,
        queue,
        active,
        height_order,
        result,
    } = state;
    let shear = &*shear;
    macro_rules! activity {
        ($boundary:expr, $incident:expr, $position:expr, $inserted:expr) => {
            observe!(
                recording,
                ObservationState {
                    queue,
                    active,
                    result,
                    height_order,
                    shear
                },
                point,
                "activity",
                $boundary,
                &[],
                {
                    let incident: Option<&Vec<usize>> = $incident;
                    let position: Option<usize> = $position;
                    let inserted: Option<usize> = $inserted;
                    let mut locals = vec![incident.map_or_else(
                        || Variable::absent("incident", "Vec<usize>", "unavailable"),
                        |incident| {
                            Variable::available("incident", "Vec<usize>", format!("{incident:?}"))
                        },
                    )];
                    for (name, value) in [("position", position), ("inserted", inserted)] {
                        locals.push(value.map_or_else(
                            || Variable::absent(name, "usize", "unassigned"),
                            |value| Variable::available(name, "usize", value.to_string()),
                        ));
                    }
                    locals
                }
            );
        };
    }
    activity!(0, Some(&incident), None, None);
    let removed = recording.steps.as_ref().map(|_| {
        active
            .iter()
            .copied()
            .filter(|&id| segments[id].right == *point)
            .collect::<Vec<_>>()
    });
    let before = recording.steps.as_ref().map(|_| format!("{active:?}"));
    pending_call!(
        recording,
        1,
        "retain",
        0,
        vec![
            Variable::available(
                "self",
                "&mut Vec<usize>",
                before.as_ref().expect("trace captures arguments").clone()
            ),
            Variable::available(
                "predicate",
                "closure",
                "|&id| segments[id].right != point".to_owned()
            )
        ],
        "()"
    );
    active.retain(|&id| {
        nop!();
        closure_call!(
            recording,
            "retain-end",
            "retain closure",
            vec![Variable::available("id", "usize", id.to_string())],
            &["segments", "point"],
            "bool",
            segments[id].right != *point,
            |value: &bool| value.to_string()
        )
    });
    activity!(1, Some(&incident), None, None);
    call!(
        recording,
        1,
        "retain",
        vec![
            Variable::available(
                "self",
                "&mut Vec<usize>",
                before.expect("trace captures arguments")
            ),
            Variable::available(
                "predicate",
                "closure",
                "|&id| segments[id].right != point".to_owned()
            )
        ],
        Variable::available("return_value", "()", "()".to_owned())
    );
    if let Some(steps) = &mut recording.steps
        && let Some(removed) = &removed
        && !removed.is_empty()
    {
        let step = steps.last_mut().expect("removal observation was captured");
        step.action = "remove";
        step.subjects.clone_from(removed);
    }
    let previous_order = recording.steps.as_ref().map(|_| active.clone());
    let before = recording.steps.as_ref().map(|_| format!("{active:?}"));
    pending_call!(
        recording,
        2,
        "retain",
        0,
        vec![
            Variable::available(
                "self",
                "&mut Vec<usize>",
                before.as_ref().expect("trace captures arguments").clone()
            ),
            Variable::available(
                "predicate",
                "closure",
                "|&id| !height_order[id].is_eq()".to_owned()
            )
        ],
        "()"
    );
    active.retain(|&id| {
        nop!();
        closure_call!(
            recording,
            "retain-height",
            "retain closure",
            vec![Variable::available("id", "usize", id.to_string())],
            &["height_order"],
            "bool",
            !height_order[id].is_eq(),
            |value: &bool| value.to_string()
        )
    });
    activity!(2, Some(&incident), None, None);
    call!(
        recording,
        2,
        "retain",
        vec![
            Variable::available(
                "self",
                "&mut Vec<usize>",
                before.expect("trace captures arguments")
            ),
            Variable::available(
                "predicate",
                "closure",
                "|&id| !height_order[id].is_eq()".to_owned()
            )
        ],
        Variable::available("return_value", "()", "()".to_owned())
    );
    let before = recording.steps.as_ref().map(|_| format!("{incident:?}"));
    pending_call!(
        recording,
        3,
        "retain",
        0,
        vec![
            Variable::available(
                "self",
                "&mut Vec<usize>",
                before.as_ref().expect("trace captures arguments").clone()
            ),
            Variable::available(
                "predicate",
                "closure",
                "|&id| segments[id].right != point".to_owned()
            )
        ],
        "()"
    );
    incident.retain(|&id| {
        nop!();
        closure_call!(
            recording,
            "retain-end",
            "retain closure",
            vec![Variable::available("id", "usize", id.to_string())],
            &["segments", "point"],
            "bool",
            segments[id].right != *point,
            |value: &bool| value.to_string()
        )
    });
    activity!(3, Some(&incident), None, None);
    call!(
        recording,
        3,
        "retain",
        vec![
            Variable::available(
                "self",
                "&mut Vec<usize>",
                before.expect("trace captures arguments")
            ),
            Variable::available(
                "predicate",
                "closure",
                "|&id| segments[id].right != point".to_owned()
            )
        ],
        Variable::available("return_value", "()", "()".to_owned())
    );
    let before = recording.steps.as_ref().map(|_| format!("{incident:?}"));
    pending_call!(
        recording,
        4,
        "sort_by",
        0,
        vec![
            Variable::available(
                "self",
                "&mut [usize]",
                before.as_ref().expect("trace captures arguments").clone()
            ),
            Variable::available(
                "compare",
                "closure",
                "|&a, &b| segments[a].slope.cmp(&segments[b].slope)".to_owned()
            )
        ],
        "()"
    );
    incident.sort_by(|&a, &b| {
        nop!();
        closure_call!(
            recording,
            "sort-by",
            "sort_by closure",
            vec![
                Variable::available("a", "usize", a.to_string()),
                Variable::available("b", "usize", b.to_string())
            ],
            &["segments"],
            "Ordering",
            segments[a].slope.cmp(&segments[b].slope),
            |value: &std::cmp::Ordering| format!("{value:?}")
        )
    });
    activity!(4, Some(&incident), None, None);
    call!(
        recording,
        4,
        "sort_by",
        vec![
            Variable::available(
                "self",
                "&mut [usize]",
                before.expect("trace captures arguments")
            ),
            Variable::available(
                "compare",
                "closure",
                "|&a, &b| segments[a].slope.cmp(&segments[b].slope)".to_owned()
            )
        ],
        Variable::available("return_value", "()", "()".to_owned())
    );
    // Equal-x events at different y remain separate. At the current y,
    // ascending slope is the order immediately after this event; other
    // equal-y blocks keep their pre-event order until their own event.
    pending_call!(
        recording,
        5,
        "partition_point",
        0,
        vec![
            Variable::available("self", "&[usize]", format!("{active:?}")),
            Variable::available(
                "predicate",
                "closure",
                "|&id| height_order[id].is_lt()".to_owned()
            )
        ],
        "usize"
    );
    let position = active.partition_point(|&id| {
        nop!();
        closure_call!(
            recording,
            "partition-point",
            "partition_point closure",
            vec![Variable::available("id", "usize", id.to_string())],
            &["height_order"],
            "bool",
            height_order[id].is_lt(),
            |value: &bool| value.to_string()
        )
    });
    activity!(5, Some(&incident), Some(position), None);
    call!(
        recording,
        5,
        "partition_point",
        vec![
            Variable::available("self", "&[usize]", format!("{active:?}")),
            Variable::available(
                "predicate",
                "closure",
                "|&id| height_order[id].is_lt()".to_owned()
            )
        ],
        Variable::available("return_value", "usize", position.to_string())
    );
    pending_call!(
        recording,
        6,
        "len",
        0,
        vec![Variable::available(
            "self",
            "&Vec<usize>",
            format!("{incident:?}")
        )],
        "usize"
    );
    let inserted = incident.len();
    activity!(6, Some(&incident), Some(position), Some(inserted));
    call!(
        recording,
        6,
        "len",
        vec![Variable::available(
            "self",
            "&Vec<usize>",
            format!("{incident:?}")
        )],
        Variable::available("return_value", "usize", inserted.to_string())
    );
    let splice_arguments = recording.steps.as_ref().map(|_| {
        vec![
            Variable::available("self", "&mut Vec<usize>", format!("{active:?}")),
            Variable::available("range", "Range<usize>", format!("{position}..{position}")),
            Variable::available("replace_with", "Vec<usize>", format!("{incident:?}")),
        ]
    });
    pending_call!(
        recording,
        7,
        "splice",
        0,
        splice_arguments
            .as_ref()
            .expect("trace captures arguments")
            .clone(),
        "Splice<IntoIter<usize>>"
    );
    active.splice(position..position, incident);
    activity!(7, None, Some(position), Some(inserted));
    call!(
        recording,
        7,
        "splice",
        splice_arguments.expect("trace captures arguments"),
        Variable::absent("return_value", "Splice<IntoIter<usize>>", "unavailable")
    );
    if let Some(steps) = &mut recording.steps {
        let previous_order = previous_order
            .as_ref()
            .expect("tracing captures the previous order");
        let added: Vec<_> = active
            .iter()
            .copied()
            .filter(|&id| segments[id].left == *point)
            .collect();
        let continuing: Vec<_> = active
            .iter()
            .copied()
            .filter(|id| previous_order.contains(id))
            .collect();
        let step = steps.last_mut().expect("splice observation was captured");
        if !added.is_empty() {
            step.action = "insert";
            step.subjects = added;
        } else if &continuing != previous_order {
            step.action = "reorder";
            step.subjects = active[position..position + inserted].to_vec();
        }
    }
    Some(ActivityUpdate { position, inserted })
}
