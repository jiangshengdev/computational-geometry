import { useCallback } from 'react'

// These outer wrappers have no other padding. Round their natural height
// without changing the dimensions or coordinates of their contents.
export function useRoundedBlockSize() {
  return useCallback((element: HTMLElement | null) => {
    if (!element) return
    let frame = 0
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.contentRect.height
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--rounded-block-padding', `${Math.ceil(height) - height}px`)
      })
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])
}
