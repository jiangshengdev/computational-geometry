import { Card } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { ScrollShadow } from '@heroui/react/scroll-shadow'
import { useLingui } from '@lingui/react/macro'
import { useRef, type ReactNode } from 'react'
import { ToggleButton } from '@heroui/react/toggle-button'
import { formatPoint, type Point } from './geometry'
import { includesPoint, type PointInteraction } from './usePointInteraction'
import { PointPanelTitle } from './PointPanelTitle'
import { useStepPanelScroll } from '../algorithms/segment-intersection/bo/learning/useStepPanelScroll'

const idleTarget = {}

export function PointCoordinates({ title, points, prefix, interaction, children, currentIds = [], stepKey, highlightTitle = false, panel = prefix === 'P' ? 'input' : 'result' }: {
  title: string
  points?: Point[]
  children?: ReactNode
  prefix: string
  interaction?: PointInteraction
  panel?: 'input' | 'result'
  currentIds?: number[]
  stepKey?: object
  highlightTitle?: boolean
}) {
  const { t } = useLingui()
  const scrollport = useRef<HTMLDivElement>(null)
  useStepPanelScroll(stepKey ?? idleTarget, 0, [{ panel: scrollport, selector: currentIds.length ? `[data-point-id="${currentIds.at(-1)}"]` : undefined }])
  useStepPanelScroll(interaction?.active ?? idleTarget, 0, [{
    panel: scrollport,
    selector: interaction?.active?.source === 'plot' ? '[data-highlighted="true"]' : undefined,
  }])
  return <section aria-label={title} className={`workspace-panel ${panel}-panel`}><Card>
    <Card.Header>{highlightTitle && interaction && points ? <PointPanelTitle className="polygon-point-panel-title flex items-center gap-2"
      onHighlight={active => interaction.hover(active ? { source: 'panel', panel: prefix, points } : null)}>
      {title} <Chip aria-label={t`Point count`}>{points.length}</Chip>
    </PointPanelTitle> : <Card.Title render={props => <h2 {...props} />} className="flex items-center gap-2">{title} {points && <Chip aria-label={t`Point count`}>{points.length}</Chip>}</Card.Title>}</Card.Header>
    <Card.Content className="flex flex-col !overflow-hidden">{children}{points && (points.length === 0 ? <p>{t`No points`}</p> : <ScrollShadow ref={scrollport} className="pair-scroll" tabIndex={0} aria-label={title}>
      <ol className="flex flex-col gap-1 p-1">{points.map((p, index) => {
        const highlighted = includesPoint(interaction?.active, p)
        const selected = includesPoint(interaction?.selected, p)
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
