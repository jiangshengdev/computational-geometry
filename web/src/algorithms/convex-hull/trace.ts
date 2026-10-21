import { samePoint, type Point } from '../../geometry/geometry'
import { useActionTrace, type ActionTraceDecoder } from '../../geometry/useActionTrace'
import type { HullCase } from './cases'

export type HullPhase = 'preprocess' | 'lower' | 'upper' | 'join'
export interface HullStep {
  phase: HullPhase
  action: 'input' | 'sort' | 'deduplicate' | 'select' | 'turn' | 'pop' | 'push' | 'chain_complete' | 'trim_lower' | 'trim_upper' | 'complete'
  order: number[]
  lower: number[]
  upper: number[]
  lower_complete: boolean
  upper_complete: boolean
  current: number | null
  position: number | null
  subjects: number[]
  turn: 'left' | 'right' | 'collinear' | null
  removed: number | null
  result: number[] | null
}
const decoder: ActionTraceDecoder<Point[], HullStep> = {
  start(frame) {
    if (!Array.isArray(frame.points)) throw new Error('Invalid trace input')
    return frame.points as Point[]
  },
  step(value, points) {
    const step = value as HullStep
    const ids = [...step.order, ...step.lower, ...step.upper, ...step.subjects, ...(step.result ?? []), ...[step.current, step.removed].filter(id => id !== null)]
    if (ids.some(id => !Number.isInteger(id) || id < 0 || id >= points.length)) throw new Error('Invalid point identity')
    return step
  },
  complete(frame, points, steps) {
    const last = steps.at(-1)
    const vertices = frame.vertices as Point[]
    if (last?.action !== 'complete' || !last.result || !Array.isArray(vertices)
      || last.result.length !== vertices.length
      || last.result.some((id, index) => !samePoint(points[id], vertices[index]))) throw new Error('Invalid final hull')
  },
}

export function useHullTrace(preset: HullCase) {
  const trace = useActionTrace('/api/convex-hull/trace', JSON.stringify({ points: preset.points }), decoder)
  return { ...trace, points: trace.input ?? [] }
}
