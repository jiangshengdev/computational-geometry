import { NumberField } from '@heroui/react/number-field'
import { Label } from '@heroui/react/label'
import { useLingui } from '@lingui/react/macro'
import type { GeometryViewport } from '../../geometry/useGeometryViewport'
import { Button } from '@heroui/react/button'
import { ArrowUp, Compass } from 'lucide-react'
import { useId, useRef } from 'react'

export function HullRotationControls({ viewport, mainArrow }: {
  viewport: GeometryViewport
  mainArrow: { from: { x: number; y: number }; to: { x: number; y: number } } | null
}) {
  const { t } = useLingui()
  const reasonId = useId()
  const gesture = useRef<{ id: number; cx: number; cy: number; x: number; y: number; bearing: number; degrees: number; moved: boolean } | null>(null)
  const rotate = (value: number) => viewport.rotate(value, mainArrow?.to)
  return <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
    <NumberField value={Number(viewport.angle.toFixed(3)) % 360} onChange={rotate}
      formatOptions={{ maximumFractionDigits: 3, useGrouping: false }} className="w-36">
      <Label>{t`Canvas angle`} (°)</Label>
      <NumberField.Group><NumberField.Input /></NumberField.Group>
    </NumberField>
    <Button isIconOnly variant="tertiary" aria-label={t`Compass: drag to rotate, click to reset orientation`}
      style={{ touchAction: 'none' }}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return
        const box = event.currentTarget.getBoundingClientRect()
        const cx = box.x + box.width / 2, cy = box.y + box.height / 2
        gesture.current = { id: event.pointerId, cx, cy, x: event.clientX, y: event.clientY,
          bearing: Math.atan2(event.clientY - cy, event.clientX - cx), degrees: viewport.angle, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        const drag = gesture.current
        if (!drag || drag.id !== event.pointerId || !event.buttons) return
        if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return
        drag.moved = true
        // Ignore the singular center; unwrap the delta to cross north continuously.
        if (Math.hypot(event.clientX - drag.cx, event.clientY - drag.cy) < 2) return
        const bearing = Math.atan2(event.clientY - drag.cy, event.clientX - drag.cx)
        const delta = Math.atan2(Math.sin(bearing - drag.bearing), Math.cos(bearing - drag.bearing))
        drag.degrees += delta * 180 / Math.PI
        rotate(drag.degrees)
        drag.bearing = bearing
      }}
      onPointerCancel={() => { if (gesture.current) gesture.current.moved = true }}
      onKeyDown={() => { gesture.current = null }}
      onPress={() => { if (!gesture.current?.moved) viewport.resetOrientation() }}>
      <Compass size={24} aria-hidden="true" style={{ transform: `rotate(${viewport.angle - 45}deg)` }} />
    </Button>
    <Button size="sm" variant="tertiary" isDisabled={!mainArrow} aria-describedby={!mainArrow ? reasonId : undefined}
      onPress={() => {
        if (mainArrow) rotate(-90 - Math.atan2(mainArrow.to.y - mainArrow.from.y, mainArrow.to.x - mainArrow.from.x) * 180 / Math.PI)
      }}><ArrowUp size={16} aria-hidden="true" />{t`Point main arrow up`}</Button>
    <span id={reasonId} className="basis-full text-sm text-muted" style={{ visibility: mainArrow ? 'hidden' : 'visible' }}>
      {t`This step has no main arrow to align`}
    </span>
  </div>
}
