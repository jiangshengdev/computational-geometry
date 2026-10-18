import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { formatPoint, samePoint, type Point } from '../../../../geometry/geometry'
import { pairName } from '../../geometry'
import { hoverHighlights, useHoverTarget } from '../geometry/hover'
import { usePageShortcut } from '../../../../app/usePageShortcut'
import { useLearningReducedMotion } from './useLearningReducedMotion'
import { usePanelScrollRef, useStepPanelScroll } from './useStepPanelScroll'
import { useEventTransfer } from './useEventTransfer'
import { executionNavigation } from './executionNavigation'
import { type LearningState } from './learningState'
import { useLingui } from '@lingui/react/macro'

type ReplayAction = {
  name: string
  key: string
  shift?: boolean
  hint: ReactNode
  variant?: 'primary' | 'tertiary'
  isDisabled: boolean
  onPress: () => void
}

export function useLearningReplay(state: LearningState, { onStepChange, onStepPreview, onWaitNextEntry }: {
  onStepChange: (index: number) => void
  onStepPreview: (index: number) => void
  onWaitNextEntry: () => void
}) {
  const { t } = useLingui()
  const { trace, index, generated, step, complete, pendingTarget, activeTarget, participantTarget } = state
  const [navigation, setNavigation] = useState({ from: index, reset: 0 })
  const keyboardScrub = useRef(false)
  const keyboardStep = useRef<number | null>(null)
  const finishKeyboardScrub = () => {
    keyboardScrub.current = false
    const next = keyboardStep.current
    keyboardStep.current = null
    if (next !== null) onStepChange(next)
  }
  const reducedMotion = useLearningReducedMotion()
  const animationId = useId()
  const [run, setRun] = useState(0)
  const [hover, setHover] = useHoverTarget()
  const [numbering, setNumbering] = useState<'active' | 'pending' | null>(null)
  const [currentPanel, attachCurrentPanel] = usePanelScrollRef()
  const [pendingPanel, attachPendingPanel] = usePanelScrollRef()
  const [activePanel, attachActivePanel] = usePanelScrollRef()
  const [participantsPanel, attachParticipantsPanel] = usePanelScrollRef()
  const [explanationPanel, attachExplanationPanel] = usePanelScrollRef()
  const titleProps = (kind: 'active' | 'pending') => ({
    className: 'learning-hover-item leading-normal transition-colors',
    'data-highlighted': numbering === kind,
    onPointerEnter: () => { setHover(null); setNumbering(kind) },
    onPointerLeave: () => setNumbering(null),
  })
  const highlights = hover ? hoverHighlights(hover, hover.kind === 'pair' ? trace.steps[index].results : []) : null
  const geometryHighlights = numbering === 'active' ? hoverHighlights({ kind: 'geometry', inputs: step.active, pairs: [] }, []) : highlights ?? (state.recordedOverlap ? hoverHighlights({ kind: 'pair', pair: pairName(state.recordedOverlap) }, step.results) : null)
  const sweep = { ...state.sweep, numbering }
  const eventProps = (point: Point) => ({
    'data-highlighted': highlights?.points.some(p => samePoint(p, point)) ?? false,
    onPointerEnter: () => setHover({ kind: 'point', point }),
    onPointerLeave: () => setHover(null),
  })
  const inputProps = (id: number) => ({
    'data-highlighted': highlights?.inputs.includes(id) ?? false,
    onPointerEnter: () => setHover({ kind: 'input', index: id }),
    onPointerLeave: () => setHover(null),
  })
  const rowIds = (state: typeof step) => [
    ...[...state.pending, ...(state.current ? [state.current] : [])].map(p => `event:${formatPoint(p)}`),
    ...state.active.map(id => `segment:${id}`),
  ]
  const destinations = rowIds(step)
  const sources = rowIds(trace.steps[navigation.from])
  const previousEntry = trace.steps.findLastIndex((state, position) => position < index && state.execution.entry)
  const nextEntry = trace.steps.findIndex((state, position) => position > index && state.execution.entry)
  const { stepOver, stepOut } = executionNavigation(trace.steps, index)
  useStepPanelScroll(step, run, [
    { panel: currentPanel, reset: true },
    { panel: pendingPanel, reset: step.action === 'initial', selector: pendingTarget ? `[data-event-id="${CSS.escape(formatPoint(pendingTarget))}"]` : undefined },
    { panel: activePanel, reset: step.action === 'initial', selector: activeTarget === undefined ? undefined : `[data-input-id="${activeTarget}"]` },
    { panel: participantsPanel, reset: step.action === 'initial' || step.action === 'take', selector: participantTarget === undefined ? undefined : `[data-input-id="${participantTarget}"]` },
    { panel: explanationPanel, reset: true },
  ])
  const prepareTransfer = useEventTransfer(step, reducedMotion, currentPanel, pendingPanel)
  const changeStep = (value: number | ((current: number) => number), singleStep = false, preview = false) => {
    setHover(null)
    setNumbering(null)
    const requested = typeof value === 'function' ? value(index) : value
    if (!generated && !preview && requested >= trace.steps.length) {
      onStepChange(requested)
      return
    }
    const next = Math.max(0, Math.min(trace.steps.length - 1, requested))
    const from = trace.steps[index], to = trace.steps[next]
    if (singleStep && !reducedMotion && next !== index && to.current && from.pending.some(point => samePoint(point, to.current!))) {
      prepareTransfer(formatPoint(to.current), 'current')
    } else if (singleStep && !reducedMotion && next !== index && from.current && to.pending.some(point => samePoint(point, from.current!))) {
      prepareTransfer(formatPoint(from.current), 'pending')
    } else prepareTransfer()
    setNavigation(current => ({
      from: index,
      reset: current.reset + (singleStep && !reducedMotion ? 0 : 1),
    }))
    if (preview) onStepPreview(next)
    else onStepChange(next)
  }
  const restart = () => { changeStep(0); setRun(r => r + 1) }
  const replayGroups: { id: string; name: string; actions: ReplayAction[] }[] = [
    { id: 'single', name: t`Single steps`, actions: [
      { name: t`Previous step`, key: 'ArrowLeft', hint: <ArrowLeft size={14} aria-hidden="true" />, isDisabled: index === 0, onPress: () => changeStep(current => current - 1, true) },
      { name: t`Next step`, key: 'ArrowRight', hint: <ArrowRight size={14} aria-hidden="true" />, variant: 'primary', isDisabled: complete, onPress: () => changeStep(current => current + 1, true) },
    ] },
    { id: 'function', name: t`Function navigation`, actions: [
      { name: t`Step over`, key: 'n', hint: 'N', isDisabled: stepOver < 0, onPress: () => changeStep(stepOver) },
      { name: t`Step out`, key: 'u', hint: 'U', isDisabled: stepOut < 0, onPress: () => changeStep(stepOut) },
    ] },
    { id: 'major', name: t`Major steps`, actions: [
      { name: t`Previous major step`, key: 'ArrowLeft', shift: true, hint: <>⇧<ArrowLeft size={14} aria-hidden="true" /></>, isDisabled: previousEntry < 0, onPress: () => changeStep(previousEntry) },
      { name: t`Next major step`, key: 'ArrowRight', shift: true, hint: <>⇧<ArrowRight size={14} aria-hidden="true" /></>, isDisabled: generated && nextEntry < 0, onPress: () => nextEntry < 0 ? onWaitNextEntry() : changeStep(nextEntry) },
    ] },
    { id: 'restart', name: t`Restart controls`, actions: [
      { name: t`Restart`, key: 'r', hint: 'R', variant: 'tertiary', isDisabled: false, onPress: restart },
    ] },
  ]
  const replayActions = replayGroups.flatMap(group => group.actions)
  usePageShortcut((event: KeyboardEvent) => {
    const action = replayActions.find(action => action.key.toLowerCase() === event.key.toLowerCase() && !!action.shift === event.shiftKey)
    if (!action) return
    event.preventDefault()
    if (!event.repeat && !action.isDisabled) action.onPress()
  }, replayActions.filter(action => action.shift).map(action => action.key))
  const progressProps = {
    onKeyDownCapture: (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) keyboardScrub.current = true
    },
    onKeyUpCapture: () => finishKeyboardScrub(),
    onBlurCapture: () => finishKeyboardScrub(),
  }
  const sliderProps = {
    onChange: (value: number | number[]) => changeStep(typeof value === 'number' ? value : value[0], false, true),
    onChangeEnd: (value: number | number[]) => {
      const next = typeof value === 'number' ? value : value[0]
      // React Aria emits change-end for every keydown, including repeat.
      // Match pointer dragging: preview while held, commit on release.
      if (keyboardScrub.current) keyboardStep.current = next
      else onStepChange(next)
    },
  }
  return {
    navigation, reducedMotion, animationId,
    run, hover, setHover, geometryHighlights, sweep, titleProps, eventProps, inputProps,
    attachCurrentPanel, attachPendingPanel, attachActivePanel, attachParticipantsPanel, attachExplanationPanel,
    destinations, sources, replayGroups, progressProps, sliderProps,
  }
}

export type LearningReplay = ReturnType<typeof useLearningReplay>
