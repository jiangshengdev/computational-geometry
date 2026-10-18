import { formatPoint, point, samePoint, type Point } from '../../geometry/geometry'

export interface Segment { start: Point; end: Point }
export type Geometry = { type: 'point'; point: Point } | { type: 'overlap'; start: Point; end: Point }
export interface Intersection { segments: [number, number]; geometry: Geometry }

export function segment(x1: string, y1: string, x2: string, y2: string): Segment {
  return { start: point(x1, y1), end: point(x2, y2) }
}

export const pairName = (result: Intersection) => result.segments.map(i => `S${i}`).join(' × ')
export const formatGeometry = (g: Geometry) => g.type === 'point'
  ? formatPoint(g.point) : `${formatPoint(g.start)} → ${formatPoint(g.end)}`

export function isVertical(segment: Segment): boolean {
  return !samePoint(segment.start, segment.end) &&
    samePoint({ x: segment.start.x, y: segment.end.y }, segment.end)
}
