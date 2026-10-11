import { useCallback, useEffectEvent, useLayoutEffect, useRef, type RefObject } from 'react'

interface PanelTarget {
  panel: RefObject<HTMLDivElement | null>
  selector?: string
  reset?: boolean
}

// Layout offsets exclude Motion's temporary transforms during shared-row transfers.
function layoutTop(element: HTMLElement): number {
  let top = 0
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop
  return top
}

export function useStepPanelScroll(step: object, restart: number, targets: PanelTarget[]) {
  const locate = useEffectEvent(() => {
    for (const { panel: ref, selector, reset } of targets) {
      const panel = ref.current
      if (!panel) continue
      if (reset) {
        panel.scrollTop = 0
        continue
      }
      const marker = selector ? panel.querySelector<HTMLElement>(selector) : null
      if (!marker || marker.closest('[aria-hidden="true"]')) continue
      const row = marker.closest<HTMLElement>('li') ?? marker
      const top = layoutTop(row) - layoutTop(panel) - panel.clientTop
      const bottom = top + row.offsetHeight
      if (top < panel.scrollTop || row.offsetHeight > panel.clientHeight) panel.scrollTop = top
      else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight
    }
  })
  useLayoutEffect(() => { locate() }, [step, restart])
}

// Overlay components unmount their content when closed. Keep the reader's
// position with the learning view, across floating/pinned panel mounts.
export function usePanelScrollRef() {
  const panel = useRef<HTMLDivElement | null>(null)
  const position = useRef({ top: 0, left: 0 })
  const attach = useCallback((element: HTMLDivElement | null) => {
    if (!element) return
    panel.current = element
    element.scrollTop = position.current.top
    element.scrollLeft = position.current.left
    return () => {
      position.current = { top: element.scrollTop, left: element.scrollLeft }
      panel.current = null
    }
  }, [])
  return [panel, attach] as const
}
