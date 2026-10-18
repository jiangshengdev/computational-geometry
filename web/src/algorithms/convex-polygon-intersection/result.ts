import type { Point } from '../../geometry/geometry'

export type PolygonIntersection =
  | { kind: 'empty' }
  | { kind: 'point'; point: Point }
  | { kind: 'segment'; start: Point; end: Point }
  | { kind: 'polygon'; vertices: Point[] }

export function resultPoints(result: PolygonIntersection): Point[] {
  switch (result.kind) {
    case 'empty': return []
    case 'point': return [result.point]
    case 'segment': return [result.start, result.end]
    case 'polygon': return result.vertices
  }
}
