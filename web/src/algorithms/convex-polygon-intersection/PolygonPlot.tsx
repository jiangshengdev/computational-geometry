import { useLingui } from '@lingui/react/macro'
import type { Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'
import { PlotPoints } from '../../geometry/PlotPoints'
import type { PointInteraction } from '../../geometry/usePointInteraction'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'
import { resultPoints, type PolygonIntersection } from './result'

export function PolygonPlot({ first, second, result, preview = false, viewport, interaction }: {
  first: Point[]; second: Point[]; result?: PolygonIntersection; preview?: boolean
  viewport?: GeometryViewport; interaction?: PointInteraction
}) {
  const { t } = useLingui()
  const vertices = result ? resultPoints(result) : []
  const points = [...first, ...second, ...vertices]
  const width = viewport?.width ?? 160, height = viewport?.height ?? 120
  const projection = viewport ? viewport.projection : projectPoints(points, width, height, 16)
  const scale = viewport?.transform.k ?? 1
  const path = (boundary: Point[]) => boundary.map(p => `${projection!.px(p)},${projection!.py(p)}`).join(' ')
  return <svg ref={viewport?.svg} className={preview ? 'case-thumbnail' : 'geometry-viewport w-full'}
    viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'}
    aria-label={preview ? t`Input polygon preview` : t`Convex polygon intersection plot`}
    onPointerDown={() => interaction?.hover(null)}>
    {projection && <g data-layer="geometry" transform={viewport?.transform.toString()}>
      <polygon data-input="first" aria-label={t`Polygon A`} points={path(first)} fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeWidth={2 / scale} />
      <polygon data-input="second" aria-label={t`Polygon B`} points={path(second)} fill="var(--warning)" fillOpacity="0.08" stroke="var(--warning)" strokeDasharray={`${6 / scale} ${3 / scale}`} strokeWidth={2 / scale} />
      {result?.kind === 'polygon' && <polygon data-result="polygon" points={path(vertices)} fill="var(--success)" fillOpacity="0.25" stroke="var(--success)" strokeWidth={3 / scale} />}
      {result?.kind === 'segment' && <polyline data-result="segment" points={path(vertices)} fill="none" stroke="var(--success)" strokeWidth={5 / scale} />}
      {result?.kind === 'point' && <circle data-result="point" cx={projection.px(result.point)} cy={projection.py(result.point)} r={7 / scale} fill="var(--success)" />}
      <PlotPoints points={points} projection={projection} preview={preview} scale={scale} interaction={interaction} />
    </g>}
  </svg>
}
