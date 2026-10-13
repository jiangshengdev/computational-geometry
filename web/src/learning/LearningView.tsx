import { type CSSProperties, type ReactNode } from 'react'
import { CircleHelp, Crosshair, ListOrdered, ListTree, Waypoints } from 'lucide-react'
import { GeometryView } from '../geometry/GeometryView'
import { type Preset } from '../cases/preset'
import { type SweepTrace } from './trace'
import './LearningWorkspace.css'
import { ExecutionPanel, ExecutionVariablesPanel } from './ExecutionPanel'
import { LearningDock } from './LearningDock'
import { learningLayouts, type LearningLayout } from './learningLayout'
import { learningState } from './learningState'
import { useLearningReplay } from './useLearningReplay'
import { learningPanels } from './LearningPanels'
import { LearningReplayControls } from './LearningReplayControls'
import { useLingui } from '@lingui/react'

export function LearningView({ preset, trace, complete: generated, index, onStepChange, onStepPreview, onWaitNextEntry, children, zenMode, layout }: {
  preset: Preset; trace: SweepTrace; complete: boolean; index: number; onStepChange: (index: number) => void; onStepPreview: (index: number) => void; onWaitNextEntry: () => void; children: ReactNode; zenMode: boolean; layout: LearningLayout
}) {
  const { _: translate } = useLingui()
  const [drawingWeight, codeWeight, variablesWeight] = learningLayouts[layout]
  const state = learningState(preset, trace, index, generated)
  const replay = useLearningReplay(state, { onStepChange, onStepPreview, onWaitNextEntry })
  const { step, before } = state
  const { run, hover, setHover, geometryHighlights, sweep } = replay
  const { participants, activeSegments, currentEvent, pendingEvents, explanations } = learningPanels(state, replay, translate)
  return <section aria-label="逐步学习" className="learning-view" data-zen-mode={zenMode}>
    <div className="learning-workspace">
      <LearningDock side="left" panels={[
        { id: 'participants', name: '同点参与线段', icon: Waypoints, content: participants },
        { id: 'active', name: '活动线段顺序', icon: ListOrdered, content: activeSegments },
      ]} />
      <div className="learning-center" style={{
        '--learning-column-total': drawingWeight + codeWeight + variablesWeight,
        '--learning-drawing-weight': drawingWeight,
        '--learning-code-weight': codeWeight,
      } as CSSProperties}>
        <GeometryView key={run} segments={preset.segments} results={step.results} selected={null} hoverTarget={hover} preserveViewKey={zenMode}
          highlights={geometryHighlights} onHover={setHover} sweep={sweep} />
        <ExecutionPanel steps={trace.steps} index={index} values={trace.values} />
        <ExecutionVariablesPanel step={step} previous={before} shear={trace.shear} values={trace.values} />
      </div>
      <LearningDock side="right" panels={[
        { id: 'current', name: '当前事件', icon: Crosshair, content: currentEvent },
        { id: 'pending', name: '待处理事件队列', icon: ListTree, content: pendingEvents },
        { id: 'explanations', name: '操作解释', icon: CircleHelp, content: explanations },
      ]} />
    </div>
    <LearningReplayControls state={state} replay={replay}>{children}</LearningReplayControls>
  </section>
}
