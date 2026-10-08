import { type ReactNode, type Ref } from 'react'
import { motion, useIsPresent, usePresenceData } from 'motion/react'

export function LearningRow({ as = 'li', identity, existed, children, ref, ...hover }: {
  as?: 'li' | 'p'
  identity: string
  existed: boolean
  children: ReactNode
  ref?: Ref<HTMLLIElement & HTMLParagraphElement>
  'data-highlighted': boolean
  'data-checked'?: boolean
  'data-event-id'?: string
  'data-input-id'?: number
  onPointerEnter: () => void
  onPointerLeave: () => void
}) {
  const present = useIsPresent()
  const destinations = usePresenceData() as string[]
  const transferring = destinations.includes(identity)
  const Row = as === 'li' ? motion.li : motion.p
  return <Row ref={ref} layout="position" layoutId={identity.startsWith('event:') ? `${identity}:${as}` : identity}
    initial={existed ? false : { opacity: 0 }} animate={{ opacity: 1 }}
    exit={transferring && identity.startsWith('event:')
      ? { opacity: 0, transition: { duration: 0 } }
      : { opacity: transferring ? 1 : 0 }}
    transition={{ duration: 0.32, ease: 'easeInOut' }}
    // Only the destination paints during a shared-layout transfer.
    layoutCrossfade={false}
    aria-hidden={present ? undefined : true}
    style={{ pointerEvents: present ? undefined : 'none' }}
    className="coordinates learning-hover-item relative"
    {...hover} data-highlighted={present && hover['data-highlighted']}>{children}</Row>
}
