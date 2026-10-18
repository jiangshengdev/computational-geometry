import { Button } from '@heroui/react/button'
import { Card } from '@heroui/react/card'
import type { MessageDescriptor } from '@lingui/core'
import { useLingui as useMessages } from '@lingui/react'
import { useLingui } from '@lingui/react/macro'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { AppLink } from '../app/AppLink'
import { PageHeading } from '../app/PageHeading'

type CatalogCase = {
  id: string
  name: MessageDescriptor
  description: MessageDescriptor
}

type CaseCatalogProps<T extends CatalogCase> = {
  label: string
  title: string
  subtitle: string
  basePath: string
  cases: readonly T[]
  renderPreview: (preset: T) => ReactNode
  idPrefix?: string
}

export function CaseCatalog<T extends CatalogCase>({ label, title, subtitle, basePath, cases, renderPreview, idPrefix = 'case' }: CaseCatalogProps<T>) {
  const { t } = useLingui()
  const { _: translate } = useMessages()
  const navigate = useNavigate()
  return <section aria-label={label}>
    <PageHeading title={title} subtitle={subtitle} />
    <div className="case-list grid gap-4">{cases.map(preset => <article key={preset.id} aria-labelledby={`${idPrefix}-${preset.id}`}>
      <Card className="case-card h-full items-stretch">
        <AppLink className="case-thumbnail-link" to={`${basePath}/cases/${preset.id}`} aria-label={t`View ${translate(preset.name)} details`}>{renderPreview(preset)}</AppLink>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Card.Header className="gap-1"><Card.Title id={`${idPrefix}-${preset.id}`} render={props => <h2 {...props} />}>{translate(preset.name)}</Card.Title><Card.Description>{translate(preset.description)}</Card.Description></Card.Header>
          <Card.Footer className="mt-auto justify-end"><Button variant="secondary" onPress={() => navigate(`${basePath}/cases/${preset.id}`)}>{t`View details`}</Button></Card.Footer>
        </div>
      </Card>
    </article>)}</div>
  </section>
}
