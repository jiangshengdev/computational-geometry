import { useLingui } from '@lingui/react/macro'
import { AppLink } from './AppLink'

export function DocumentationLink() {
  const { t } = useLingui()
  return <AppLink to="https://cgd.jiangshengdev.com">{t`Documentation`}</AppLink>
}
