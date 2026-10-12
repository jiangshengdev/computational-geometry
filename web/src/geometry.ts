export interface Rational { numerator: string; denominator: string }
export interface Point { x: Rational; y: Rational }
export interface Segment { start: Point; end: Point }
export type Geometry = { type: 'point'; point: Point } | { type: 'overlap'; start: Point; end: Point }
export interface Intersection { segments: [number, number]; geometry: Geometry }
export interface Preset { id: string; name: string; description: string; segments: Segment[]; learning?: { goal: string; verification: string; overlap?: boolean } }
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
    if (this.complete) throw new Error('教学轨迹完成后仍收到步骤')
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
        if (!point) throw new Error('教学事件索引无效')
        return point
      }),
      results: step.results.map(index => {
        const result = this.results[index]
        if (!result) throw new Error('教学结果索引无效')
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
      if (!frame.intersections || !this.trace.steps.length) throw new Error('教学终态无效')
      this.intersections = frame.intersections
    }
  }
}

export async function consumeTrace(response: Response, onFrame: (decoder: TraceDecoder) => void) {
  if (!response.body) throw new Error('教学响应没有内容')
  const reader = response.body.getReader()
  const text = new TextDecoder()
  const decoder = new TraceDecoder()
  let pending = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      pending += text.decode(value, { stream: !done })
      let newline: number
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        if (line) decoder.append(JSON.parse(line) as TraceFrame)
      }
      if (decoder.trace.steps.length) onFrame(decoder)
      if (done) break
      // Let input and painting run between network chunks, even with a warm socket.
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
    if (pending.trim() || !decoder.complete) throw new Error('教学轨迹传输中断')
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
}

export function rational(value: string): Rational {
  const [numerator, denominator = '1'] = value.split('/')
  return { numerator, denominator }
}

export function point(x: string, y: string): Point {
  return { x: rational(x), y: rational(y) }
}

export function segment(x1: string, y1: string, x2: string, y2: string): Segment {
  return { start: point(x1, y1), end: point(x2, y2) }
}

export const formatRational = (value: Rational) => value.denominator === '1'
  ? value.numerator : `${value.numerator}/${value.denominator}`
export const formatPoint = (p: Point) => `(${formatRational(p.x)}, ${formatRational(p.y)})`
export const pairName = (result: Intersection) => result.segments.map(i => `S${i}`).join(' × ')
export const formatGeometry = (g: Geometry) => g.type === 'point'
  ? formatPoint(g.point) : `${formatPoint(g.start)} → ${formatPoint(g.end)}`

// Only the drawing uses approximate coordinates. HTTP and details keep strings.
export function approximate(value: Rational): number {
  const n = BigInt(value.numerator)
  const d = BigInt(value.denominator)
  const whole = n / d
  const fraction = (n % d) * 1_000_000_000_000n / d
  return Number(whole) + Number(fraction) / 1_000_000_000_000
}

export function samePoint(a: Point, b: Point): boolean {
  return ['x', 'y'].every(axis => {
    const av = a[axis as keyof Point], bv = b[axis as keyof Point]
    return BigInt(av.numerator) * BigInt(bv.denominator) === BigInt(bv.numerator) * BigInt(av.denominator)
  })
}

export function isVertical(segment: Segment): boolean {
  return !samePoint(segment.start, segment.end) &&
    samePoint({ x: segment.start.x, y: segment.end.y }, segment.end)
}
