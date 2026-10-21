import { useLayoutPreference } from './useLayoutPreference'
import { usePageShortcut } from './usePageShortcut'

export function useZenMode(key: string, enabled = true) {
  const [zenMode, setZenMode] = useLayoutPreference(key, false,
    (value): value is boolean => typeof value === 'boolean')
  usePageShortcut(event => {
    if (!enabled || event.key !== 'z') return
    event.preventDefault()
    if (!event.repeat) setZenMode(!zenMode)
  })
  return [zenMode, setZenMode] as const
}
