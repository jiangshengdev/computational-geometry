import { type ReactNode } from 'react'
import { ShortcutActionGroup } from '../../../../app/ShortcutAction'
import { ReplayPositionLabel } from '../../../../app/ReplayPositionLabel'
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
        {replayGroups.map(group => <ShortcutActionGroup key={group.id} actions={group.actions} label={group.name} />)}
      </div>
      <div className="learning-replay-progress" {...progressProps}>
        <span id={`${animationId}-step`} className="text-sm text-muted">{t`Drag to browse teaching steps (including microsteps)`} · <ReplayPositionLabel index={index} last={lastStep} generated={generated} /> · {complete ? t`Learning complete` : generated ? phase : t`Generating trace`}</span>
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
