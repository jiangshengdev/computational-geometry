interface Position { left: number; top: number }

// Merge monotone rows instead of constructing and sorting the Cartesian product.
// Ties retain the original left-major, then top-major candidate order.
export function nearestLabelPosition(
  lefts: number[], tops: number[], origin: { x: number; y: number },
  available: (position: Position) => unknown,
): Position | undefined {
  const orderedTops = tops.map((top, index) => ({ top, index, offset: Math.abs(top - origin.y) }))
    .sort((a, b) => a.offset - b.offset)
  if (!orderedTops.length) return undefined
  interface Row { left: number; index: number; cursor: number; distance: number; ties: number[]; tie: number }
  const advance = (row: Row) => {
    if (row.cursor === orderedTops.length) return false
    row.distance = Math.hypot(row.left - origin.x, orderedTops[row.cursor].offset)
    row.ties = []
    row.tie = 0
    do {
      row.ties.push(orderedTops[row.cursor++].index)
    } while (row.cursor < orderedTops.length &&
      Math.hypot(row.left - origin.x, orderedTops[row.cursor].offset) === row.distance)
    // Distinct offsets can also round to the same hypot result.
    row.ties.sort((a, b) => a - b)
    return true
  }
  const heap: Row[] = lefts.map((left, index) => {
    const row = { left, index, cursor: 0, distance: 0, ties: [], tie: 0 }
    advance(row)
    return row
  })
  const before = (a: Row, b: Row) => a.distance < b.distance || (a.distance === b.distance && a.index < b.index)
  const siftDown = (start: number) => {
    let parent = start
    while (parent * 2 + 1 < heap.length) {
      let child = parent * 2 + 1
      if (child + 1 < heap.length && before(heap[child + 1], heap[child])) child++
      if (!before(heap[child], heap[parent])) break
      ;[heap[parent], heap[child]] = [heap[child], heap[parent]]
      parent = child
    }
  }
  for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) siftDown(i)
  while (heap.length) {
    const row = heap[0]
    const position = { left: row.left, top: tops[row.ties[row.tie++]] }
    if (available(position)) return position
    if (row.tie < row.ties.length) continue
    if (!advance(row)) {
      const last = heap.pop()!
      if (!heap.length) break
      heap[0] = last
    }
    siftDown(0)
  }
  return undefined
}
