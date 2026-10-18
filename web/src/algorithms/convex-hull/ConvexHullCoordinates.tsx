import { Card } from '@heroui/react/card'
import { Chip } from '@heroui/react/chip'
import { ScrollShadow } from '@heroui/react/scroll-shadow'
import { useLingui } from '@lingui/react/macro'
import { formatPoint, type Point } from '../../geometry/geometry'

export function ConvexHullCoordinates({ title, points, prefix }: { title: string; points: Point[]; prefix: 'P' | 'V' }) {
  const { t } = useLingui()
  return <section aria-label={title} className="min-w-0"><Card className="h-full">
    <Card.Header><Card.Title render={props => <h2 {...props} />} className="flex items-center gap-2">{title} <Chip aria-label={t`Point count`}>{points.length}</Chip></Card.Title></Card.Header>
    <Card.Content>{points.length === 0 ? <p>{t`No points`}</p> : <ScrollShadow className="max-h-80 overflow-auto" tabIndex={0} aria-label={title}>
      <ol className="flex flex-col gap-2">{points.map((p, index) => <li key={index} className="coordinates flex gap-3"><strong>{prefix}{index}</strong>{' '}<span>{formatPoint(p)}</span></li>)}</ol>
    </ScrollShadow>}</Card.Content>
  </Card></section>
}
