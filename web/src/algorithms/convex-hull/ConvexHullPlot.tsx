import { useLingui } from '@lingui/react/macro'
import type { Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'

export function ConvexHullPlot({ points, vertices = [], preview = false }: {
  points: Point[]
  vertices?: Point[]
  preview?: boolean
}) {
  const { t } = useLingui()
  const width = preview ? 160 : 640
  const height = preview ? 120 : 480
  const projection = projectPoints(points, width, height, preview ? 16 : 36)
  const path = projection ? vertices.map(p => `${projection.px(p)},${projection.py(p)}`).join(' ') : ''
  return <svg className={preview ? 'case-thumbnail' : 'w-full'} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={preview ? t`Input point preview` : t`Convex hull plot`}>
    {projection && <>
      {vertices.length >= 3
        ? <polygon data-hull="polygon" points={path} fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="2" />
        : vertices.length === 2
          ? <polyline data-hull="segment" points={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
          : vertices.length === 1
            ? <circle data-hull="point" cx={projection.px(vertices[0])} cy={projection.py(vertices[0])} r="7" fill="none" stroke="var(--accent)" strokeWidth="2" />
            : null}
      {points.map((p, index) => <circle key={index} data-input-index={index} cx={projection.px(p)} cy={projection.py(p)} r={preview ? 2.5 : 4} fill="currentColor" />)}
    </>}
    {points.length === 0 && <text x={width / 2} y={height / 2} textAnchor="middle" fill="currentColor">{t`No input points`}</text>}
  </svg>
}
