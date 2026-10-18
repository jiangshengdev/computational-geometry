import { Button } from '@heroui/react/button'
import { ButtonGroup } from '@heroui/react/button-group'
import { Trans, useLingui } from '@lingui/react/macro'
import { Minus, Plus } from 'lucide-react'
import type { GeometryViewport } from './useGeometryViewport'

export function GeometryViewControls({ zoomIn, zoomOut, reset }: Pick<GeometryViewport, 'zoomIn' | 'zoomOut' | 'reset'>) {
  const { t } = useLingui()
  return <ButtonGroup variant="tertiary" size="sm" aria-label={t`Canvas view controls`}>
    <Button isIconOnly onPress={zoomIn} aria-label={t`Zoom in`}><Plus size={16} aria-hidden="true" /></Button>
    <Button isIconOnly onPress={zoomOut} aria-label={t`Zoom out`}><ButtonGroup.Separator /><Minus size={16} aria-hidden="true" /></Button>
    <Button onPress={reset}><ButtonGroup.Separator /><Trans>Reset view</Trans></Button>
  </ButtonGroup>
}
