import { useLingui } from '@lingui/react/macro'
import type { Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'
import { PlotPoints } from '../../geometry/PlotPoints'
import type { PointInteraction } from '../../geometry/usePointInteraction'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'
import { resultPoints, type PolygonIntersection } from './result'
import { useId } from 'react'
import type { PolygonStep } from './trace'
import { DirectedLine } from '../convex-hull/HullDirection'

export function PolygonPlot({ first, second, result, preview = false, viewport, interaction, step }: {
  first: Point[]; second: Point[]; result?: PolygonIntersection; preview?: boolean
  viewport?: GeometryViewport; interaction?: PointInteraction
  step?: PolygonStep
}) {
  const { t } = useLingui()
  const arrowId = useId()
  const vertices = result ? resultPoints(result) : []
  const points = [...first, ...second, ...vertices, ...(step?.candidates ?? [])]
  const width = viewport?.width ?? 160, height = viewport?.height ?? 120
  const projection = viewport ? viewport.projection : projectPoints(points, width, height, 16)
  const scale = viewport?.transform.k ?? 1
  const path = (boundary: Point[]) => boundary.map(p => `${projection!.px(p)},${projection!.py(p)}`).join(' ')
  return <svg ref={viewport?.svg} className={preview ? 'case-thumbnail' : 'geometry-viewport w-full'}
    viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'}
    aria-label={preview ? t`Input polygon preview` : t`Convex polygon intersection plot`}
    onPointerDown={() => interaction?.hover(null)}>
    <defs><marker id={arrowId} viewBox="0 0 8 8" refX="8" refY="4" markerWidth={9 / scale} markerHeight={9 / scale} markerUnits="userSpaceOnUse" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--success)" /></marker></defs>
    {projection && <g data-layer="geometry" transform={viewport?.transform.toString()}>
      {/* Nested stroke widths keep both input identities visible on coincident boundaries. */}
      <polygon data-input="first" aria-label={t`Polygon A`} points={path(first)} fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeWidth={(preview ? 3 : 6) / scale} />
      <polygon data-input="second" aria-label={t`Polygon B`} points={path(second)} fill="var(--warning)" fillOpacity="0.08" stroke="var(--warning)" strokeDasharray={`${6 / scale} ${3 / scale}`} strokeWidth={(preview ? 2 : 4) / scale} />
      {result?.kind === 'polygon' && <polygon data-result="polygon" points={path(vertices)} fill="var(--success)" fillOpacity="0.25" stroke="var(--success)" strokeWidth={2 / scale} />}
      {result?.kind === 'segment' && <polyline data-result="segment" points={path(vertices)} fill="none" stroke="var(--success)" strokeWidth={2 / scale} />}
      {result?.kind === 'point' && <circle data-result="point" cx={projection.px(result.point)} cy={projection.py(result.point)} r={7 / scale} fill="var(--success)" />}
      <PlotPoints points={points} projection={projection} preview={preview} scale={scale} interaction={interaction} />
      {step && [first, second].map((boundary, side) => {
        const prefix = side === 0 ? 'A' : 'B'
        const edge = step.edges?.[side]
        const ids = edge ?? (step.vertex !== null && step.boundary === (side === 0 ? 'first' : 'second') ? [step.vertex] : [])
        return <g key={prefix} data-active-boundary={prefix} pointerEvents="none">
          {edge && <DirectedLine data-edge={prefix} data-from={edge[0]} data-to={edge[1]} from={{ x: projection.px(boundary[edge[0]]), y: projection.py(boundary[edge[0]]) }} to={{ x: projection.px(boundary[edge[1]]), y: projection.py(boundary[edge[1]]) }} scale={scale} stroke="var(--success)" strokeWidth={3 / scale} markerEnd={`url(#${arrowId})`} />}
          {ids.map(id => <g key={id} data-current-vertex={`${prefix}${id}`}>
            <circle cx={projection.px(boundary[id])} cy={projection.py(boundary[id])} r={8 / scale} fill="none" stroke="var(--success)" strokeWidth={2 / scale} />
            <text x={projection.px(boundary[id])} y={projection.py(boundary[id]) - (side === 0 ? 12 : 26) / scale} textAnchor="middle" fontSize={12 / scale} fill="currentColor">{prefix}{id}{edge && id === edge[1] && step.relation && step.action !== 'advance' && step.action !== 'terminate' && step.action !== 'complete' ? ` · ${side === 0 ? 'B' : 'A'} ${((side === 0 ? step.relation.first_side : step.relation.second_side) === 'left') ? t`left side` : (side === 0 ? step.relation.first_side : step.relation.second_side) === 'right' ? t`right side` : t`on the supporting line`}` : ''}</text>
          </g>)}
        </g>
      })}
      {step?.candidates.map((point, id) => <circle key={id} data-candidate-id={id} cx={projection.px(point)} cy={projection.py(point)} r={(step.added.includes(id) ? 7 : 4) / scale} fill="none" stroke="var(--warning)" strokeWidth={2 / scale} pointerEvents="none" />)}
    </g>}
  </svg>
}
