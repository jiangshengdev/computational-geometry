import { Card } from '@heroui/react/card'
import { useLingui } from '@lingui/react/macro'
import { AppLink } from './AppLink'
import { DocumentTitle } from './DocumentTitle'

export function AlgorithmHome() {
  const { t } = useLingui()
  return <section className="flex flex-col gap-4" aria-label={t`Choose an algorithm`}>
    <DocumentTitle title={`${t`Choose an algorithm`} · ${t`Computational Geometry`}`} />
    <h1 className="text-2xl font-semibold">{t`Computational Geometry`}</h1>
    <h2 className="text-lg">{t`Choose an algorithm`}</h2>
    <Card>
      <Card.Header><Card.Title><AppLink to="/bo">Bentley–Ottmann</AppLink></Card.Title></Card.Header>
      <Card.Content>{t`Exact segment intersections and step-by-step learning.`}</Card.Content>
    </Card>
    <Card>
      <Card.Header><Card.Title><AppLink to="/convex-hull">{t`Convex hull`}</AppLink></Card.Title></Card.Header>
      <Card.Content>{t`Not implemented yet`}</Card.Content>
    </Card>
  </section>
}
