import { Card } from '@heroui/react/card'
import { useLingui } from '@lingui/react/macro'
import { DocumentTitle } from '../../app/DocumentTitle'

export function ConvexHullPage() {
  const { t } = useLingui()
  return <section className="flex flex-col gap-4">
    <DocumentTitle title={`${t`Convex hull`} · ${t`Computational Geometry`}`} />
    <h1 className="text-2xl font-semibold">{t`Convex hull`}</h1>
    <Card><Card.Content>{t`Not implemented yet`}</Card.Content></Card>
  </section>
}
