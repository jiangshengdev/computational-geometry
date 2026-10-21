import { useLingui } from '@lingui/react/macro'
import type { PolygonStep, Side } from './trace'
import { Button } from '@heroui/react/button'
import type { Point } from '../../geometry/geometry'
import type { PointInteraction } from '../../geometry/usePointInteraction'

export function PolygonExplanation({ step, first, second, interaction }: {
  step: PolygonStep; first: Point[]; second: Point[]; interaction: PointInteraction
}) {
  const { t } = useLingui()
  const boundary = step.boundary === 'first' ? 'A' : 'B'
  const reference = (prefix: string, ids: number[]) => {
    const points = ids.map(id => (prefix === 'A' ? first : second)[id])
    const target = ids.length === 1 ? { source: 'list' as const, point: points[0] }
      : { source: 'panel' as const, panel: prefix, points, edge: [points[0], points[1]] as [Point, Point] }
    return <Button size="sm" variant="tertiary" className="polygon-explanation-reference"
      onHoverStart={() => interaction.hover(target)} onHoverEnd={() => interaction.hover(null)}
      onFocus={() => interaction.hover(target)} onBlur={() => interaction.hover(null)}
      onPress={() => interaction.select(target)}>{ids.map(id => `${prefix}${id}`).join(' → ')}</Button>
  }
  const side = (value: Side) => value === 'left' ? t`left side` : value === 'right' ? t`right side` : t`on the supporting line`
  const reasons: Record<NonNullable<PolygonStep['reason']>, string> = {
    contained: t`Every checked vertex is inside or on the other boundary. Return this polygon directly.`,
    intersection: t`Collect the intersection of the current edges.`,
    shared_edge: t`Collect both ends of the shared edge interval.`,
    interior_vertex: t`The advancing boundary is inside the other polygon. Collect its current endpoint.`,
    first_crossing: t`First crossing: begin counting boundary circuits here and update which boundary is inside.`,
    crossing: t`The crossing changes which boundary is inside the other polygon.`,
    collinear_outside: t`The checked edges are collinear. Advance A unless A is marked inside B; otherwise advance B.`,
    cross_left_b_inside: t`For the checked edges, B turns left from A (or is parallel), and B's endpoint lies left of A. Advance A.`,
    cross_left_b_outside: t`For the checked edges, B turns left from A (or is parallel), and B's endpoint is not left of A. Advance B.`,
    cross_right_a_outside: t`For the checked edges, B turns right from A and A's endpoint is not left of B. Advance A.`,
    cross_right_a_inside: t`For the checked edges, B turns right from A and A's endpoint lies left of B. Advance B.`,
    opposite_contact: t`Oppositely directed collinear edges touch. Their common point or segment is the complete intersection. Stop chasing.`,
    separated_parallel: t`Parallel edges place both endpoints outside the opposite half-plane. The polygons are disjoint. Stop chasing.`,
    both_circuits: t`Both boundaries have completed a circuit. Stop chasing.`,
    first_two_circuits: t`A has completed two circuits. Stop chasing.`,
    second_two_circuits: t`B has completed two circuits. Stop chasing.`,
    candidates: t`Normalize the collected candidates: remove duplicates and interior points, and order the final intersection.`,
  }
  return <div className="flex flex-col gap-1">
    {step.action === 'containment' ? <p>{t`Containment check`} · {step.vertex !== null && reference(boundary, [step.vertex])}: {step.contained ? t`Inside or on the other polygon` : t`Outside the other polygon; stop this containment check`}</p>
      : step.action === 'relation' && step.relation && step.edges ? <>
        <p>{t`Compare directed edges`} · {reference('A', step.edges[0])} · {reference('B', step.edges[1])}</p>
        <p>{reference('A', [step.edges[0][1]])}: {side(step.relation.first_side)} B · {reference('B', [step.edges[1][1]])}: {side(step.relation.second_side)} A · {step.relation.contact === 'none' ? t`No edge contact` : step.relation.contact === 'point' ? t`Point contact` : t`Shared interval`}</p>
      </> : <p>{step.action === 'advance' && <>{t`Advance boundary`} {boundary} · </>}{step.reason && reasons[step.reason]}</p>}
    {step.phase === 'chasing' && <p>{t`Current inside relation`}: {step.inside === 'unknown' ? t`Not established` : step.inside === 'p' ? t`Following A inside B` : t`Following B inside A`}</p>}
    {step.result && <p>{t`Final intersection`}: {step.result.kind === 'empty' ? t`Empty set` : step.result.kind === 'point' ? t`Point` : step.result.kind === 'segment' ? t`Segment` : t`Polygon with area`}</p>}
  </div>
}
