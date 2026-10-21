import { useActionTrace, type ActionTraceDecoder } from '../../geometry/useActionTrace'
import { samePoint, type Point } from '../../geometry/geometry'
import type { PolygonCase } from './cases'
import { resultPoints, type PolygonIntersection } from './result'

export type PolygonPhase = 'containment' | 'chasing' | 'normalize'
export type Boundary = 'first' | 'second'
export type Side = 'left' | 'right' | 'collinear'
export interface PolygonStep {
  phase: PolygonPhase
  action: 'containment' | 'relation' | 'collect' | 'inside' | 'advance' | 'terminate' | 'normalize' | 'complete'
  boundary: Boundary | null
  vertex: number | null
  contained: boolean | null
  edges: [[number, number], [number, number]] | null
  relation: { cross: Side; first_side: Side; second_side: Side; contact: 'none' | 'point' | 'overlap' } | null
  inside: 'unknown' | 'p' | 'q'
  candidates: Point[]
  added: number[]
  reason: 'contained' | 'intersection' | 'shared_edge' | 'interior_vertex' | 'first_crossing' | 'crossing'
    | 'collinear_outside' | 'cross_left_b_inside' | 'cross_left_b_outside' | 'cross_right_a_outside'
    | 'cross_right_a_inside' | 'opposite_contact' | 'separated_parallel' | 'both_circuits'
    | 'first_two_circuits' | 'second_two_circuits' | 'candidates' | null
  result: PolygonIntersection | null
}
interface Input { first: Point[]; second: Point[]; first_order: number[]; second_order: number[] }
const validId = (id: number, points: Point[]) => Number.isInteger(id) && id >= 0 && id < points.length
const decoder: ActionTraceDecoder<Input, PolygonStep> = {
  start(frame) {
    const input = frame as unknown as Input
    if (!Array.isArray(input.first) || !Array.isArray(input.second)
      || !Array.isArray(input.first_order) || !Array.isArray(input.second_order)
      || input.first_order.some(id => !validId(id, input.first))
      || input.second_order.some(id => !validId(id, input.second))) throw new Error('Invalid polygon trace input')
    return input
  },
  step(value, input) {
    const step = value as PolygonStep
    if (!['containment', 'chasing', 'normalize'].includes(step.phase)
      || !['containment', 'relation', 'collect', 'inside', 'advance', 'terminate', 'normalize', 'complete'].includes(step.action)
      || !Array.isArray(step.candidates) || !Array.isArray(step.added)
      || step.added.some(id => !validId(id, step.candidates))
      || (step.vertex !== null && (!step.boundary || !validId(step.vertex, input[step.boundary])))
      || (step.edges !== null && (step.edges.length !== 2 || step.edges.some((edge, i) => edge.length !== 2 || edge.some(id => !validId(id, i === 0 ? input.first : input.second)))))
      || (step.action !== 'complete' && step.result !== null)) throw new Error('Invalid polygon trace step')
    return step
  },
  complete(frame, _input, steps) {
    const last = steps.at(-1)
    const result = frame.result as PolygonIntersection
    if (last?.action !== 'complete' || !last.result || result?.kind !== last.result.kind) throw new Error('Invalid final intersection')
    const points = resultPoints(result), expected = resultPoints(last.result)
    if (!points || points.length !== expected.length || points.some((p, i) => !samePoint(p, expected[i]))) throw new Error('Invalid final intersection')
  },
}

export function usePolygonTrace(preset: PolygonCase) {
  return useActionTrace('/api/convex-polygon-intersection/trace', JSON.stringify({ first: preset.first, second: preset.second }), decoder)
}
