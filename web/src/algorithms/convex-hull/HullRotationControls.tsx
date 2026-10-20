import { NumberField } from '@heroui/react/number-field'
import { Label } from '@heroui/react/label'
import { useLingui } from '@lingui/react/macro'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'
import { Button, buttonVariants } from '@heroui/react/button'
import { Tooltip } from '@heroui/react/tooltip'
import { ArrowUp, Compass, Info, RotateCcw } from 'lucide-react'
import { useId, useRef } from 'react'
import { useMove } from 'react-aria/useMove'

export function HullRotationControls({ viewport, mainArrow }: {
  viewport: GeometryViewport
  mainArrow: { from: { x: number; y: number }; to: { x: number; y: number } } | null
}) {
  const { t } = useLingui()
  const reasonId = useId()
  const degrees = useRef(0)
  const rotate = (value: number) => viewport.rotate(value, mainArrow?.to)
  const { moveProps } = useMove({
    onMoveStart: () => { degrees.current = viewport.angle },
    onMove: event => {
      const sensitivity = event.pointerType === 'keyboard' ? 1 : 0.5
      degrees.current += event.deltaX * sensitivity * (event.shiftKey ? 0.1 : 1)
      rotate(degrees.current)
    },
  })
  return <div className="flex items-center gap-1.5 whitespace-nowrap">
    <NumberField value={Number(viewport.angle.toFixed(3)) % 360} onChange={rotate}
      formatOptions={{ maximumFractionDigits: 3, useGrouping: false }} className="flex-row items-center gap-2">
      <Label>{t`Canvas angle`} (°)</Label>
      <NumberField.Group className="w-20"><NumberField.Input /></NumberField.Group>
    </NumberField>
    <span onKeyDownCapture={moveProps.onKeyDown}>
    <Button onPointerDown={moveProps.onPointerDown}
      size="sm" variant="tertiary" className="cursor-ew-resize"
      aria-label={t`Drag left or right to rotate; hold Shift for fine adjustment`}
      style={{ touchAction: 'none' }}>
      <Compass size={24} aria-hidden="true" style={{ transform: `rotate(${viewport.angle - 45}deg)` }} />
      {t`Rotate`}
    </Button>
    </span>
    <Button isIconOnly size="sm" variant="tertiary" aria-label={t`Reset orientation`} onPress={viewport.resetOrientation}>
      <RotateCcw size={16} aria-hidden="true" />
    </Button>
    <Button size="sm" variant="tertiary" isDisabled={!mainArrow} aria-describedby={!mainArrow ? reasonId : undefined}
      onPress={() => {
        if (mainArrow) rotate(-90 - Math.atan2(mainArrow.to.y - mainArrow.from.y, mainArrow.to.x - mainArrow.from.x) * 180 / Math.PI)
      }}><ArrowUp size={16} aria-hidden="true" />{t`Point main arrow up`}</Button>
    <Tooltip isDisabled={!!mainArrow}>
    <Tooltip.Trigger<'button'> render={props => <button {...props} type="button" />}
      className={buttonVariants({ isIconOnly: true, variant: 'ghost', size: 'sm', className: mainArrow ? 'invisible' : 'inline-flex' })}
      aria-label={t`This step has no main arrow to align`}><Info size={16} aria-hidden="true" /></Tooltip.Trigger>
    <Tooltip.Content placement="bottom">{t`This step has no main arrow to align`}</Tooltip.Content>
    </Tooltip>
    <span id={reasonId} className="sr-only">
      {t`This step has no main arrow to align`}
    </span>
  </div>
}
