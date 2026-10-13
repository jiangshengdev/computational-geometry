import { segment, type Segment } from '../geometry/geometry'
import { type Preset } from './preset'

function bridgeTruss(): Segment[] {
  const beams: Segment[] = []
  for (let x = 0; x < 16; x += 4) {
    beams.push(
      segment(`${x}`, '0', `${x + 4}`, '0'),
      segment(`${x}`, '4', `${x + 4}`, '4'),
      segment(`${x}`, '0', `${x + 4}`, '4'),
      segment(`${x}`, '4', `${x + 4}`, '0'),
    )
  }
  for (let x = 0; x <= 16; x += 4) {
    beams.push(segment(`${x}`, '0', `${x}`, '4'))
  }
  return beams
}

function meanderWindow(): Segment[] {
  const bars: Segment[] = [
    segment('-2', '-2', '34', '-2'),
    segment('34', '-2', '34', '10'),
    segment('34', '10', '-2', '10'),
    segment('-2', '10', '-2', '-2'),
    segment('-2', '0', '34', '0'),
  ]
  for (const offset of [0, 12, 24]) {
    const corners = [[0, 0], [0, 8], [8, 8], [8, 2], [2, 2], [2, 6], [6, 6], [6, 4], [4, 4]] as const
    for (let i = 1; i < corners.length; i++) {
      const [x1, y1] = corners[i - 1]
      const [x2, y2] = corners[i]
      bars.push(segment(`${x1 + offset}`, `${y1}`, `${x2 + offset}`, `${y2}`))
    }
  }
  return bars
}

function diagonalWeave(): Segment[] {
  const strands: Segment[] = []
  for (const offset of [-8, -4, 0, 4, 8]) {
    strands.push(segment(`${Math.max(0, -offset)}`, `${Math.max(0, offset)}`, `${Math.min(12, 12 - offset)}`, `${Math.min(12, 12 + offset)}`))
  }
  for (const sum of [4, 8, 12, 16, 20]) {
    strands.push(segment(`${Math.max(0, sum - 12)}`, `${Math.min(12, sum)}`, `${Math.min(12, sum)}`, `${Math.max(0, sum - 12)}`))
  }
  return strands
}

function parabolicStrings(): Segment[] {
  return Array.from({ length: 13 }, (_, index) => {
    const t = index - 6
    return segment(`${3 * (t - 6)}`, `${-6 * t}`, `${3 * (t + 6)}`, `${6 * t}`)
  })
}

function starPolygon(): Segment[] {
  const vertices = [[0, 10], [7, 7], [10, 0], [7, -7], [0, -10], [-7, -7], [-10, 0], [-7, 7]] as const
  return vertices.map(([x, y], index) => {
    const [endX, endY] = vertices[(index + 3) % vertices.length]
    return segment(`${x}`, `${y}`, `${endX}`, `${endY}`)
  })
}

export const artPresets: Preset[] = [
  {
    id: 'bridge-truss', name: '桥梁桁架',
    description: '四跨桥梁以连续三角支撑连接上下弦杆，竖杆与斜撑的连接清晰可辨。',
    segments: bridgeTruss(),
    learning: {
      goal: '比较桥梁节点的端点连接与每跨斜撑的内部交叉，观察不同位置的事件归组。',
      verification: '首跨 S2 满足 y = x，S3 满足 y = 4 − x，内部交于 (2, 2)；其余三跨交叉位于 (6, 2)、(10, 2)、(14, 2)。S0、S4 在共同端点 (4, 0) 连接。共 10 个结构节点和 4 个跨内交点；每根共享杆仅生成一次。',
    },
  },
  {
    id: 'meander-window', name: '回纹窗棂',
    description: '窗框内三组方折回纹连接下方横梁，回转之间保留宽阔留白。',
    segments: meanderWindow(),
    learning: {
      goal: '沿方折回纹追踪端点连接，并区分回纹起点落在横梁内部的接触。',
      verification: 'S5 从 (0, 0) 到 (0, 8)，S6 从 (0, 8) 到 (8, 8)，公共端点为 (0, 8)。S4 的 y = 0、x ∈ [−2, 34]，与 S5 在 (0, 0) 接触。三组回纹各有 7 处转角和 1 处横梁接触，另有窗框 4 角及横梁与窗框的 2 处接触，共 30 个不同位置；没有内部穿越或重叠。',
    },
  },
  {
    id: 'diagonal-weave', name: '斜向编织',
    description: '两组方向相反的连续斜线交织成菱形纹理，所有交叉均保留真实线段。',
    segments: diagonalWeave(),
    learning: {
      goal: '从平行线族中辨认相交配对，观察菱形纹理中分布在不同高度的内部交叉。',
      verification: '上升线满足 y = x + c，下降线满足 y = d − x，因此交点为 ((d − c)/2, (d + c)/2)，还须检查坐标是否在 [0, 12] 内。例如 S2 × S7 为 (6, 6)，S1 × S7 为 (8, 4)；S0 × S6 在端点 (8, 0) 接触。同方向线互相平行，没有重叠。',
    },
  },
  {
    id: 'parabolic-strings', name: '抛物线弦画',
    description: '取整数 t ∈ [−6, 6]，排列直线 y = (t/3)x − t² 的有限线段，形成抛物线包络。',
    segments: parabolicStrings(),
    learning: {
      goal: '观察真实直线段如何共同勾勒曲线，追踪相邻弦与远隔弦的精确交点。',
      verification: '参数 t 的线段端点为 (3(t − 6), −6t) 与 (3(t + 6), 6t)。参数 t、u 的两弦交于 (3(t + u), tu)，在线段范围内；例如 S5 × S7 为 (0, −1)，S6 × S7 为 (3, 0)。连续直线族与 y = x²/36 在 (6t, t²) 相切，因此有限弦排列勾勒其包络；13 条弦产生 78 个不同交点位置。',
    },
  },
  {
    id: 'star-polygon', name: '星形多边形',
    description: '八个环形顶点每次前进 3 个位置连线，形成闭合八角星；顶点使用固定整数坐标。',
    segments: starPolygon(),
    learning: {
      goal: '区分星尖端点连接与星形内部穿越，理解跳点规则如何生成有规律的交点。',
      verification: '按顺时针编号 0 至 7，连接 i 与 (i + 3) mod 8；从 0 出发依次经过 3、6、1、4、7、2、5 后闭合。S0 满足 y = 10 − 17x/7，S1 满足 y = 17x/7 − 10，内部交点为 (70/17, 0)。S0 与 S3 在 (7, −7) 端点连接。八个顶点为整数八边形，不宣称是精确正八边形。',
    },
  },
]
