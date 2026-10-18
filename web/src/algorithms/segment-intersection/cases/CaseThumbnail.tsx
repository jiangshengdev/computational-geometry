import { samePoint } from '../../../geometry/geometry'
import { type Segment } from '../geometry'
import { projectPoints } from '../../../geometry/projection'
import { useLingui } from '@lingui/react/macro'

export function CaseThumbnail({ name, segments }: { name: string; segments: Segment[] }) {
  const { t } = useLingui()
  const projection = projectPoints(segments.flatMap(s => [s.start, s.end]), 160, 120, 16)
  return <svg className="case-thumbnail" viewBox="0 0 160 120" role="img" aria-label={t`${name}: input segment preview`}>
    {segments.length === 0
      ? <text x="80" y="60" textAnchor="middle" dominantBaseline="middle">{t`No input segments`}</text>
      : projection && segments.map((s, index) => <g key={index} className="input">
        {samePoint(s.start, s.end)
          ? <path d={`M${projection.px(s.start)},${projection.py(s.start) - 4} l4,4 l-4,4 l-4,-4 Z`} />
          : <line x1={projection.px(s.start)} y1={projection.py(s.start)} x2={projection.px(s.end)} y2={projection.py(s.end)} />}
      </g>)}
  </svg>
}
