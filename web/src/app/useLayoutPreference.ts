import { useState } from 'react'

// Each preference has its own key, so updating one cannot overwrite another.
export function useLayoutPreference<T>(key: string, initial: T, valid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
      return valid(saved) ? saved : initial
    } catch {
      return initial
    }
  })
  const update = (next: T) => {
    setValue(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* Keep this session usable when storage is unavailable. */ }
  }
  return [value, update] as const
}
