import { useLingui } from '@lingui/react/macro'
import { AppLink } from './AppLink'
import { DocumentationLink } from './DocumentationLink'
import { LanguageSelect } from './LanguageProvider'

export function AppNavigation() {
  const { t } = useLingui()
  return <header className="app-header">
    <nav className="app-navigation" aria-label={t`Computational Geometry`}>
      <AppLink className="text-lg font-semibold text-foreground" to="/">{t`Computational Geometry`}</AppLink>
      <div className="flex items-center gap-5"><DocumentationLink /><LanguageSelect /></div>
    </nav>
  </header>
}
