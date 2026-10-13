import { Fragment, type ReactNode } from 'react'
import { Button } from '@heroui/react/button'
import { ButtonGroup } from '@heroui/react/button-group'
import { Chip } from '@heroui/react/chip'
import { Slider } from '@heroui/react/slider'
import { type LearningState } from './learningState'
import { type LearningReplay } from './useLearningReplay'

export function LearningReplayControls({ state, replay, children }: {
  state: LearningState; replay: LearningReplay; children: ReactNode
}) {
  const { generated, index, trace, complete, phase } = state
  const { replayGroups, progressProps, sliderProps, animationId } = replay
  return <section aria-label="回放控制" className="learning-replay-controls">
      <div className="flex flex-wrap items-center gap-2">
        {replayGroups.map(group => {
          const buttons = group.actions.map((action, position) => <Button key={action.name} variant={action.variant ?? 'secondary'} size="sm" onPress={action.onPress} isDisabled={action.isDisabled} render={props => <button {...props} aria-keyshortcuts={`${action.shift ? 'Shift+' : ''}${action.key}`} />}>
            {position > 0 && <ButtonGroup.Separator />}
            {action.name}<Chip color="accent" variant="soft" size="sm" className={action.variant === 'primary' ? 'bg-white/20 text-white' : undefined} aria-hidden="true">{action.hint}</Chip>
          </Button>)
          return group.actions.length > 1 ? <ButtonGroup key={group.name} aria-label={group.name}>{buttons}</ButtonGroup> : <Fragment key={group.name}>{buttons}</Fragment>
        })}
      </div>
      <div className="learning-replay-progress" {...progressProps}>
        <span id={`${animationId}-step`} className="text-sm text-muted">拖动浏览教学步骤（含小步） · <span className="font-mono whitespace-nowrap">{generated ? `${index} / ${trace.steps.length - 1}` : `当前 ${index} · 已生成 0–${trace.steps.length - 1}`}</span> · {complete ? '学习完成' : generated ? phase : '轨迹生成中'}</span>
        <Slider aria-label="教学步骤" minValue={0} maxValue={trace.steps.length - 1} step={1} value={index} isDisabled={trace.steps.length === 1}
          {...sliderProps}>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb data-testid="teaching-step-thumb" aria-label="教学步骤" aria-describedby={`${animationId}-step`} />
          </Slider.Track>
        </Slider>
      </div>
      {children}
    </section>
}
