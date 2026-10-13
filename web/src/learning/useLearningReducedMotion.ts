import { useSyncExternalStore } from 'react'

const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const subscribeReducedMotion = (notify: () => void) => {
  reducedMotionPreference.addEventListener('change', notify)
  return () => reducedMotionPreference.removeEventListener('change', notify)
}
const readReducedMotion = () => reducedMotionPreference.matches

// Motion 14's useReducedMotion only reads the initial setting.
export function useLearningReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, readReducedMotion)
}
