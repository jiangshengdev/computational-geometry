import { useLingui } from '@lingui/react/macro'
import { useLingui as useMessages } from '@lingui/react'
import { Button, buttonVariants } from '@heroui/react/button'
import { Slider } from '@heroui/react/slider'
import { Card } from '@heroui/react/card'
import { Alert } from '@heroui/react/alert'
import { useReplayPosition, useReplaySlider } from '../../app/useReplayPosition'
import { ReplayPositionLabel } from '../../app/ReplayPositionLabel'
import { AppLink } from '../../app/AppLink'
import { DocumentTitle } from '../../app/DocumentTitle'
import { CaseToolbar } from '../../geometry/CaseToolbar'
import { PointCoordinates } from '../../geometry/PointCoordinates'
import { usePointInteraction, type PointInteraction } from '../../geometry/usePointInteraction'
import { useGeometryViewport } from '../../geometry/useGeometryViewport'
import { GeometryViewControls } from '../../geometry/GeometryViewControls'
import { usePolygonTrace, type PolygonPhase, type PolygonStep } from './trace'
import type { Point } from '../../geometry/geometry'
import type { PolygonCase } from './cases'
import { PolygonPlot } from './PolygonPlot'
import { PolygonExplanation } from './PolygonExplanation'
import { resultPoints } from './result'
import './polygon.css'

export function PolygonLearning({ preset }: { preset: PolygonCase }) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const trace = usePolygonTrace(preset)
  const { search, previewIndex, previewStep, commitStep } = useReplayPosition()
  const raw = search.get('step') ?? '0'
  const urlIndex = /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : -1
  const index = previewIndex ?? urlIndex
  const step = trace.steps[index]
  const last = trace.steps.length - 1
  const interaction = usePointInteraction()
  const go = (destination: number) => { interaction.clear(); commitStep(destination, urlIndex) }
  const { progressProps, sliderProps } = useReplaySlider(destination => { interaction.clear(); previewStep(destination) }, go)
  const phases: { id: PolygonPhase; label: string }[] = [
    { id: 'containment', label: t`Containment checks` }, { id: 'chasing', label: t`Edge Chasing` }, { id: 'normalize', label: t`Normalize candidates` },
  ]
  const first = trace.input?.first ?? preset.first, second = trace.input?.second ?? preset.second
  return <>
    <DocumentTitle title={`${translate(preset.name)} · ${t`Learn step by step`}`} />
    <CaseToolbar name={translate(preset.name)} description={translate(preset.description)} backTo="/convex-polygon-intersection"
      trailingAction={<AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to={`/convex-polygon-intersection/cases/${preset.id}`}>{t`Back to results viewer`}</AppLink>} />
    <section className="learning-view polygon-learning" aria-label={t`Learn step by step`}>
      {step ? <div className="workspace polygon-learning-workspace" onKeyDown={event => { if (event.key === 'Escape') interaction.clear() }}>
        <div className="input-panel polygon-inputs">
          <PointCoordinates title={t`Polygon A vertices`} points={first} prefix="A" panel="input" interaction={interaction} stepKey={step}
            currentIds={step.edges?.[0] ?? (step.boundary === 'first' && step.vertex !== null ? [step.vertex] : [])} />
          <PointCoordinates title={t`Polygon B vertices`} points={second} prefix="B" panel="input" interaction={interaction} stepKey={step}
            currentIds={step.edges?.[1] ?? (step.boundary === 'second' && step.vertex !== null ? [step.vertex] : [])} />
        </div>
        <PolygonLearningCanvas first={first} second={second} step={step} interaction={interaction} />
        <div className="workspace-panel polygon-learning-results">
          <PointCoordinates title={t`Collected candidates`} points={step.candidates} prefix="C" interaction={interaction} stepKey={step} currentIds={step.added}>
            <p className="text-sm text-muted">{t`Candidates are not yet the final polygon.`}</p>
          </PointCoordinates>
          {step.result && <PointCoordinates title={t`Final intersection`} points={resultPoints(step.result)} prefix="R" interaction={interaction} />}
        </div>
      </div> : <p role="status" className="flex-1">{index < 0 || trace.status === 'complete' ? t`Invalid teaching step` : trace.status === 'loading' ? t`Waiting for the requested step` : t`Requested step is unavailable`}</p>}
      <section aria-label={t`Replay controls`} className="polygon-replay-controls">
        {step && <section aria-label={t`Current action`} data-action={step.action} data-phase={step.phase}><PolygonExplanation step={step} /></section>}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" isDisabled={index <= 0 || last < 0} onPress={() => go(Math.min(index - 1, last))}>{t`Previous step`}</Button>
          <Button size="sm" isDisabled={!step || index >= last} onPress={() => go(index + 1)}>{t`Next step`}</Button>
          <Button size="sm" variant="tertiary" isDisabled={last < 0} onPress={() => go(0)}>{t`Restart`}</Button>
          {phases.map(phase => {
            const destination = trace.steps.findIndex(candidate => candidate.phase === phase.id)
            return destination < 0 ? null : <Button key={phase.id} size="sm" variant="tertiary" onPress={() => go(destination)}>{phase.label}</Button>
          })}
          {trace.status === 'loading' && <Button size="sm" variant="tertiary" onPress={trace.cancel}>{t`Cancel loading`}</Button>}
        </div>
        <p role="status">{trace.status === 'loading' ? t`Generating trace · total unknown` : trace.status === 'complete' ? t`Trace generated` : trace.status === 'cancelled' ? t`Loading cancelled · recorded steps remain available` : t`Trace failed`}
          {step && <> · <ReplayPositionLabel index={index} last={last} generated={trace.status === 'complete'} /></>}</p>
        {trace.status === 'error' && <Alert status="danger" role="alert"><Alert.Content><Alert.Title>{t`Trace failed`}</Alert.Title><Alert.Description>{trace.message}</Alert.Description></Alert.Content></Alert>}
        {last >= 0 && <div {...progressProps}><Slider aria-label={t`Teaching step`} minValue={0} maxValue={Math.max(1, last)} step={1} value={step ? index : 0} isDisabled={last === 0} {...sliderProps}>
          <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
        </Slider></div>}
      </section>
    </section>
  </>
}

function PolygonLearningCanvas({ first, second, step, interaction }: { first: Point[]; second: Point[]; step: PolygonStep; interaction: PointInteraction }) {
  const { t } = useLingui()
  const viewport = useGeometryViewport([...first, ...second], { padding: 36 })
  return <div className="drawing"><Card>
    <Card.Header className="drawing-toolbar"><Card.Title>{t`Convex polygon intersection plot`}</Card.Title><GeometryViewControls {...viewport} /></Card.Header>
    <Card.Content className="flex min-h-0 flex-1 flex-col"><div className="drawing-surface flex flex-col">
      <PolygonPlot first={first} second={second} step={step} result={step.result ?? undefined} viewport={viewport} interaction={interaction} />
    </div></Card.Content>
  </Card></div>
}
