import { useEffect, useEffectEvent } from 'react'

export function usePageShortcut(handler: (event: KeyboardEvent) => void) {
  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const target = event.target
    if (target instanceof Element && (
      target.closest('input, textarea, select, [role="slider"], [role="combobox"], [role="listbox"], [role="dialog"]')
      || (target instanceof HTMLElement && target.isContentEditable)
    )) return
    handler(event)
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => handleShortcut(event)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
