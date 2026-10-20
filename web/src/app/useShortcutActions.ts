import type { ShortcutAction } from './ShortcutAction'
import { usePageShortcut } from './usePageShortcut'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

export function useShortcutActions(actions: readonly ShortcutAction[]) {
  const held = useRef(new Set<string>())
  const { pathname } = useLocation()
  useEffect(() => {
    const clear = () => held.current.clear()
    const release = (event: KeyboardEvent) => held.current.delete(event.code || event.key.toLowerCase())
    clear()
    window.addEventListener('keyup', release)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      clear()
      window.removeEventListener('keyup', release)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [pathname])
  usePageShortcut(event => {
    const action = actions.find(action => [action, ...action.alternatives ?? []].some(binding =>
      (binding.key.toLowerCase() === event.key.toLowerCase() || !!binding.code && binding.code === event.code)
      && !!binding.shift === event.shiftKey))
    if (!action) return
    event.preventDefault()
    const key = event.code || event.key.toLowerCase()
    if (action.isDisabled) { held.current.delete(key); return }
    if (event.repeat && (!action.repeat || !held.current.has(key))) return
    held.current.add(key)
    action.onPress()
  }, actions.flatMap(action => [action, ...action.alternatives ?? []])
    .filter(binding => binding.shift).flatMap(binding => [binding.key, ...binding.code ? [binding.code] : []]))
}
