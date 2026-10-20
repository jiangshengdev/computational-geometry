import type { ReactNode } from 'react'
import { Button } from '@heroui/react/button'
import { Chip } from '@heroui/react/chip'
import { ButtonGroup } from '@heroui/react/button-group'

export type ShortcutAction = {
  name: string
  key: string
  shift?: boolean
  hint: ReactNode
  variant?: 'primary' | 'tertiary'
  isDisabled: boolean
  onPress: () => void
}

export function ShortcutActionButton({ action, children }: { action: ShortcutAction; children?: ReactNode }) {
  return <Button variant={action.variant ?? 'secondary'} size="sm" onPress={action.onPress} isDisabled={action.isDisabled} render={props => <button {...props} aria-keyshortcuts={`${action.shift ? 'Shift+' : ''}${action.key}`} />}>
    {children}
    {action.name}<Chip color="accent" variant="soft" size="sm" className={action.variant === 'primary' ? 'bg-white/20 text-white' : undefined} aria-hidden="true">{action.hint}</Chip>
  </Button>
}

export function ShortcutActionGroup({ actions, label }: { actions: readonly ShortcutAction[]; label: string }) {
  if (!actions.length) return null
  if (actions.length === 1) return <ShortcutActionButton action={actions[0]} />
  return <ButtonGroup aria-label={label}>
    {actions.map((action, position) => <ShortcutActionButton key={action.key} action={action}>
      {position > 0 && <ButtonGroup.Separator />}
    </ShortcutActionButton>)}
  </ButtonGroup>
}
