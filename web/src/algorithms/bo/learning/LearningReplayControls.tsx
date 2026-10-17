import { Fragment, type ReactNode } from 'react'
import { Button } from '@heroui/react/button'
import { ButtonGroup } from '@heroui/react/button-group'
import { Chip } from '@heroui/react/chip'
import { Slider } from '@heroui/react/slider'
import { type LearningState } from './learningState'
import { type LearningReplay } from './useLearningReplay'
import { useLingui } from '@lingui/react/macro'

export function LearningReplayControls({ state, replay, children }: {
  state: LearningState; replay: LearningReplay; children: ReactNode
}) {
  const { t } = useLingui()
  const { generated, index, trace, complete, phase } = state
  const { replayGroups, progressProps, sliderProps, animationId } = replay
  const lastStep = trace.steps.length - 1
  return <section aria-label={t`Replay controls`} className="learning-replay-controls">
      <div className="flex flex-wrap items-center gap-2">
        {replayGroups.map(group => {
          const buttons = group.actions.map((action, position) => <Button key={action.key} variant={action.variant ?? 'secondary'} size="sm" onPress={action.onPress} isDisabled={action.isDisabled} render={props => <button {...props} aria-keyshortcuts={`${action.shift ? 'Shift+' : ''}${action.key}`} />}>
            {position > 0 && <ButtonGroup.Separator />}
            {action.name}<Chip color="accent" variant="soft" size="sm" className={action.variant === 'primary' ? 'bg-white/20 text-white' : undefined} aria-hidden="true">{action.hint}</Chip>
          </Button>)
          return group.actions.length > 1 ? <ButtonGroup key={group.id} aria-label={group.name}>{buttons}</ButtonGroup> : <Fragment key={group.id}>{buttons}</Fragment>
        })}
      </div>
      <div className="learning-replay-progress" {...progressProps}>
        <span id={`${animationId}-step`} className="text-sm text-muted">{t`Drag to browse teaching steps (including microsteps)`} · <span className="font-mono whitespace-nowrap">{generated ? `${index} / ${lastStep}` : t`Current ${index} · Generated 0–${lastStep}`}</span> · {complete ? t`Learning complete` : generated ? phase : t`Generating trace`}</span>
        <Slider aria-label={t`Teaching step`} minValue={0} maxValue={trace.steps.length - 1} step={1} value={index} isDisabled={trace.steps.length === 1}
          {...sliderProps}>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb data-testid="teaching-step-thumb" aria-describedby={`${animationId}-step`} />
          </Slider.Track>
        </Slider>
      </div>
      {children}
    </section>
}
