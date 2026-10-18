import { buttonVariants } from '@heroui/react/button'
import { Tooltip } from '@heroui/react/tooltip'
import { useLingui } from '@lingui/react/macro'
import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

export function GeometryInfo({ children }: { children: ReactNode }) {
  const { t } = useLingui()
  return <Tooltip>
    <Tooltip.Trigger<'button'> render={props => <button {...props} type="button" />} className={buttonVariants({ isIconOnly: true, variant: 'ghost', size: 'sm', className: 'inline-flex' })} aria-label={t`Legend and controls`}><Info size={16} aria-hidden="true" /></Tooltip.Trigger>
    <Tooltip.Content placement="bottom" className="max-w-xs">
      <div className="flex flex-col gap-1 text-sm">{children}</div>
    </Tooltip.Content>
  </Tooltip>
}
