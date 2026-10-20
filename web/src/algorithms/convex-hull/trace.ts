import { useEffect, useRef, useState } from 'react'
import { samePoint, type Point } from '../../geometry/geometry'
import { readNdjson } from '../../geometry/readNdjson'
import type { HullCase } from './cases'

export type HullPhase = 'preprocess' | 'lower' | 'upper' | 'join'
export interface HullStep {
  phase: HullPhase
  action: 'input' | 'sort' | 'deduplicate' | 'select' | 'turn' | 'pop' | 'push' | 'chain_complete' | 'trim_lower' | 'trim_upper' | 'complete'
  order: number[]
  lower: number[]
  upper: number[]
  lower_complete: boolean
  upper_complete: boolean
  current: number | null
  position: number | null
  subjects: number[]
  turn: 'left' | 'right' | 'collinear' | null
  removed: number | null
  result: number[] | null
}
type HullFrame = { type: 'start'; points: Point[] } | { type: 'step'; step: HullStep } | { type: 'complete'; vertices: Point[] }
interface TraceState {
  points: Point[]
  steps: HullStep[]
  status: 'loading' | 'complete' | 'cancelled' | 'error'
  message?: string
}

export function useHullTrace(preset: HullCase) {
  const [state, setState] = useState<TraceState>({ points: [], steps: [], status: 'loading' })
  const abort = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    abort.current = controller
    let current = true
    let points: Point[] | undefined
    const steps: HullStep[] = []
    let complete = false
    async function load() {
      try {
        const response = await fetch('/api/convex-hull/trace', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: preset.points }), signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        for await (const frames of readNdjson(response)) {
          for (const data of frames) {
            const frame = data as HullFrame
            if (complete) throw new Error('Unexpected frame after completion')
            switch (frame.type) {
              case 'start':
                if (points || !Array.isArray(frame.points)) throw new Error('Invalid trace input')
                points = frame.points
                break
              case 'step': {
                if (!points) throw new Error('Missing trace input')
                const step = frame.step
                const ids = [...step.order, ...step.lower, ...step.upper, ...step.subjects, ...(step.result ?? []), ...[step.current, step.removed].filter(id => id !== null)]
                if (ids.some(id => !Number.isInteger(id) || id < 0 || id >= points!.length)) throw new Error('Invalid point identity')
                steps.push(step)
                break
              }
              case 'complete': {
                const last = steps.at(-1)
                if (!points || last?.action !== 'complete' || !last.result || !Array.isArray(frame.vertices)
                  || last.result.length !== frame.vertices.length
                  || last.result.some((id, index) => !samePoint(points![id], frame.vertices[index]))) throw new Error('Invalid final hull')
                complete = true
                break
              }
              default: throw new Error('Unknown trace frame')
            }
          }
          if (current && !controller.signal.aborted) setState({ points: points ?? [], steps: steps.slice(), status: 'loading' })
        }
        if (!complete) throw new Error('Execution trace transfer interrupted')
        if (current && !controller.signal.aborted) setState({ points: points!, steps: steps.slice(), status: 'complete' })
      } catch (error) {
        if (current && !controller.signal.aborted) setState({ points: points ?? [], steps: steps.slice(), status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }
    void load()
    return () => { current = false; controller.abort() }
  }, [preset])
  return { ...state, cancel: () => {
    abort.current?.abort()
    setState(previous => previous.status === 'loading' ? { ...previous, status: 'cancelled' } : previous)
  } }
}
