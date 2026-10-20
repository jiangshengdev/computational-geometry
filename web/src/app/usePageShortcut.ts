import { useEffect, useEffectEvent } from 'react'

export function usePageShortcut(handler: (event: KeyboardEvent) => void, shiftKeys: readonly string[] = []) {
  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.shiftKey && !shiftKeys.some(key => key.toLowerCase() === event.key.toLowerCase() || key === event.code)) return
    const target = event.target
    if (target instanceof Element && (
      target.closest('input:not([role="switch"]), textarea, select, [role="slider"], [role="combobox"], [role="listbox"], [role="dialog"]')
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
