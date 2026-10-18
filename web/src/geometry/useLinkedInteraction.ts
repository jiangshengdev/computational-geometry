import { useState } from 'react'

/** Shared hover precedence and toggle selection for a plot/list pair. */
export function useLinkedInteraction<T>(sameTarget: (a: T, b: T) => boolean) {
  const [hovered, setHovered] = useState<T | null>(null)
  const [selected, setSelected] = useState<T | null>(null)
  return {
    active: hovered ?? selected,
    selected,
    hover: (target: T | null) => setHovered(target),
    select: (target: T) => setSelected(previous => previous && sameTarget(previous, target) ? null : target),
    clear: () => { setHovered(null); setSelected(null) },
  }
}
