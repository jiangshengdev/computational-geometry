import { pairName, type Intersection, type Point } from './geometry'

export type HoverTarget =
  | { kind: 'input'; index: number }
  | { kind: 'pair'; pair: string }
  | { kind: 'geometry'; inputs: number[]; pairs: string[] }
  | { kind: 'point'; point: Point }

export interface HoverHighlights { inputs: number[]; pairs: string[]; points: Point[] }

export function hoverHighlights(target: HoverTarget, results: Intersection[]): HoverHighlights {
  if (target.kind === 'point') return { inputs: [], pairs: [], points: [target.point] }
  if (target.kind === 'geometry') return { ...target, points: [] }
  const pairs = results.filter(result => target.kind === 'input'
    ? result.segments.includes(target.index) : pairName(result) === target.pair)
  return {
    inputs: target.kind === 'input' ? [target.index] : pairs.flatMap(result => result.segments),
    pairs: pairs.map(pairName),
    points: [],
  }
}
