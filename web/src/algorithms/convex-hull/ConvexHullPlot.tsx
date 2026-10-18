import { useLingui } from '@lingui/react/macro'
import { formatPoint, samePoint, uniquePoints, type Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'
import type { HullInteraction } from './useHullInteraction'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'

export function ConvexHullPlot({ points, vertices = [], preview = false, interaction, viewport }: {
  points: Point[]
  vertices?: Point[]
  preview?: boolean
  interaction?: HullInteraction
  viewport?: GeometryViewport
}) {
  const { t } = useLingui()
  const width = viewport?.width ?? 160
  const height = viewport?.height ?? 120
  const projection = viewport ? viewport.projection : projectPoints(points, width, height, 16)
  const k = viewport?.transform.k ?? 1
  const path = projection ? vertices.map(p => `${projection.px(p)},${projection.py(p)}`).join(' ') : ''
  const positions = uniquePoints(points)
  return <svg ref={viewport?.svg} className={preview ? 'case-thumbnail' : 'geometry-viewport w-full'} viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'} aria-label={preview ? t`Input point preview` : t`Convex hull plot`}
    onPointerDown={() => interaction?.hover(null)}>
    {projection && <g data-layer="geometry" transform={viewport?.transform.toString()}>
      {vertices.length >= 3
        ? <polygon data-hull="polygon" points={path} fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="2" />
        : vertices.length === 2
          ? <polyline data-hull="segment" points={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
          : vertices.length === 1
            ? <circle data-hull="point" cx={projection.px(vertices[0])} cy={projection.py(vertices[0])} r={7 / k} fill="none" stroke="var(--accent)" strokeWidth={2 / k} />
            : null}
      {positions.map((p, index) => {
        const highlighted = Boolean(interaction?.active && samePoint(p, interaction.active.point))
        const selected = Boolean(interaction?.selected && samePoint(p, interaction.selected.point))
        return <g key={index} role={interaction ? 'button' : undefined} tabIndex={interaction ? 0 : undefined}
          aria-label={interaction ? `${t`Point`} ${formatPoint(p)}` : undefined} aria-pressed={interaction ? selected : undefined}
          data-highlighted={highlighted} data-selected={selected}
          onPointerEnter={event => { if (!event.buttons) interaction?.hover({ point: p, source: 'plot' }) }} onPointerLeave={() => interaction?.hover(null)}
          onFocus={() => interaction?.hover({ point: p, source: 'plot' })} onBlur={() => interaction?.hover(null)}
          onClick={() => interaction?.select({ point: p, source: 'plot' })}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); interaction?.select({ point: p, source: 'plot' }) }
          }}>
          <circle cx={projection.px(p)} cy={projection.py(p)} r={(preview ? 2.5 : 4) / k} fill="currentColor" />
          {interaction && <circle cx={projection.px(p)} cy={projection.py(p)} r={10 / k} fill="transparent" stroke={highlighted ? 'var(--accent)' : 'none'} strokeWidth={3 / k} />}
        </g>
      })}
    </g>}
    {points.length === 0 && <text x={width / 2} y={height / 2} textAnchor="middle" fill="currentColor">{t`No input points`}</text>}
  </svg>
}
