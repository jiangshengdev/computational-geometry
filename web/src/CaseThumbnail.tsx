import { samePoint, type Segment } from './geometry'
import { projectPoints } from './projection'

export function CaseThumbnail({ name, segments }: { name: string; segments: Segment[] }) {
  const { px, py } = projectPoints(segments.flatMap(s => [s.start, s.end]), 160, 120, 14)
  return <svg className="case-thumbnail" viewBox="0 0 160 120" role="img" aria-label={`${name}：输入线段预览`}>
    {segments.length === 0
      ? <text x="80" y="60" textAnchor="middle" dominantBaseline="middle">无输入线段</text>
      : segments.map((s, index) => <g key={index} className="input">
        {samePoint(s.start, s.end)
          ? <path d={`M${px(s.start)},${py(s.start) - 4} l4,4 l-4,4 l-4,-4 Z`} />
          : <line x1={px(s.start)} y1={py(s.start)} x2={px(s.end)} y2={py(s.end)} />}
      </g>)}
  </svg>
}
