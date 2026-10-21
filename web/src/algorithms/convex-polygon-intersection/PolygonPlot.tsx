import { useLingui } from '@lingui/react/macro'
import { samePoint, uniquePoints, type Point } from '../../geometry/geometry'
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
  const activeBoundaries = step ? [first, second].map((boundary, side) => {
    const prefix = side === 0 ? 'A' : 'B'
    const edge = step.edges?.[side]
    const ids = edge ?? (step.vertex !== null && step.boundary === (side === 0 ? 'first' : 'second') ? [step.vertex] : [])
    return { boundary, side, prefix, edge, ids }
  }) : []
  const labels = step && projection ? activeBoundaries.flatMap(({ boundary, side, prefix, edge, ids }) => ids.map(id => ({
    id: `${prefix}${id}`,
    x: projection.px(boundary[id]),
    y: projection.py(boundary[id]) - (side === 0 ? 12 : 26) / scale,
    text: `${prefix}${id}${edge && id === edge[1] && step.relation && step.action !== 'advance' && step.action !== 'terminate' && step.action !== 'complete' ? ` · ${side === 0 ? 'B' : 'A'} ${((side === 0 ? step.relation.first_side : step.relation.second_side) === 'left') ? t`left side` : (side === 0 ? step.relation.first_side : step.relation.second_side) === 'right' ? t`right side` : t`on the supporting line`}` : ''}`,
  }))) : []
  const active = interaction?.active
  const activePoints = active?.source === 'panel' ? uniquePoints(active.points) : active ? [active.point] : []
  if (active && projection) {
    const groups = [
      { prefix: 'A', points: first }, { prefix: 'B', points: second },
      { prefix: 'C', points: step?.candidates ?? [] }, { prefix: 'R', points: vertices },
    ]
    groups.forEach((group, row) => {
      if (active.source === 'panel' && active.panel !== group.prefix) return
      for (const activePoint of activePoints) {
        const ids = group.points.flatMap((point, index) => {
          const id = `${group.prefix}${index}`
          return samePoint(point, activePoint) && !labels.some(label => label.id === id) ? [id] : []
        })
        if (ids.length) labels.push({
          id: ids.join(' '), text: ids.join(' · '),
          x: projection.px(activePoint), y: projection.py(activePoint) - (12 + row * 14) / scale,
        })
      }
    })
  }
  return <svg ref={viewport?.svg} className={preview ? 'case-thumbnail' : 'geometry-viewport w-full'}
    viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'}
    aria-label={preview ? t`Input polygon preview` : t`Convex polygon intersection plot`}
    onPointerDown={() => interaction?.hover(null)}>
    <defs><marker id={arrowId} viewBox="0 0 8 8" refX="8" refY="4" markerWidth={9 / scale} markerHeight={9 / scale} markerUnits="userSpaceOnUse" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill="var(--success)" /></marker></defs>
    {projection && <g data-layer="geometry" transform={viewport?.transform.toString()}>
      {/* Nested stroke widths keep both input identities visible on coincident boundaries. */}
      <polygon data-input="first" aria-label={t`Polygon A`} points={path(first)} fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeWidth={1.5 / scale} />
      <polygon data-input="second" aria-label={t`Polygon B`} points={path(second)} fill="var(--warning)" fillOpacity="0.08" stroke="var(--warning)" strokeDasharray={`${6 / scale} ${3 / scale}`} strokeWidth={1 / scale} />
      {result?.kind === 'polygon' && <polygon data-result="polygon" points={path(vertices)} fill="var(--success)" fillOpacity="0.25" stroke="var(--success)" strokeWidth={1 / scale} />}
      {result?.kind === 'segment' && <polyline data-result="segment" points={path(vertices)} fill="none" stroke="var(--success)" strokeWidth={1 / scale} />}
      {result?.kind === 'point' && <circle data-result="point" cx={projection.px(result.point)} cy={projection.py(result.point)} r={7 / scale} fill="var(--success)" />}
      <PlotPoints points={points} projection={projection} preview={preview} radius={preview ? 1.125 : 3} highlightRadius={8} highlightStrokeWidth={2} scale={scale} interaction={interaction} />
      {active?.source === 'panel' && active.edge && <DirectedLine data-highlighted-edge={active.panel}
        from={{ x: projection.px(active.edge[0]), y: projection.py(active.edge[0]) }}
        to={{ x: projection.px(active.edge[1]), y: projection.py(active.edge[1]) }}
        scale={scale} stroke="var(--accent)" strokeWidth={5 / scale} pointerEvents="none" />}
      {activeBoundaries.map(({ boundary, prefix, edge, ids }) => <g key={prefix} data-active-boundary={prefix} pointerEvents="none">
          {edge && <DirectedLine data-edge={prefix} data-from={edge[0]} data-to={edge[1]} from={{ x: projection.px(boundary[edge[0]]), y: projection.py(boundary[edge[0]]) }} to={{ x: projection.px(boundary[edge[1]]), y: projection.py(boundary[edge[1]]) }} scale={scale} stroke="var(--success)" strokeWidth={1.5 / scale} markerEnd={`url(#${arrowId})`} />}
          {ids.map(id => <g key={id} data-current-vertex={`${prefix}${id}`}>
            <circle cx={projection.px(boundary[id])} cy={projection.py(boundary[id])} r={6 / scale} fill="none" stroke="var(--success)" strokeWidth={2 / scale} />
          </g>)}
        </g>)}
      {step?.candidates.map((point, id) => <circle key={id} data-candidate-id={id} cx={projection.px(point)} cy={projection.py(point)} r={4 / scale} fill="none" stroke="var(--warning)" strokeWidth={2 / scale} pointerEvents="none" />)}
      {labels.length > 0 && <g data-layer="labels" pointerEvents="none">
        {/* Paint every outline before any fill so adjacent glyphs cannot erase text. */}
        {(['outline', 'fill'] as const).map(layer => <g key={layer} aria-hidden={layer === 'outline' ? true : undefined}>
          {labels.map(label => <text key={label.id} x={label.x} y={label.y} textAnchor="middle" fontSize={12 / scale}
            style={{ fill: layer === 'outline' ? 'none' : 'currentColor', stroke: layer === 'outline' ? '#fff' : 'none', strokeWidth: 3 / scale }}>
            {label.text}
          </text>)}
        </g>)}
      </g>}
    </g>}
  </svg>
}
