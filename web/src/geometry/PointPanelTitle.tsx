import { Card } from '@heroui/react/card'
import type { ReactNode } from 'react'

export function PointPanelTitle({ children, className, onHighlight }: {
  children: ReactNode; className: string; onHighlight: (active: boolean) => void
}) {
  return <Card.Title render={props => <h2 {...props} />} className={className} tabIndex={0}
    onPointerEnter={() => onHighlight(true)} onPointerLeave={() => onHighlight(false)}
    onFocus={() => onHighlight(true)} onBlur={() => onHighlight(false)}>{children}</Card.Title>
}
