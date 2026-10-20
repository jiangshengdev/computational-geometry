import { ButtonGroup } from '@heroui/react/button-group'
import { useLingui } from '@lingui/react/macro'
import { Minus, Plus, Scan } from 'lucide-react'
import type { GeometryViewport } from './useGeometryViewport'
import { ShortcutActionButton, type ShortcutAction } from '../app/ShortcutAction'
import { useShortcutActions } from '../app/useShortcutActions'

export function GeometryViewControls({ zoomIn, zoomOut, center, reset }: Pick<GeometryViewport, 'zoomIn' | 'zoomOut' | 'center' | 'reset'>) {
  const { t } = useLingui()
  const actions: ShortcutAction[] = [
    { name: t`Zoom in`, key: '=', alternatives: [{ key: '+', shift: true }, { key: '+' }], hint: '+ / =', isDisabled: false, onPress: zoomIn, variant: 'tertiary' },
    { name: t`Zoom out`, key: '-', hint: '−', isDisabled: false, onPress: zoomOut, variant: 'tertiary' },
    { name: t`Center canvas`, key: 'c', hint: 'C', isDisabled: false, onPress: center, variant: 'tertiary' },
    { name: t`Reset view`, key: '0', code: 'Digit0', shift: true, hint: 'Shift+0', isDisabled: false, onPress: reset, variant: 'tertiary' },
  ]
  useShortcutActions(actions)
  return <ButtonGroup variant="tertiary" size="sm" aria-label={t`Canvas view controls`}>
    <ShortcutActionButton action={actions[0]} hideName><Plus size={16} aria-hidden="true" /></ShortcutActionButton>
    <ShortcutActionButton action={actions[1]} hideName><ButtonGroup.Separator /><Minus size={16} aria-hidden="true" /></ShortcutActionButton>
    <ShortcutActionButton action={actions[2]}><ButtonGroup.Separator /><Scan size={16} aria-hidden="true" /></ShortcutActionButton>
    <ShortcutActionButton action={actions[3]}><ButtonGroup.Separator /></ShortcutActionButton>
  </ButtonGroup>
}
