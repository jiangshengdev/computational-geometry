import { readNdjson } from '../../../../geometry/readNdjson'
import { formatPoint, rational, samePoint, type Point, type Rational } from '../../../../geometry/geometry'
import { type Intersection } from '../../geometry'
import { ComputationError } from '../ComputationError'

export interface ExecutionVariable {
  name: string
  type: string
  availability: 'available' | 'unassigned' | 'unavailable' | 'shadowed'
  value: number | null
  scope: string | null
}
export interface ExecutionControl {
  line: number
  keyword: string
  occurrence: number
  state: 'pending' | 'true' | 'false' | 'entered' | 'exhausted' | 'skipped' | 'jumping' | 'returned' | 'completed'
}
export interface ExecutionContext {
  id: number
  function: string
  parameters: ExecutionVariable[]
  captures: ExecutionVariable[]
  locals: ExecutionVariable[]
}
export type ExecutionVariableKind = 'parameters' | 'captures' | 'locals'
export interface ExecutionState {
  module: string
  boundary: number | null
  entry: boolean
  controls: ExecutionControl[]
  blocks: { line: number; phase: 'before' | 'after' }[]
  calls: { line: number; function: string; occurrence: number; arguments: ExecutionVariable[]; result: ExecutionVariable }[]
  context: ExecutionContext
  outer: ExecutionContext[]
  returning: boolean
  resuming: boolean
}
export interface SweepStep {
  phase: 'initial' | 'processing' | 'processed'
  action: 'initial' | 'take-entry' | 'take-pop' | 'take-empty' | 'take' | 'micro' | 'insert' | 'remove' | 'record' | 'reorder' | 'check' | 'discover' | 'complete'
  execution: ExecutionState
  subjects: number[]
  current: Point | null
  pending: Point[]
  active: number[]
  results: Intersection[]
  checked: [number, number][]
  starts: number[]
  ends: number[]
  passes: number[]
}
export interface SweepTrace { shear: Rational; steps: SweepStep[]; values: string[]; pointLabels: Point[] }
export interface WireSweepTrace {
  shear: Rational
  steps: (Omit<SweepStep, 'pending' | 'results'> & { pending: number[]; results: number[] })[]
  values: string[]
  point_values: Point[]
  result_values: Intersection[]
}

export interface TraceFrame extends WireSweepTrace {
  complete: boolean
  intersections?: Intersection[]
}

// Each frame appends dictionary entries before its steps reference them.
export class TraceDecoder {
  readonly trace: SweepTrace = { shear: rational('0'), steps: [], values: [], pointLabels: [] }
  private readonly labeledPoints = new Set<string>()
  private readonly points: Point[] = []
  private readonly results: Intersection[] = []
  complete = false
  intersections: Intersection[] = []

  append(frame: TraceFrame) {
    if (this.complete) throw new ComputationError(/*i18n*/ { id: 'Received a step after the execution trace completed', message: 'Received a step after the execution trace completed' })
    this.trace.shear = frame.shear
    for (const value of frame.values) this.trace.values.push(value)
    for (const point of frame.point_values) this.points.push(point)
    for (const result of frame.result_values) this.results.push(result)
    for (const step of frame.steps) {
      const previous = this.trace.steps.at(-1)
      const decoded = {
      ...step,
      pending: step.pending.map(index => {
        const point = this.points[index]
        if (!point) throw new ComputationError(/*i18n*/ { id: 'Invalid execution event index', message: 'Invalid execution event index' })
        return point
      }),
      results: step.results.map(index => {
        const result = this.results[index]
        if (!result) throw new ComputationError(/*i18n*/ { id: 'Invalid execution result index', message: 'Invalid execution result index' })
        return result
      }),
      }
      const known = decoded.results.flatMap(result => result.geometry.type === 'point' ? [result.geometry.point] : [])
      if (decoded.action === 'discover') known.push(...decoded.pending.filter(point => !previous?.pending.some(old => samePoint(old, point))))
      for (const point of known) {
        const key = formatPoint(point)
        if (!this.labeledPoints.has(key)) {
          this.labeledPoints.add(key)
          this.trace.pointLabels.push(point)
        }
      }
      this.trace.steps.push(decoded)
    }
    this.complete = frame.complete
    if (frame.complete) {
      if (!frame.intersections || !this.trace.steps.length) throw new ComputationError(/*i18n*/ { id: 'Invalid execution trace final state', message: 'Invalid execution trace final state' })
      this.intersections = frame.intersections
    }
  }
}

export async function consumeTrace(response: Response, onFrame: (decoder: TraceDecoder) => void) {
  const decoder = new TraceDecoder()
  try {
    for await (const frames of readNdjson(response)) {
      for (const frame of frames) decoder.append(frame as TraceFrame)
      if (decoder.trace.steps.length) onFrame(decoder)
    }
    if (!decoder.complete) throw new Error('Execution trace transfer interrupted')
  } catch (error) {
    if (error instanceof Error && error.message === 'Execution trace transfer interrupted') throw new ComputationError(/*i18n*/ { id: 'Execution trace transfer interrupted', message: 'Execution trace transfer interrupted' })
    if (error instanceof Error && error.message === 'The execution trace response has no body') throw new ComputationError(/*i18n*/ { id: 'The execution trace response has no body', message: 'The execution trace response has no body' })
    throw error
  }
}
