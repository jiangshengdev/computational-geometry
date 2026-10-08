import { useLayoutEffect, useRef, type RefObject } from 'react'

type Panel = 'current' | 'pending'
type Snapshot = { id: string; destination: Panel; rect: DOMRect; text: string; font: string; color: string }
type Transfer = { overlay: HTMLDivElement; animation: Animation; restore: () => void }

// A transferred row crosses independently clipped panels. Its temporary painted
// copy belongs to the viewport; the semantic rows stay in their actual lists.
export function useEventTransfer(step: object, reducedMotion: boolean, current: RefObject<HTMLDivElement | null>, pending: RefObject<HTMLDivElement | null>) {
  const snapshot = useRef<Snapshot | null>(null)
  const active = useRef<Transfer | null>(null)
  const stop = () => {
    const transfer = active.current
    active.current = null
    if (!transfer) return
    transfer.animation.cancel()
    transfer.overlay.remove()
    transfer.restore()
  }
  useLayoutEffect(() => {
    const captured = snapshot.current
    snapshot.current = null
    if (!captured || reducedMotion) return
    const panel = captured.destination === 'current' ? current.current : pending.current
    const selector = `[data-event-id="${CSS.escape(captured.id)}"]:not([aria-hidden="true"])`
    const target = panel?.querySelector<HTMLElement>(selector)
    if (!target) return
    const destination = target.getBoundingClientRect()
    const overlay = document.createElement('div')
    overlay.dataset.learningEventTransfer = captured.id
    overlay.setAttribute('aria-hidden', 'true')
    overlay.className = 'coordinates learning-event-transfer'
    overlay.textContent = captured.text
    Object.assign(overlay.style, {
      left: `${captured.rect.x}px`, top: `${captured.rect.y}px`,
      width: `${captured.rect.width}px`, height: `${captured.rect.height}px`,
      font: captured.font, color: captured.color,
    })
    const rows = [current.current, pending.current].flatMap(container =>
      [...container?.querySelectorAll<HTMLElement>(`[data-event-id="${CSS.escape(captured.id)}"]`) ?? []])
    rows.forEach(row => { row.dataset.eventTransferHidden = 'true' })
    document.body.append(overlay)
    const animation = overlay.animate([
      { left: `${captured.rect.x}px`, top: `${captured.rect.y}px`, width: `${captured.rect.width}px`, height: `${captured.rect.height}px` },
      { left: `${destination.x}px`, top: `${destination.y}px`, width: `${destination.width}px`, height: `${destination.height}px` },
    ], { duration: 320, easing: 'ease-in-out', fill: 'forwards' })
    const transfer: Transfer = { overlay, animation, restore: () => rows.forEach(row => { delete row.dataset.eventTransferHidden }) }
    active.current = transfer
    void animation.finished.then(() => {
      if (active.current === transfer) stop()
    }, () => {})
    // Scrolling or resizing invalidates captured viewport coordinates.
    window.addEventListener('scroll', stop, true)
    window.addEventListener('resize', stop)
    return () => {
      window.removeEventListener('scroll', stop, true)
      window.removeEventListener('resize', stop)
      stop()
    }
  }, [step, reducedMotion, current, pending])

  return (id?: string, destination: Panel = 'current') => {
    const ongoing = active.current
    const painted = ongoing && ongoing.overlay.dataset.learningEventTransfer === id ? ongoing.overlay.getBoundingClientRect() : undefined
    stop()
    snapshot.current = null
    if (!id || reducedMotion) return
    const source = destination === 'current' ? pending.current : current.current
    const row = source?.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(id)}"]:not([aria-hidden="true"])`)
    if (!row) return
    const style = getComputedStyle(row)
    snapshot.current = { id, destination, rect: painted ?? row.getBoundingClientRect(), text: row.textContent ?? '', font: style.font, color: style.color }
  }
}
