import { ScrollShadow } from '@heroui/react/scroll-shadow'
import { ToggleButton } from '@heroui/react/toggle-button'
import { useLingui } from '@lingui/react/macro'
import { useRef } from 'react'
import { useStepPanelScroll } from '../segment-intersection/bo/learning/useStepPanelScroll'
import { triangleVertices, type Triangle } from './result'
import type { TriangleInteraction } from './useTriangleInteraction'

const idleTarget = {}

export function TriangleList({ triangles, interaction }: { triangles: Triangle[]; interaction: TriangleInteraction }) {
  const { t } = useLingui()
  const scrollport = useRef<HTMLDivElement>(null)
  useStepPanelScroll(interaction.active ?? idleTarget, 0, [{
    panel: scrollport,
    selector: interaction.active?.source === 'plot' ? '[data-highlighted="true"]' : undefined,
  }])
  return <ScrollShadow ref={scrollport} className="pair-scroll" tabIndex={0} aria-label={t`Triangles`}><ol className="flex flex-col gap-1 p-1">
    {triangles.map((triangle, index) => {
      const highlighted = interaction.active?.index === index
      const selected = interaction.selected?.index === index
      const labels = triangleVertices(triangle)
      return <li key={index} data-highlighted={highlighted} data-selected={selected}>
        <ToggleButton className="coordinates w-full justify-start" isSelected={selected} variant={highlighted ? 'default' : 'ghost'}
          aria-label={t`Triangle T${index}: ${labels}`}
          onChange={() => interaction.select({ index, source: 'list' })}
          onHoverStart={() => interaction.hover({ index, source: 'list' })} onHoverEnd={() => interaction.hover(null)}
          onFocus={() => interaction.hover({ index, source: 'list' })} onBlur={() => interaction.hover(null)}>
          <strong>T{index}</strong>{' '}<span>{labels}</span>
        </ToggleButton>
      </li>
    })}
  </ol></ScrollShadow>
}
