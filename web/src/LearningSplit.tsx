import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useLayoutPreference } from './useLayoutPreference'
import './LearningSplit.css'

const gutterWidth = 16
const minimumPaneWidth = 280
const validRatio = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1

export function LearningSplit({ canvas, debuggerPanel }: { canvas: ReactNode; debuggerPanel: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; offset: number } | null>(null)
  const [width, setWidth] = useState(0)
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1100px)').matches)
  const [dragging, setDragging] = useState(false)
  const [ratio, setRatio] = useLayoutPreference('bo-learning-layout-v1-ratio', 0.5, validRatio)
  const available = Math.max(0, width - gutterWidth)
  const minimum = Math.min(minimumPaneWidth, available / 2)
  const clampWidth = (value: number) => Math.max(minimum, Math.min(available - minimum, value))
  const leftWidth = Math.round(clampWidth(available * ratio))
  const actualRatio = available > 0 ? leftWidth / available : 0.5

  useLayoutEffect(() => {
    const element = container.current!
    const measure = () => setWidth(element.getBoundingClientRect().width)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const media = window.matchMedia('(min-width: 1100px)')
    const updateDesktop = () => {
      setDesktop(media.matches)
      if (!media.matches) {
        drag.current = null
        setDragging(false)
      }
    }
    media.addEventListener('change', updateDesktop)
    return () => { observer.disconnect(); media.removeEventListener('change', updateDesktop) }
  }, [])

  const endDrag = () => { drag.current = null; setDragging(false) }
  const saveWidth = (value: number) => {
    if (available > 0) setRatio(clampWidth(value) / available)
  }

  return <div ref={container} className="learning-center learning-split" data-dragging={dragging}
    style={{ '--learning-canvas-width': width > 0 ? `${leftWidth}px` : '1fr' } as CSSProperties}>
    {canvas}
    <div className="learning-split-handle" role="separator" aria-label="画布与调试区宽度"
      aria-orientation="vertical" aria-valuemin={available > 0 ? Math.round(minimum / available * 100) : 50}
      aria-valuemax={available > 0 ? Math.round((available - minimum) / available * 100) : 50}
      aria-valuenow={Math.round(actualRatio * 100)} tabIndex={desktop ? 0 : -1}
      onPointerDown={event => {
        if (!desktop || event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointerId: event.pointerId, offset: event.clientX - container.current!.getBoundingClientRect().left - leftWidth }
        setDragging(true)
      }}
      onPointerMove={event => {
        if (drag.current?.pointerId !== event.pointerId) return
        saveWidth(event.clientX - container.current!.getBoundingClientRect().left - drag.current.offset)
      }}
      onPointerUp={event => {
        if (drag.current?.pointerId !== event.pointerId) return
        endDrag()
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onDoubleClick={() => setRatio(0.5)}
      onKeyDown={event => {
        // Keep the replay page shortcuts from handling a focused separator.
        event.stopPropagation()
        if (event.key === 'Home') { event.preventDefault(); setRatio(0.5) }
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          saveWidth(leftWidth + (event.key === 'ArrowLeft' ? -1 : 1) * available * 0.02)
        }
      }} />
    {debuggerPanel}
  </div>
}
