import { Card } from '@heroui/react/card'
import { useLingui } from '@lingui/react/macro'
import { AppLink } from './AppLink'
import { DocumentTitle } from './DocumentTitle'
import { Button } from '@heroui/react/button'
import { useNavigate } from 'react-router'
import { PageHeading } from './PageHeading'

function AlgorithmEntry({ kind, title, description, to }: {
  kind: 'bo' | 'convex-hull'
  title: string
  description: string
  to: string
}) {
  const { t } = useLingui()
  const navigate = useNavigate()
  return <article aria-labelledby={`algorithm-${kind}`}>
    <Card className="case-card h-full items-stretch">
      <AppLink className="case-thumbnail-link" to={to} aria-label={title}>
        <svg className="case-thumbnail" viewBox="0 0 160 120" aria-hidden="true">
          {kind === 'bo'
            ? <g className="input"><line x1="48" y1="28" x2="112" y2="92" /><line x1="48" y1="92" x2="112" y2="28" /></g>
            : <g className="input">
              <path d="M32 76 L48 28 L104 24 L132 68 L96 96 Z" fill="none" />
              {[[32, 76], [48, 28], [104, 24], [132, 68], [96, 96], [64, 60], [92, 52], [84, 76]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" />)}
            </g>}
        </svg>
      </AppLink>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Card.Header className="gap-1">
          <Card.Title render={props => <h2 {...props} />} id={`algorithm-${kind}`}>{title}</Card.Title>
          <Card.Description>{description}</Card.Description>
        </Card.Header>
        <Card.Footer className="mt-auto flex flex-wrap justify-end gap-3">
          <Button onPress={() => navigate(to)}>{t`Enter`}</Button>
        </Card.Footer>
      </div>
    </Card>
  </article>
}

export function AlgorithmHome() {
  const { t } = useLingui()
  return <section aria-label={t`Choose an algorithm`}>
    <DocumentTitle title={`${t`Choose an algorithm`} · ${t`Computational Geometry`}`} />
    <PageHeading title={t`Computational Geometry`} description={t`Choose an algorithm`} />
    <div className="algorithm-list grid gap-4">
      <AlgorithmEntry kind="bo" title="Bentley–Ottmann" description={t`Exact segment intersections and step-by-step learning.`} to="/bo" />
      <AlgorithmEntry kind="convex-hull" title={t`Convex hull`} description={t`Fixed point sets and exact convex hull results.`} to="/convex-hull" />
    </div>
  </section>
}
