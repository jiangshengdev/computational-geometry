import { useLingui } from '@lingui/react/macro'
import { buttonVariants } from '@heroui/react/button'
import { Chip } from '@heroui/react/chip'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AppLink } from '../app/AppLink'
import { usePageShortcut } from '../app/usePageShortcut'

export function StartLearningLink({ to }: { to: string }) {
  const { t } = useLingui()
  const navigate = useNavigate()
  usePageShortcut(event => {
    if (event.key !== 'ArrowRight') return
    event.preventDefault()
    if (!event.repeat) navigate(to)
  })
  return <AppLink className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-2' })}
    to={to} aria-keyshortcuts="ArrowRight">
    {t`Start step-by-step learning`}
    <Chip color="accent" variant="soft" size="sm" className="bg-white/20 text-white" aria-hidden="true"><ArrowRight size={14} /></Chip>
  </AppLink>
}
