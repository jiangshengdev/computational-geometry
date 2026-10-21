import { Card } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { ScrollShadow } from '@heroui/react/scroll-shadow'
import { useLingui } from '@lingui/react/macro'
import { useRef, type ReactNode } from 'react'
import { ToggleButton } from '@heroui/react/toggle-button'
import { formatPoint, samePoint, type Point } from './geometry'
import type { PointInteraction } from './usePointInteraction'
import { useStepPanelScroll } from '../algorithms/segment-intersection/bo/learning/useStepPanelScroll'

const idleTarget = {}

export function PointCoordinates({ title, points, prefix, interaction, children, currentIds = [], stepKey, panel = prefix === 'P' ? 'input' : 'result' }: {
  title: string
  points?: Point[]
  children?: ReactNode
  prefix: string
  interaction?: PointInteraction
  panel?: 'input' | 'result'
  currentIds?: number[]
  stepKey?: object
}) {
  const { t } = useLingui()
  const scrollport = useRef<HTMLDivElement>(null)
  useStepPanelScroll(stepKey ?? idleTarget, 0, [{ panel: scrollport, selector: currentIds.length ? `[data-point-id="${currentIds.at(-1)}"]` : undefined }])
  useStepPanelScroll(interaction?.active ?? idleTarget, 0, [{
    panel: scrollport,
    selector: interaction?.active?.source === 'plot' ? '[data-highlighted="true"]' : undefined,
  }])
  return <section aria-label={title} className={`workspace-panel ${panel}-panel`}><Card>
    <Card.Header><Card.Title render={props => <h2 {...props} />} className="flex items-center gap-2">{title} {points && <Chip aria-label={t`Point count`}>{points.length}</Chip>}</Card.Title></Card.Header>
    <Card.Content className="flex flex-col !overflow-hidden">{children}{points && (points.length === 0 ? <p>{t`No points`}</p> : <ScrollShadow ref={scrollport} className="pair-scroll" tabIndex={0} aria-label={title}>
      <ol className="flex flex-col gap-1 p-1">{points.map((p, index) => {
        const highlighted = Boolean(interaction?.active && samePoint(p, interaction.active.point))
        const selected = Boolean(interaction?.selected && samePoint(p, interaction.selected.point))
        return <li key={index} data-point-id={index} data-current={currentIds.includes(index)} data-highlighted={highlighted} data-selected={selected}>
          {interaction ? <ToggleButton className="coordinates w-full justify-start" isSelected={selected}
            variant={highlighted || currentIds.includes(index) ? 'default' : 'ghost'} aria-current={currentIds.includes(index) ? 'step' : undefined}
            onChange={() => interaction.select({ point: p, source: 'list' })}
            onHoverStart={() => interaction.hover({ point: p, source: 'list' })} onHoverEnd={() => interaction.hover(null)}
            onFocus={() => interaction.hover({ point: p, source: 'list' })} onBlur={() => interaction.hover(null)}>
            <strong>{prefix}{index}</strong>{' '}<span>{formatPoint(p)}</span>
          </ToggleButton> : <div className="coordinates"><strong>{prefix}{index}</strong>{' '}<span>{formatPoint(p)}</span></div>}
        </li>
      })}</ol>
    </ScrollShadow>)}</Card.Content>
  </Card></section>
}
