import { useEffect, useState } from 'react'
import type { Preset } from '../cases/preset'
import type { Intersection } from '../geometry/geometry'
import { consumeTrace, type SweepTrace } from '../learning/trace'

type Computation = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; results: Intersection[]; trace?: SweepTrace; complete: boolean }

// The keyed case/mode page owns this hook's lifetime; navigation stays outside it.
export function useComputation(preset: Preset, learning: boolean): Computation {
  const [computation, setComputation] = useState<Computation>({ status: 'loading' })
  useEffect(() => {
    let current = true
    const controller = new AbortController()
    async function compute() {
      try {
        const response = await fetch('/api/intersections', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments: preset.segments, trace: learning }), signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        if (learning) {
          await consumeTrace(response, decoder => {
            if (current) setComputation({ status: 'ready', results: decoder.complete ? decoder.intersections : decoder.trace.steps.at(-1)!.results,
              trace: { ...decoder.trace, steps: decoder.trace.steps.slice(), values: decoder.trace.values.slice() }, complete: decoder.complete })
          })
        } else {
          const data = await response.json() as { intersections: Intersection[] }
          if (!Array.isArray(data.intersections)) throw new Error('结果结构无效')
          if (current) setComputation({ status: 'ready', results: data.intersections, complete: true })
        }
      } catch (error) {
        if (current) setComputation({ status: 'error', message: error instanceof Error ? error.message : '未知错误' })
      }
    }
    void compute()
    return () => { current = false; controller.abort() }
  }, [preset, learning])
  return computation
}
