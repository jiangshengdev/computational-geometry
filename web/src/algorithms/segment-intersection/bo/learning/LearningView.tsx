import { type CSSProperties, type ReactNode } from 'react'
import { CircleHelp, Crosshair, ListOrdered, ListTree, Waypoints } from 'lucide-react'
import { GeometryView } from '../geometry/GeometryView'
import { type Preset } from '../../cases/preset'
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
import { msg } from '@lingui/core/macro'

export function LearningView({ preset, trace, complete: generated, index, onStepChange, onStepPreview, onWaitNextEntry, children, zenMode, layout }: {
  preset: Preset; trace: SweepTrace; complete: boolean; index: number; onStepChange: (index: number) => void; onStepPreview: (index: number) => void; onWaitNextEntry: () => void; children: ReactNode; zenMode: boolean; layout: LearningLayout
}) {
  const { _: translate } = useLingui()
  const [drawingWeight, codeWeight, variablesWeight] = learningLayouts[layout]
  const state = learningState(preset, trace, index, generated, translate)
  const replay = useLearningReplay(state, { onStepChange, onStepPreview, onWaitNextEntry })
  const { step, before } = state
  const { run, hover, setHover, geometryHighlights, sweep } = replay
  const { participants, activeSegments, currentEvent, pendingEvents, explanations } = learningPanels(state, replay, translate)
  return <section aria-label={translate(msg`Step-by-step learning`)} className="learning-view" data-zen-mode={zenMode}>
    <div className="learning-workspace">
      <LearningDock side="left" panels={[
        { id: 'participants', name: translate(msg`Segments at this point`), icon: Waypoints, content: participants },
        { id: 'active', name: translate(msg`Active segment order`), icon: ListOrdered, content: activeSegments },
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
        { id: 'current', name: translate(msg`Current event`), icon: Crosshair, content: currentEvent },
        { id: 'pending', name: translate(msg`Pending event queue`), icon: ListTree, content: pendingEvents },
        { id: 'explanations', name: translate(msg`Action explanation`), icon: CircleHelp, content: explanations },
      ]} />
    </div>
    <LearningReplayControls state={state} replay={replay}>{children}</LearningReplayControls>
  </section>
}
