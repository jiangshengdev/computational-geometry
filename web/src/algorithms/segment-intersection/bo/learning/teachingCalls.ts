// Capability belongs to a teaching call site, independently of loaded records.
// A callee names the displayed process; null explicitly denotes an atomic call.
const sites: Record<string, Record<number, Record<string, string | null>>> = {
  sweep: { [-2]: { prepare: null }, 1: { locate: 'locate' }, 2: { record: 'members' }, 3: { update: 'activity' }, 4: { check: 'neighbors' }, 5: { publish_event: null } },
  take: { 1: { pop_first: null } },
  locate: { 0: { locate_equal_height: null }, 1: { merge_start_groups: null }, 2: { remove: null } },
  members: {
    6: { max: null, min: null, append: 'output' }, 2: { insert: null },
    4: { len: null, is_empty: null }, 7: { cross_group_pairs: null, append: 'output' },
    8: { point_member_pairs: null, append: 'output' }, 9: { unordered_pairs: null, append: 'output' },
  },
  output: { 0: { sorted: null }, 1: { original: 'original' }, 3: { original: 'original' }, 4: { original: 'original', ordered_overlap: null }, 2: { push: null } },
  activity: { 1: { remove_ending_member: null }, 2: { nonempty_groups_by_slope: null }, 3: { insert: null } },
  neighbors: { 0: { local_neighbors: null }, 1: { windows: null, schedule: 'schedule' } },
  schedule: { 2: { intersect_supporting_lines: null }, 3: { unwrap: null, entry: null, clone: null, or_default: null } },
}

export function callCapability(module: string, line: number, name: string) {
  const site = sites[module]?.[line]
  if (!site || !Object.hasOwn(site, name)) throw new Error(`Unregistered teaching call: ${module}:${line}:${name}`)
  return site[name] === null ? 'opaque' : 'step-in'
}
