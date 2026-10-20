import { useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router'

// Preview belongs to one navigation entry, never to a later case or URL.
export function useReplayPosition() {
  const location = useLocation()
  const [search, setSearch] = useSearchParams()
  const [preview, setPreview] = useState<{ location: typeof location; index: number } | null>(null)
  return {
    search,
    setSearch,
    previewIndex: preview?.location === location ? preview.index : undefined,
    previewStep: (index: number) => setPreview({ location, index }),
    commitStep: (next: number, current: number) => {
      setPreview(null)
      if (next === current) return
      const updated = new URLSearchParams(search)
      updated.set('step', String(next))
      setSearch(updated, { replace: true })
    },
  }
}

// React Aria emits change-end for every keydown, including repeats.
// Commit keyboard scrubbing on release/blur, just like pointer scrubbing.
export function useReplaySlider(onPreview: (index: number) => void, onCommit: (index: number) => void) {
  const location = useLocation()
  const keyboardScrub = useRef(false)
  const pending = useRef<{ location: typeof location; index: number } | null>(null)
  const finish = () => {
    keyboardScrub.current = false
    const next = pending.current
    pending.current = null
    if (next?.location === location) onCommit(next.index)
  }
  return {
    progressProps: {
      onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) keyboardScrub.current = true
      },
      onKeyUpCapture: finish,
      onBlurCapture: finish,
    },
    sliderProps: {
      onChange: (value: number | number[]) => {
        const index = typeof value === 'number' ? value : value[0]
        pending.current = { location, index }
        onPreview(index)
      },
      onChangeEnd: () => {
        if (!keyboardScrub.current) finish()
      },
    },
  }
}
