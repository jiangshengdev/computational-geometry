import { useLayoutEffect, useRef } from 'react'
import type { Point } from '../../../../geometry/geometry'
import type { Segment } from '../../geometry'
import { nearestLabelPosition } from '../../../../geometry/labelPlacement'
import type { GeometryViewport } from './useGeometryViewport'

interface LabelScene {
  segments: Segment[]
  points: Point[]
  eventPoints: Point[]
  numberedPoints: { x: number; y: number }[]
  teaching: boolean
  numbering: 'active' | 'pending' | null | undefined
}

/** Measures and places rendered labels while retaining the content-based cache. */
export function useGeometryLabels(
  { svg, width, height, transform, projection }: GeometryViewport,
  { segments, points, eventPoints, numberedPoints, teaching, numbering }: LabelScene,
) {
  const labelLayout = useRef<{ key: string; labels: SVGTextElement[] } | null>(null)
  const inputLayout = useRef<{ key: string; positions: { left: number; top: number }[] } | null>(null)
  useLayoutEffect(() => {
    if (!projection) return
    const element = svg.current!
    const teachingLabels = teaching && !numbering
    const labels = Array.from(element.querySelectorAll<SVGTextElement>(numbering ? 'text.order-number' : 'text:not(.tick)'))
      .sort((a, b) => (teachingLabels ? Number(b.dataset.input !== undefined) - Number(a.dataset.input !== undefined) : 0) ||
        Number(b.dataset.priority ?? 0) - Number(a.dataset.priority ?? 0))
    const ticks = Array.from(element.querySelectorAll<SVGTextElement>('.tick'))
    // Depend on layout content, not on freshly allocated sweep/highlight objects.
    // Teaching labels stay in screen pixels; geometry and order markers retain their transform.
    const content = [...labels, ...ticks].map(label => {
      const style = getComputedStyle(label)
      return [label.dataset.input, label.textContent, label.getAttribute('x'), label.getAttribute('y'), label.dataset.priority,
        style.textAnchor, style.fontFamily, style.fontSize, style.fontStyle, style.letterSpacing]
    })
    const key = JSON.stringify([width, height, numbering, teachingLabels ? transform.toString() : null, segments, eventPoints, content])
    if (labelLayout.current?.key === key && labels.every((label, i) => label === labelLayout.current!.labels[i])) return
    // Input IDs precede event obstacles and have the same slots at every stop.
    // Retain only this layout, not a growing cache of visited teaching states.
    const inputKey = teachingLabels ? JSON.stringify([width, height, transform.toString(), segments, points,
      content.filter((_, index) => index >= labels.length || labels[index].dataset.input !== undefined)]) : null
    const inputPositions: { left: number; top: number }[] = []
    // Reserve both normal and bold bounds before placing labels. Hover can then
    // change weight without moving its own hit target or redoing collision searches.
    for (const label of labels) { label.removeAttribute('transform'); label.removeAttribute('visibility') }
    const weights = labels.map(label => label.style.fontWeight)
    for (const label of labels) label.style.fontWeight = '400'
    const normal = labels.map(label => {
      const { x, y, width, height } = label.getBBox()
      return { x, y, width, height }
    })
    for (const label of labels) label.style.fontWeight = '700'
    const boxes = labels.map((label, i) => {
      const bold = label.getBBox(), regular = normal[i]
      const x = Math.min(regular.x, bold.x), y = Math.min(regular.y, bold.y)
      return { x, y, width: Math.max(regular.x + regular.width, bold.x + bold.width) - x,
        height: Math.max(regular.y + regular.height, bold.y + bold.height) - y }
    })
    labels.forEach((label, i) => { label.style.fontWeight = weights[i] })
    const occupied = ticks.map(tick => {
      const { x, y, width, height } = tick.getBBox()
      return teachingLabels ? { x: transform.applyX(x), y: transform.applyY(y), width: width * transform.k, height: height * transform.k } : { x, y, width, height }
    })
    const gap = numbering ? 3 : 6 // Includes the white outline and space between adjacent labels.
    const px = (point: Point) => teachingLabels ? transform.applyX(projection.px(point)) : projection.px(point)
    const py = (point: Point) => teachingLabels ? transform.applyY(projection.py(point)) : projection.py(point)
    const lines = segments.map(segment => ({ x1: px(segment.start), y1: py(segment.start), x2: px(segment.end), y2: py(segment.end) }))
    if (numbering) {
      // Numbering belongs to its anchor: reserve the dots, not unrelated event halos.
      for (const point of numberedPoints) occupied.push({ x: point.x - 3, y: point.y - 3, width: 6, height: 6 })
    } else {
      for (const point of points) occupied.push({ x: px(point) - 10, y: py(point) - 10, width: 20, height: 20 })
    }
    let eventsReserved = false
    labels.forEach((label, index) => {
      // Reserve every input's slot in input order, even while its label is not
      // relevant to this step. Events and hover details cannot displace IDs.
      if (!numbering && !eventsReserved && (!teachingLabels || label.dataset.input === undefined)) {
        for (const point of eventPoints) occupied.push({ x: px(point) - 10, y: py(point) - 10, width: 20, height: 20 })
        eventsReserved = true
      }
      const box = boxes[index]
      let position = inputKey !== null && inputLayout.current?.key === inputKey && label.dataset.input !== undefined
        ? inputLayout.current.positions[index] : undefined
      if (!position) {
        // Short workspaces need space below and beside labels too: moving every
        // collision upward can put an otherwise readable label under the toolbar.
        const lefts = [...new Set([box.x, gap, width - box.width - gap,
          ...occupied.flatMap(other => [other.x - box.width - gap, other.x + other.width + gap])])]
          .filter(left => left >= gap && left + box.width <= width - gap && (!numbering || left === box.x))
        const tops = [...new Set([box.y, gap, height - box.height - gap,
          ...occupied.flatMap(other => [other.y - box.height - gap, other.y + other.height + gap])])]
          .filter(top => top >= gap && top + box.height <= height - gap)
        position = nearestLabelPosition(lefts, tops, box, ({ left, top }) => !occupied.some(other =>
          left < other.x + other.width + gap && left + box.width + gap > other.x &&
          top < other.y + other.height + gap && top + box.height + gap > other.y) && (numbering || !lines.some(line => {
            // Clip the segment against the label's padded rectangle, not its bounding box.
            let start = 0, end = 1
            for (const [origin, delta, low, high] of [
              [line.x1, line.x2 - line.x1, left - gap, left + box.width + gap],
              [line.y1, line.y2 - line.y1, top - gap, top + box.height + gap],
            ]) {
              if (delta === 0) {
                if (origin < low || origin > high) return false
              } else {
                const a = (low - origin) / delta, b = (high - origin) / delta
                start = Math.max(start, Math.min(a, b))
                end = Math.min(end, Math.max(a, b))
              }
            }
            return start <= end
          })))
      }
      if (!position && teachingLabels && label.dataset.input === undefined) {
        label.setAttribute('visibility', 'hidden')
        label.parentElement?.querySelector(':scope > .label-leader')?.setAttribute('visibility', 'hidden')
        return
      }
      const { left, top } = position ?? { left: box.x, top: box.y }
      if (teachingLabels && label.dataset.input !== undefined) inputPositions.push({ left, top })
      label.setAttribute('transform', `translate(${left - box.x}, ${top - box.y})`)
      const leader = label.parentElement?.querySelector(':scope > .order-leader, :scope > .label-leader')
      if (leader) {
        leader.setAttribute('x2', String(left - 4))
        leader.setAttribute('y2', String(top + box.height / 2))
        if (leader.classList.contains('label-leader')) leader.setAttribute('visibility', Math.hypot(left - box.x, top - box.y) > 24 ? 'visible' : 'hidden')
      }
      occupied.push({ x: left, y: top, width: box.width, height: box.height })
    })
    if (inputKey !== null) inputLayout.current = { key: inputKey, positions: inputPositions }
    labelLayout.current = { key, labels }
  })
}
