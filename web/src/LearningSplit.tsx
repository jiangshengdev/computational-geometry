import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useLayoutPreference } from './useLayoutPreference'
import './LearningSplit.css'

const gutterWidth = 16
const validRatio = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1

export function LearningSplit({ firstPanel, secondPanel, axis = 'x' }: { firstPanel: ReactNode; secondPanel: ReactNode; axis?: 'x' | 'y' }) {
  const vertical = axis === 'y'
  const minimumPaneSize = vertical ? 180 : 280
  const defaultRatio = vertical ? 4 / 7 : 0.5
  const mediaQuery = vertical ? '(min-width: 1100px) and (min-height: 720px)' : '(min-width: 1100px)'
  const container = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; offset: number } | null>(null)
  const [size, setSize] = useState(0)
  const [desktop, setDesktop] = useState(() => window.matchMedia(mediaQuery).matches)
  const [dragging, setDragging] = useState(false)
  const [ratio, setRatio] = useLayoutPreference(vertical ? 'bo-learning-layout-v1-height-ratio' : 'bo-learning-layout-v1-ratio', defaultRatio, validRatio)
  const available = Math.max(0, size - gutterWidth)
  const minimum = Math.min(minimumPaneSize, available / 2)
  const clampSize = (value: number) => Math.max(minimum, Math.min(available - minimum, value))
  const firstSize = Math.floor(clampSize(available * ratio))
  const actualRatio = available > 0 ? firstSize / available : defaultRatio

  useLayoutEffect(() => {
    const element = container.current!
    const measure = () => setSize(element.getBoundingClientRect()[vertical ? 'height' : 'width'])
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const media = window.matchMedia(mediaQuery)
    const updateDesktop = () => {
      setDesktop(media.matches)
      if (!media.matches) {
        drag.current = null
        setDragging(false)
      }
    }
    media.addEventListener('change', updateDesktop)
    return () => { observer.disconnect(); media.removeEventListener('change', updateDesktop) }
  }, [vertical, mediaQuery])

  const endDrag = () => { drag.current = null; setDragging(false) }
  const saveSize = (value: number) => {
    if (available > 0) setRatio(clampSize(value) / available)
  }

  return <div ref={container} className={`${vertical ? 'learning-visual-code' : 'learning-center'} learning-split`} data-axis={axis} data-dragging={dragging}
    style={{ '--learning-ratio': ratio, '--learning-gutter': `${gutterWidth}px`, '--learning-min-pane': `${minimumPaneSize}px` } as CSSProperties}>
    {firstPanel}
    <div className="learning-split-handle" role="separator" aria-label={vertical ? '画布与代码区高度' : '画布与代码区和变量区宽度'}
      aria-orientation={vertical ? 'horizontal' : 'vertical'} aria-valuemin={available > 0 ? Math.round(minimum / available * 100) : 50}
      aria-valuemax={available > 0 ? Math.round((available - minimum) / available * 100) : 50}
      aria-valuenow={Math.round(actualRatio * 100)} tabIndex={desktop ? 0 : -1}
      onPointerDown={event => {
        if (!desktop || event.button !== 0) return
        event.preventDefault()
        event.currentTarget.focus()
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointerId: event.pointerId, offset: (vertical ? event.clientY : event.clientX) - container.current!.getBoundingClientRect()[vertical ? 'top' : 'left'] - firstSize }
        setDragging(true)
      }}
      onPointerMove={event => {
        if (drag.current?.pointerId !== event.pointerId) return
        saveSize((vertical ? event.clientY : event.clientX) - container.current!.getBoundingClientRect()[vertical ? 'top' : 'left'] - drag.current.offset)
      }}
      onPointerUp={event => {
        if (drag.current?.pointerId !== event.pointerId) return
        endDrag()
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onDoubleClick={() => setRatio(defaultRatio)}
      onKeyDown={event => {
        // Keep the replay page shortcuts from handling a focused separator.
        event.stopPropagation()
        if (event.key === 'Home') { event.preventDefault(); setRatio(defaultRatio) }
        else if (event.key === (vertical ? 'ArrowUp' : 'ArrowLeft') || event.key === (vertical ? 'ArrowDown' : 'ArrowRight')) {
          event.preventDefault()
          saveSize(firstSize + (event.key === (vertical ? 'ArrowUp' : 'ArrowLeft') ? -1 : 1) * available * 0.02)
        }
      }} />
    {secondPanel}
  </div>
}
