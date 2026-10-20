import type { ReactNode } from 'react'
import { Button } from '@heroui/react/button'
import { Chip } from '@heroui/react/chip'
import { ButtonGroup } from '@heroui/react/button-group'

export type ShortcutBinding = {
  key: string
  code?: string
  shift?: boolean
}

export type ShortcutAction = ShortcutBinding & {
  name: string
  alternatives?: readonly ShortcutBinding[]
  repeat?: boolean
  hint: ReactNode
  variant?: 'primary' | 'tertiary'
  isDisabled: boolean
  onPress: () => void
}

export function ShortcutHint({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  return <Chip color="accent" variant="soft" size="sm" className={primary ? 'bg-white/20 text-white' : undefined} aria-hidden="true">{children}</Chip>
}

export function ShortcutActionButton({ action, children, hideName = false, descriptionId }: { action: ShortcutAction; children?: ReactNode; hideName?: boolean; descriptionId?: string }) {
  return <Button variant={action.variant ?? 'secondary'} size="sm" onPress={action.onPress} isDisabled={action.isDisabled} aria-label={action.name} aria-describedby={descriptionId} render={props => <button {...props} aria-keyshortcuts={[action, ...action.alternatives ?? []].map(binding => `${binding.shift ? 'Shift+' : ''}${binding.key === '+' ? 'plus' : binding.key}`).join(' ')} />}>
    {children}
    {!hideName && action.name}<ShortcutHint primary={action.variant === 'primary'}>{action.hint}</ShortcutHint>
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
