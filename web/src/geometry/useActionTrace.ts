import { useEffect, useRef, useState } from 'react'
import { readNdjson } from './readNdjson'

export interface ActionTraceDecoder<Input, Step> {
  start: (frame: Record<string, unknown>) => Input
  step: (value: unknown, input: Input) => Step
  complete: (frame: Record<string, unknown>, input: Input, steps: Step[]) => void
}

export function useActionTrace<Input, Step>(endpoint: string, body: string, decoder: ActionTraceDecoder<Input, Step>) {
  type State = { input?: Input; steps: Step[]; status: 'loading' | 'complete' | 'cancelled' | 'error'; message?: string }
  const [state, setState] = useState<State>({ steps: [], status: 'loading' })
  const abort = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    abort.current = controller
    let current = true
    let input: Input | undefined
    const steps: Step[] = []
    let complete = false
    async function load() {
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        for await (const frames of readNdjson(response)) {
          for (const data of frames) {
            if (!data || typeof data !== 'object' || complete) throw new Error('Unexpected trace frame')
            const frame = data as Record<string, unknown>
            switch (frame.type) {
              case 'start':
                if (input !== undefined) throw new Error('Duplicate trace input')
                input = decoder.start(frame)
                break
              case 'step':
                if (input === undefined) throw new Error('Missing trace input')
                steps.push(decoder.step(frame.step, input))
                break
              case 'complete':
                if (input === undefined) throw new Error('Missing trace input')
                decoder.complete(frame, input, steps)
                complete = true
                break
              default: throw new Error('Unknown trace frame')
            }
          }
          if (current && !controller.signal.aborted) setState({ input, steps: steps.slice(), status: 'loading' })
        }
        if (!complete) throw new Error('Execution trace transfer interrupted')
        if (current && !controller.signal.aborted) setState({ input, steps: steps.slice(), status: 'complete' })
      } catch (error) {
        if (current && !controller.signal.aborted) setState({ input, steps: steps.slice(), status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }
    void load()
    return () => { current = false; controller.abort() }
  }, [endpoint, body, decoder])
  return { ...state, cancel: () => {
    abort.current?.abort()
    setState(previous => previous.status === 'loading' ? { ...previous, status: 'cancelled' } : previous)
  } }
}
