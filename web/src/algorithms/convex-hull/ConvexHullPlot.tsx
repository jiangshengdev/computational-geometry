import { useLingui } from '@lingui/react/macro'
import { formatPoint, samePoint, uniquePoints, type Point } from '../../geometry/geometry'
import { projectPoints } from '../../geometry/projection'
import type { HullInteraction } from './useHullInteraction'

export function ConvexHullPlot({ points, vertices = [], preview = false, interaction }: {
  points: Point[]
  vertices?: Point[]
  preview?: boolean
  interaction?: HullInteraction
}) {
  const { t } = useLingui()
  const width = preview ? 160 : 640
  const height = preview ? 120 : 480
  const projection = projectPoints(points, width, height, preview ? 16 : 36)
  const path = projection ? vertices.map(p => `${projection.px(p)},${projection.py(p)}`).join(' ') : ''
  const positions = uniquePoints(points)
  return <svg className={preview ? 'case-thumbnail' : 'w-full'} viewBox={`0 0 ${width} ${height}`} role={preview ? 'img' : 'group'} aria-label={preview ? t`Input point preview` : t`Convex hull plot`}>
    {projection && <>
      {vertices.length >= 3
        ? <polygon data-hull="polygon" points={path} fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="2" />
        : vertices.length === 2
          ? <polyline data-hull="segment" points={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
          : vertices.length === 1
            ? <circle data-hull="point" cx={projection.px(vertices[0])} cy={projection.py(vertices[0])} r="7" fill="none" stroke="var(--accent)" strokeWidth="2" />
            : null}
      {positions.map((p, index) => {
        const highlighted = Boolean(interaction?.active && samePoint(p, interaction.active.point))
        const selected = Boolean(interaction?.selected && samePoint(p, interaction.selected.point))
        return <g key={index} role={interaction ? 'button' : undefined} tabIndex={interaction ? 0 : undefined}
          aria-label={interaction ? `${t`Point`} ${formatPoint(p)}` : undefined} aria-pressed={interaction ? selected : undefined}
          data-highlighted={highlighted} data-selected={selected}
          onPointerEnter={() => interaction?.hover({ point: p, source: 'plot' })} onPointerLeave={() => interaction?.hover(null)}
          onFocus={() => interaction?.hover({ point: p, source: 'plot' })} onBlur={() => interaction?.hover(null)}
          onClick={() => interaction?.select({ point: p, source: 'plot' })}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); interaction?.select({ point: p, source: 'plot' }) }
          }}>
          <circle cx={projection.px(p)} cy={projection.py(p)} r={preview ? 2.5 : 4} fill="currentColor" />
          {interaction && <circle cx={projection.px(p)} cy={projection.py(p)} r="10" fill="transparent" stroke={highlighted ? 'var(--accent)' : 'none'} strokeWidth="3" />}
        </g>
      })}
    </>}
    {points.length === 0 && <text x={width / 2} y={height / 2} textAnchor="middle" fill="currentColor">{t`No input points`}</text>}
  </svg>
}
