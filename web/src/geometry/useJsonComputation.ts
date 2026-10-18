import { useEffect, useState } from 'react'

type Computation<T> = { status: 'loading' } | { status: 'ready'; result: T } | { status: 'error'; message: string }

/** One exact JSON request per case; callers remount the viewer when its case changes. */
export function useJsonComputation<T>(endpoint: string, body: string, decode: (data: unknown) => T) {
  const [computation, setComputation] = useState<Computation<T>>({ status: 'loading' })
  useEffect(() => {
    const controller = new AbortController()
    async function compute() {
      try {
        const response = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = decode(await response.json())
        if (!controller.signal.aborted) setComputation({ status: 'ready', result })
      } catch (error) {
        if (!controller.signal.aborted) setComputation({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }
    void compute()
    return () => controller.abort()
  }, [endpoint, body, decode])
  return computation
}
