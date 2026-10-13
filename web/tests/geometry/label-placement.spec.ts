import { expect, test } from '@playwright/test'
import { nearestLabelPosition } from '../../src/geometry/labelPlacement'

test('最近标签位置保留完整排序的候选与等距顺序', () => {
  let seed = 1729
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32 }
  const cases = [
    { lefts: [2, -2, 0], tops: [2, -2, 0], origin: { x: 0, y: 0 } },
    // hypot rounds distinct vertical offsets to an equal distance here.
    { lefts: [1e16, -1e16], tops: [4, 1, 3, 0, 2], origin: { x: 0, y: 0 } },
    { lefts: [], tops: [0], origin: { x: 0, y: 0 } },
    { lefts: [0], tops: [], origin: { x: 0, y: 0 } },
    ...Array.from({ length: 80 }, () => ({
      lefts: Array.from({ length: 1 + Math.floor(random() * 20) }, () => (random() - 0.5) * 800),
      tops: Array.from({ length: 1 + Math.floor(random() * 20) }, () => (random() - 0.5) * 460),
      origin: { x: random() * 100, y: random() * 100 },
    })),
  ]
  for (const { lefts, tops, origin } of cases) {
    const sorted = lefts.flatMap(left => tops.map(top => ({ left, top, distance: Math.hypot(left - origin.x, top - origin.y) })))
      .sort((a, b) => a.distance - b.distance)
      .map(({ left, top }) => ({ left, top }))
    const visited: { left: number; top: number }[] = []
    expect(nearestLabelPosition(lefts, tops, origin, position => { visited.push(position); return false })).toBeUndefined()
    expect(visited).toEqual(sorted)
    for (const accepted of [0, Math.floor(sorted.length / 2), sorted.length - 1]) {
      let visits = 0
      const position = nearestLabelPosition(lefts, tops, origin, () => visits++ === accepted)
      expect(position).toEqual(sorted[accepted])
      expect(visits).toBe(sorted.length ? accepted + 1 : 0)
    }
  }
})
