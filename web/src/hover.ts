import { useCallback, useState } from 'react'
import { pairName, samePoint, type Intersection, type Point } from './geometry'

export type HoverTarget =
  | { kind: 'input'; index: number }
  | { kind: 'pair'; pair: string }
  | { kind: 'geometry'; inputs: number[]; pairs: string[] }
  | { kind: 'point'; point: Point }

export interface HoverHighlights { inputs: number[]; pairs: string[]; points: Point[] }

function sameHover(a: HoverTarget | null, b: HoverTarget | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  switch (a.kind) {
    case 'input': return b.kind === 'input' && a.index === b.index
    case 'pair': return b.kind === 'pair' && a.pair === b.pair
    case 'point': return b.kind === 'point' && samePoint(a.point, b.point)
    case 'geometry': return b.kind === 'geometry' &&
      a.inputs.length === b.inputs.length && a.inputs.every((id, i) => id === b.inputs[i]) &&
      a.pairs.length === b.pairs.length && a.pairs.every((pair, i) => pair === b.pairs[i])
  }
}

export function useHoverTarget() {
  const [hover, setHover] = useState<HoverTarget | null>(null)
  const update = useCallback((target: HoverTarget | null) => {
    setHover(previous => sameHover(previous, target) ? previous : target)
  }, [])
  return [hover, update] as const
}

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
