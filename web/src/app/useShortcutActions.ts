import type { ShortcutAction } from './ShortcutAction'
import { usePageShortcut } from './usePageShortcut'

export function useShortcutActions(actions: readonly ShortcutAction[]) {
  usePageShortcut(event => {
    const action = actions.find(action => action.key.toLowerCase() === event.key.toLowerCase() && !!action.shift === event.shiftKey)
    if (!action) return
    event.preventDefault()
    if (!event.repeat && !action.isDisabled) action.onPress()
  }, actions.filter(action => action.shift).map(action => action.key))
}
