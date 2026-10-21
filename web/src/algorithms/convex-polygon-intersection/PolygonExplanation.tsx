import { useLingui } from '@lingui/react/macro'
import type { PolygonStep } from './trace'
import { Button } from '@heroui/react/button'
import type { Point } from '../../geometry/geometry'
import type { PointInteraction } from '../../geometry/usePointInteraction'
import { PolygonSideLabel } from './PolygonSide'
import { boundaryColor, hasSideRelation, type PolygonSideInteraction } from './usePolygonSideInteraction'

export function PolygonExplanation({ step, first, second, interaction, sideInteraction }: {
  step: PolygonStep; first: Point[]; second: Point[]; interaction: PointInteraction; sideInteraction: PolygonSideInteraction
}) {
  const { t } = useLingui()
  const boundary = step.boundary === 'first' ? 'A' : 'B'
  const otherBoundary = boundary === 'A' ? 'B' : 'A'
  const reference = (prefix: string, ids: number[]) => {
    const points = ids.map(id => (prefix === 'A' ? first : second)[id])
    const target = ids.length === 1 ? { source: 'list' as const, point: points[0] }
      : { source: 'panel' as const, panel: prefix, points, edge: [points[0], points[1]] as [Point, Point] }
    return <Button size="sm" variant="tertiary" className="polygon-explanation-reference" style={{ color: boundaryColor(prefix === 'A' ? 0 : 1) }}
      onHoverStart={() => interaction.hover(target)} onHoverEnd={() => interaction.hover(null)}
      onFocus={() => interaction.hover(target)} onBlur={() => interaction.hover(null)}
      onPress={() => interaction.select(target)}>{ids.map(id => `${prefix}${id}`).join(' → ')}</Button>
  }
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
  const explanations: Record<NonNullable<PolygonStep['reason']>, string> = {
    contained: t`A convex polygon contains the segments between its points. Since all vertices are contained, the entire checked polygon is contained and is exactly the intersection.`,
    intersection: t`This point belongs to both polygon boundaries, so it belongs to the intersection. Keep it as a candidate for the final boundary.`,
    shared_edge: t`Every point of the shared interval belongs to both polygons. Its two endpoints represent the interval; there is no need to collect every point along it.`,
    interior_vertex: t`This endpoint lies on one polygon and inside the other, so it belongs to their intersection even without a new edge crossing. Keep it before advancing.`,
    first_crossing: t`An initial edge may be anywhere on the boundary. Counting from the first crossing lets the traversal cover the intersection boundary; the inside relation tells us which polygon's vertices to keep.`,
    crossing: t`After this crossing, the inside relation identifies which boundary contributes vertices to the intersection. Update it before collecting more vertices.`,
    collinear_outside: t`Collinear edges have no left or right turn to choose from. Use the known inside relation to keep the inside boundary in place while advancing the other; if it is unknown, advance A.`,
    cross_left_b_inside: t`With this direction order and B's endpoint to the left of A, advance A to compare its next edge with B's current edge. This follows the convex boundaries without checking every pair of edges.`,
    cross_left_b_outside: t`With this direction order and B's endpoint not to the left of A, advance B to compare its next edge with A's current edge. This follows the convex boundaries without checking every pair of edges.`,
    cross_right_a_outside: t`With this direction order and A's endpoint not to the left of B, advance A to compare its next edge with B's current edge. This follows the convex boundaries without checking every pair of edges.`,
    cross_right_a_inside: t`With this direction order and A's endpoint to the left of B, advance B to compare its next edge with A's current edge. This follows the convex boundaries without checking every pair of edges.`,
    opposite_contact: t`The polygons lie to the left of their counterclockwise boundaries. Opposite directions put their interiors on opposite sides of this line, so only the common point or segment can belong to both.`,
    separated_parallel: t`Each convex polygon stays in the left half-plane of each directed boundary edge. These parallel edges separate those half-planes, leaving no common point.`,
    both_circuits: t`Both boundaries have been traversed since counting began. Stop revisiting edges and organize the collected candidates into the final intersection.`,
    first_two_circuits: t`A has reached the traversal limit of two circuits. This bounds repeated visits even if B advances more slowly; now organize the collected candidates.`,
    second_two_circuits: t`B has reached the traversal limit of two circuits. This bounds repeated visits even if A advances more slowly; now organize the collected candidates.`,
    candidates: t`The intersection of convex polygons is convex. Taking the convex hull of the candidates keeps its extreme points and removes duplicates, interior points, and unnecessary points along straight edges.`,
  }
  return <div className="flex flex-col gap-3">
    {step.action === 'containment' ? <>
      <p>{t`Check whether polygon ${boundary} lies entirely inside or on polygon ${otherBoundary}.`}</p>
      <p>{step.vertex !== null && reference(boundary, [step.vertex])}: {step.contained ? t`Inside or on the other polygon` : t`Outside the other polygon; stop this containment check`}</p>
      <p>{step.contained
        ? t`This vertex meets the containment condition. Every vertex must meet it before we can conclude that the whole polygon is contained; this vertex alone is not enough.`
        : t`One outside vertex is enough to rule out complete containment in this direction. Checking the remaining vertices cannot change that conclusion, so this check stops. The polygons may still intersect.`}</p>
    </>
      : step.action === 'relation' && step.relation && step.edges ? <>
        <p>{t`Compare directed edges`}</p>
        <div>{reference('A', step.edges[0])}</div>
        <div>{reference('B', step.edges[1])}</div>
        <p>{step.relation.contact === 'none' ? t`No edge contact` : step.relation.contact === 'point' ? t`Point contact` : t`Shared interval`}</p>
        <p>{t`Contact tells us whether these edges share a point or interval. Their directions and endpoint sides guide which edge advances next; no contact here does not mean the polygons are disjoint.`}</p>
      </> : <>
        {step.action === 'advance' && <>
          <p>{t`Advance boundary`} {boundary}</p>
          <p>{t`The decision below uses the previous pair of edges. The canvas now shows the edges after advancing.`}</p>
        </>}
        {step.reason && <>
          <p>{reasons[step.reason]}</p>
          <p>{explanations[step.reason]}</p>
        </>}
      </>}
    {hasSideRelation(step) && <div className="flex flex-col items-start gap-1">{[0, 1].map(boundary => <PolygonSideLabel key={boundary} step={step} boundary={boundary} interaction={sideInteraction} />)}</div>}
    {step.phase === 'chasing' && <p>{t`Current inside relation`}: {step.inside === 'unknown' ? t`Not established` : step.inside === 'p' ? t`Following A inside B` : t`Following B inside A`}</p>}
    {step.result && <p>{t`Final intersection`}: {step.result.kind === 'empty' ? t`Empty set` : step.result.kind === 'point' ? t`Point` : step.result.kind === 'segment' ? t`Segment` : t`Polygon with area`}</p>}
  </div>
}
