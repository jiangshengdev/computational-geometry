import { buttonVariants } from '@heroui/react/button'
import { useLingui } from '@lingui/react/macro'
import { AppLink } from '../app/AppLink'
import { CaseDescription } from './CaseDescription'
import type { ReactNode } from 'react'

export function CaseToolbar({ name, description, backTo, children, trailingAction }: { name: string, description: string, backTo: string, children?: ReactNode, trailingAction?: ReactNode }) {
  const { t } = useLingui()
  return <div className="case-toolbar">
    <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to={backTo}>{t`Back to cases`}</AppLink>
    <h1 className="text-xl font-semibold">{name}</h1>
    <div className="case-actions flex flex-wrap items-center gap-3">
      {children}
      <CaseDescription name={name} description={description} />
      {trailingAction}
    </div>
  </div>
}
