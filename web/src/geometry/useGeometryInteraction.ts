import { useRef, useState, type SVGProps, type PointerEvent as ReactPointerEvent } from 'react'
import { formatPoint, pairName, samePoint, type Intersection, type Point, type Segment } from './geometry'
import { hoverHighlights, type HoverHighlights, type HoverTarget } from './hover'
import type { GeometryViewport } from './useGeometryViewport'

interface InteractionScene {
  segments: Segment[]
  results: Intersection[]
  eventPoints: Point[]
  teaching: boolean
  step: number | undefined
  highlights?: HoverHighlights | null
  hoverTarget?: HoverTarget | null
  onHover?: (target: HoverTarget | null) => void
}

/** Owns hit priority, pointer gestures, inspection pinning and their cleanup. */
export function useGeometryInteraction(
  { svg, projection, transform }: GeometryViewport,
  { segments, results, eventPoints, teaching, step, highlights: suppliedHighlights, hoverTarget, onHover }: InteractionScene,
) {
  const [inspection, setInspection] = useState<{ step: number | undefined; target: HoverTarget | null }>({ step, target: null })
  if (inspection.step !== step) setInspection({ step, target: null })
  const pinned = inspection.step === step ? inspection.target : null
  const inspecting = hoverTarget ?? pinned
  const highlights = pinned && !hoverTarget ? hoverHighlights(pinned, pinned.kind === 'pair' ? results : []) : suppliedHighlights
  const pointerStart = useRef<{ x: number; y: number; moved: boolean; target: HoverTarget | null } | null>(null)

  const hitTarget = (event: ReactPointerEvent<SVGSVGElement>): HoverTarget | null => {
    if (!projection) return null
    const eventLabel = (event.target as Element).closest<SVGTextElement>('text[data-event-point]')
    const labelPoint = eventPoints.find(p => formatPoint(p) === eventLabel?.dataset.eventPoint)
    if (labelPoint) return { kind: 'point', point: labelPoint }
    const label = (event.target as Element).closest<SVGTextElement>('text[data-input]')
    if (label) return { kind: 'input', index: Number(label.dataset.input) }
    const matrix = svg.current!.getScreenCTM()!
    const screen = (point: Point) => new DOMPoint(...transform.apply([projection.px(point), projection.py(point)])).matrixTransform(matrix)
    const scale = transform.k * Math.hypot(matrix.a, matrix.b)
    const pointInput = segments.find(segment => {
      if (!samePoint(segment.start, segment.end)) return false
      const center = screen(segment.start)
      return Math.abs(event.clientX - center.x) + Math.abs(event.clientY - center.y) <= 11 * scale + 3
    })
    const pointer = pointInput ? screen(pointInput.start) : new DOMPoint(event.clientX, event.clientY)
    const distance = (start: Point, end: Point) => {
      const a = screen(start), b = screen(end)
      const dx = b.x - a.x, dy = b.y - a.y
      const lengthSquared = dx * dx + dy * dy
      const t = lengthSquared ? Math.max(0, Math.min(1, ((pointer.x - a.x) * dx + (pointer.y - a.y) * dy) / lengthSquared)) : 0
      return Math.hypot(pointer.x - a.x - t * dx, pointer.y - a.y - t * dy)
    }
    const inputHits = segments.map((s, index) => ({ index, distance: distance(s.start, s.end) }))
      .filter(hit => hit.distance <= Math.max(7, 2 * scale))
    if (teaching) {
      const point = eventPoints.filter(p => distance(p, p) <= Math.max(10, 10 * scale))
        .sort((a, b) => distance(a, a) - distance(b, b))[0]
      if (point) return { kind: 'point', point }
      const overlap = results.find(({ geometry }) => geometry.type === 'overlap' && distance(geometry.start, geometry.end) <= Math.max(7, 4 * scale))
      if (overlap) return { kind: 'pair', pair: pairName(overlap) }
      const input = inputHits.sort((a, b) => a.distance - b.distance)[0]
      return input ? { kind: 'input', index: input.index } : null
    }
    // Hit all geometry in screen pixels, independently of SVG paint order.
    const hits = results.filter(({ geometry: g }) => g.type === 'point'
      ? distance(g.point, g.point) <= Math.max(9, 7 * scale) : distance(g.start, g.end) <= Math.max(7, 4 * scale))
    const inputs = inputHits.map(hit => hit.index)
    for (const hit of hits) for (const index of hit.segments) if (!inputs.includes(index)) inputs.push(index)
    return !inputs.length ? null : !hits.length && inputs.length === 1 ? { kind: 'input', index: inputs[0] }
      : { kind: 'geometry', inputs, pairs: hits.map(pairName) }
  }

  const handlers: Pick<SVGProps<SVGSVGElement>,
    'onKeyDown' | 'onPointerLeave' | 'onPointerCancel' | 'onPointerDown' | 'onPointerUp' | 'onPointerMove'> = {
    onKeyDown: event => { if (teaching && event.key === 'Escape') { setInspection({ step, target: null }); onHover?.(null) } },
    onPointerLeave: () => { onHover?.(null); pointerStart.current = null },
    onPointerCancel: () => { pointerStart.current = null },
    onPointerDown: event => {
      if (teaching) pointerStart.current = event.button === 0
        ? { x: event.clientX, y: event.clientY, moved: !event.isPrimary, target: hitTarget(event) } : null
      onHover?.(null)
    },
    onPointerUp: event => {
      const start = pointerStart.current
      pointerStart.current = null
      if (!teaching || !start || start.moved || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return
      setInspection({ step, target: start.target })
      event.currentTarget.focus({ preventScroll: true })
      onHover?.(null)
    },
    onPointerMove: event => {
      const start = pointerStart.current
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) start.moved = true
      if (event.buttons || event.pointerType === 'touch') return
      onHover?.(hitTarget(event))
    },
  }
  return { pinned, inspecting, highlights, handlers }
}
