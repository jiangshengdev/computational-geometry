export interface Rational { numerator: string; denominator: string }
export interface Point { x: Rational; y: Rational }
export interface Segment { start: Point; end: Point }
export type Geometry = { type: 'point'; point: Point } | { type: 'overlap'; start: Point; end: Point }
export interface Intersection { segments: [number, number]; geometry: Geometry }
export interface Preset { id: string; name: string; description: string; segments: Segment[]; learning?: { goal: string; verification: string; overlap?: boolean } }
export interface ExecutionVariable {
  name: string
  type: string
  availability: 'available' | 'unassigned' | 'unavailable'
  value: number | null
}
export interface ExecutionState {
  module: string
  boundary: number | null
  entry: boolean
  context: { function: string; parameters: ExecutionVariable[]; locals: ExecutionVariable[] }
}
export interface SweepStep {
  phase: 'initial' | 'processing' | 'processed'
  action: 'initial' | 'take-entry' | 'take-pop' | 'take-empty' | 'take' | 'insert' | 'remove' | 'record' | 'reorder' | 'check' | 'discover' | 'complete'
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
export interface SweepTrace { shear: Rational; steps: SweepStep[]; values: string[] }

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
