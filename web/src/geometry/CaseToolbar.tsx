import { buttonVariants } from '@heroui/react/button'
import { useLingui } from '@lingui/react/macro'
import { AppLink } from '../app/AppLink'
import { CaseDescription } from './CaseDescription'

export function CaseToolbar({ name, description, backTo }: { name: string, description: string, backTo: string }) {
  const { t } = useLingui()
  return <div className="case-toolbar">
    <AppLink className={buttonVariants({ variant: 'tertiary', size: 'sm' })} to={backTo}>{t`Back to cases`}</AppLink>
    <h1 className="text-xl font-semibold">{name}</h1>
    <div className="case-actions flex items-center gap-3">
      <CaseDescription name={name} description={description} />
    </div>
  </div>
}
