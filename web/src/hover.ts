import { pairName, type Intersection } from './geometry'

export type HoverTarget =
  | { kind: 'input'; index: number }
  | { kind: 'pair'; pair: string }
  | { kind: 'geometry'; inputs: number[]; pairs: string[] }

export function hoverHighlights(target: HoverTarget, results: Intersection[]) {
  if (target.kind === 'geometry') return target
  const pairs = results.filter(result => target.kind === 'input'
    ? result.segments.includes(target.index) : pairName(result) === target.pair)
  return {
    inputs: target.kind === 'input' ? [target.index] : pairs.flatMap(result => result.segments),
    pairs: pairs.map(pairName),
  }
}
