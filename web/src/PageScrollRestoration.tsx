import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'

// Page paths own their position; teaching-step query changes keep the same page.
export function PageScrollRestoration() {
  const { pathname } = useLocation()
  const positions = useRef(new Map<string, { x: number; y: number }>())

  useLayoutEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => { history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    const target = positions.current.get(pathname) ?? { x: 0, y: 0 }
    let restoring = true
    const remember = () => {
      if (!restoring) positions.current.set(pathname, { x: window.scrollX, y: window.scrollY })
    }
    const stop = () => {
      restoring = false
      observer.disconnect()
      remember()
    }
    const restore = () => {
      window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' })
      if (Math.abs(window.scrollX - target.x) < 1 && Math.abs(window.scrollY - target.y) < 1) stop()
    }
    // Async results can make the document tall enough only after route commit.
    const observer = new ResizeObserver(restore)
    observer.observe(document.body)
    restore()
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stop()
    }
    window.addEventListener('scroll', remember, { passive: true })
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', remember)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [pathname])

  return null
}
