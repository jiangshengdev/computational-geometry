import { formatPoint, samePoint, type Point } from '../geometry/geometry'
import { type Preset } from '../cases/preset'
import { type SweepTrace } from './trace'
import { eventSide } from './eventSide'

export function learningState(preset: Preset, trace: SweepTrace, index: number, generated: boolean) {
  const step = trace.steps[index]
  const pointInputs = step.starts.filter(id => step.ends.includes(id))
  const recorded = step.action === 'record' ? step.results.at(-1) : undefined
  const recordedOverlap = recorded?.geometry.type === 'overlap' ? recorded : undefined
  const overlaps = step.results.filter(result => result.geometry.type === 'overlap')
  const visibleOverlaps = step.results.filter(result => result.geometry.type === 'overlap')
  const endingOverlaps = visibleOverlaps.filter(({ geometry }) => geometry.type === 'overlap' && step.current && samePoint(geometry.end, step.current))
  const continuingOverlapInputs = [...new Set(endingOverlaps.flatMap(result => result.segments))].filter(id => !step.ends.includes(id))
  const checkedInputs = step.action === 'check' || step.action === 'discover' ? step.subjects : []
  let neighborChange: typeof step | undefined
  if (checkedInputs.length) {
    for (let i = index - 1; i >= 0 && trace.steps[i].action !== 'take'; i--) {
      if (['insert', 'remove', 'reorder'].includes(trace.steps[i].action)) {
        neighborChange = trace.steps[i]
        break
      }
    }
  }
  const before = trace.steps[Math.max(0, index - 1)]
  const eventStart = trace.steps.findLastIndex((state, position) => position <= index && state.action === 'take')
  const eventSteps = step.action === 'complete' ? trace.steps.slice(eventStart, index + 1) : []
  const checkedWithoutDiscovery = eventSteps.some(state => state.action === 'check') && !eventSteps.some(state => state.action === 'discover')
  // A pop changes the queue, not the displayed sweep position. Keep its side too.
  const geometryIndex = trace.steps.findLastIndex((state, position) => position <= index && ((state.execution.module === 'activity' && !state.execution.entry && (state.execution.boundary === 7 || state.active.join(',') !== trace.steps[position - 1]?.active.join(','))) || !['take-entry', 'take-pop', 'take-empty', 'micro'].includes(state.action)))
  const geometryStep = trace.steps[geometryIndex]
  const complete = generated && index === trace.steps.length - 1
  const points = trace.pointLabels
  const pointName = (p: Point) => {
    const endpoints = preset.segments.flatMap((s, id) => [
      ...(samePoint(p, s.start) ? [`S${id} 起点`] : []),
      ...(samePoint(p, s.end) ? [`S${id} 终点`] : []),
    ])
    const boundary = overlaps.flatMap(({ geometry }) => geometry.type === 'overlap' ? [
      ...(samePoint(p, geometry.start) ? ['重叠起界'] : []),
      ...(samePoint(p, geometry.end) ? ['重叠止界'] : []),
    ] : [])
    const position = points.findIndex(point => samePoint(point, p))
    return `${endpoints.length ? endpoints.join(' / ') : position >= 0 ? `I${position}` : '待处理交点'} ${formatPoint(p)}${boundary.length ? ` · ${[...new Set(boundary)].join(' / ')}` : ''}`
  }
  const discovered = step.pending.filter(p => !preset.segments.some(segment => samePoint(p, segment.start) || samePoint(p, segment.end)))
  const newlyScheduled = discovered.filter(p => !before.pending.some(old => samePoint(old, p)))
  const pendingTarget = step.action === 'discover' ? newlyScheduled[0] : undefined
  const activeTarget = step.subjects.find(id => step.active.includes(id))
  const participantTarget = step.subjects.find(id => [...step.starts, ...step.ends, ...step.passes].includes(id))
  const phase = step.phase === 'initial' ? complete ? '学习完成' : '准备开始' : step.phase === 'processing' ? '事件处理中' : '事件处理完成'
  const sweep = {
    step: index,
    current: step.current,
    side: eventSide(geometryStep, trace.steps[geometryIndex + 1]),
    participants: [...step.starts, ...step.ends, ...step.passes],
    active: step.active,
    pending: step.pending,
    checked: checkedInputs,
    discovered: discovered.map(p => ({ point: p, label: pointName(p) })),
    labelPoint: pointName,
  }
  return {
    preset, trace, index, generated, step, before, complete, phase, pointInputs, recordedOverlap,
    overlaps, visibleOverlaps, endingOverlaps, continuingOverlapInputs, checkedInputs,
    neighborChange, checkedWithoutDiscovery, points, pointName, sweep,
    newlyScheduled, pendingTarget, activeTarget, participantTarget,
  }
}

export type LearningState = ReturnType<typeof learningState>
