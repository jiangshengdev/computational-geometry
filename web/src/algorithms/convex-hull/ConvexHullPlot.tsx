import { useLingui } from '@lingui/react/macro'
import type { Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'
import type { PointInteraction } from '../../geometry/usePointInteraction'
import { PlotPoints } from '../../geometry/PlotPoints'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'

export function ConvexHullPlot({ points, vertices = [], preview = false, interaction, viewport }: {
  points: Point[]
  vertices?: Point[]
  preview?: boolean
  interaction?: PointInteraction
  viewport?: GeometryViewport
}) {
  const { t } = useLingui()
  const width = viewport?.width ?? 160
  const height = viewport?.height ?? 120
  const projection = viewport ? viewport.projection : projectPoints(points, width, height, 16)
  const k = viewport?.transform.k ?? 1
  const path = projection ? vertices.map(p => `${projection.px(p)},${projection.py(p)}`).join(' ') : ''
  return <svg ref={viewport?.svg} className={preview ? 'case-thumbnail' : 'geometry-viewport w-full'} viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'} aria-label={preview ? t`Input point preview` : t`Convex hull plot`}
    onPointerDown={() => interaction?.hover(null)}>
    {projection && <g data-layer="geometry" transform={viewport?.transform.toString()}>
      {vertices.length >= 3
        ? <polygon data-hull="polygon" points={path} fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth={2 / k} />
        : vertices.length === 2
          ? <polyline data-hull="segment" points={path} fill="none" stroke="var(--accent)" strokeWidth={2 / k} />
          : vertices.length === 1
            ? <circle data-hull="point" cx={projection.px(vertices[0])} cy={projection.py(vertices[0])} r={7 / k} fill="none" stroke="var(--accent)" strokeWidth={2 / k} />
            : null}
      <PlotPoints points={points} projection={projection} preview={preview} interaction={interaction} scale={k} />
    </g>}
    {points.length === 0 && <text x={width / 2} y={height / 2} textAnchor="middle" fill="currentColor">{t`No input points`}</text>}
  </svg>
}
