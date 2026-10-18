import { useLingui } from '@lingui/react/macro'
import { formatPoint, samePoint, uniquePoints, type Point } from './geometry'
import type { projectPoints } from './projection'
import type { PointInteraction } from './usePointInteraction'

export function PlotPoints({ points, projection, preview = false, interaction, scale = 1 }: {
  points: Point[]
  projection: NonNullable<ReturnType<typeof projectPoints>>
  preview?: boolean
  interaction?: PointInteraction
  scale?: number
}) {
  const { t } = useLingui()
  return uniquePoints(points).map((p, index) => {
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
      <circle cx={projection.px(p)} cy={projection.py(p)} r={(preview ? 1.5 : 4) / scale} fill="currentColor" />
      {interaction && <circle cx={projection.px(p)} cy={projection.py(p)} r={10 / scale} fill="transparent" stroke={highlighted ? 'var(--accent)' : 'none'} strokeWidth={3 / scale} />}
    </g>
  })
}
