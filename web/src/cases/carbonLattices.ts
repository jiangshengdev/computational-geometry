import { point, type Point, type Segment } from '../geometry/geometry'
import { type Preset } from './preset'

type Vertex = readonly [number, number, number]
type Bond = readonly [number, number]

function internVertex(vertices: Vertex[], indices: Map<string, number>, vertex: Vertex): number {
  const key = vertex.join(',')
  const existing = indices.get(key)
  if (existing !== undefined) return existing
  const index = vertices.length
  indices.set(key, index)
  vertices.push(vertex)
  return index
}

// Connectivity is determined in the unprojected structure, never from crossings.
function projectBonds(vertices: Vertex[], bonds: Bond[], project: (vertex: Vertex) => Point): Segment[] {
  const projected = vertices.map(project)
  return bonds.map(([a, b]) => ({ start: projected[a], end: projected[b] }))
}

function graphene(): Segment[] {
  const vertices: Vertex[] = []
  const indices = new Map<string, number>()
  const bonds = new Map<string, Bond>()
  const corners = [[2, 0], [1, 1], [-1, 1], [-2, 0], [-1, -1], [1, -1]]
  // Seven hexagons: one central face and its six neighbors. Coordinates use
  // half a bond horizontally and sqrt(3)/2 of a bond vertically.
  for (let q = -1; q <= 1; q++) {
    for (let r = -1; r <= 1; r++) {
      if (Math.abs(q + r) > 1) continue
      const face = corners.map(([du, dv]) => {
        return internVertex(vertices, indices, [3 * q + du, q + 2 * r + dv, 0])
      })
      face.forEach((a, corner) => {
        const b = face[(corner + 1) % face.length]
        bonds.set([Math.min(a, b), Math.max(a, b)].join(','), [a, b])
      })
    }
  }
  return projectBonds(vertices, [...bonds.values()], ([u, v]) => point(`${u}/2`, `${433 * v}/500`))
}

function diamond(): Segment[] {
  // Coordinates in quarters of the cubic lattice constant. These are the four
  // B-sublattice sites of one conventional cell, plus all their A neighbors.
  const centers: Vertex[] = [[1, 1, 1], [1, 3, 3], [3, 1, 3], [3, 3, 1]]
  const directions: Vertex[] = [[-1, -1, -1], [-1, 1, 1], [1, -1, 1], [1, 1, -1]]
  const vertices = [...centers]
  const indices = new Map(vertices.map((vertex, index) => [vertex.join(','), index]))
  const bonds: Bond[] = []
  centers.forEach(([x, y, z], center) => {
    directions.forEach(([dx, dy, dz]) => {
      const neighbor = internVertex(vertices, indices, [x + dx, y + dy, z + dz])
      bonds.push([center, neighbor])
    })
  })
  // An exact rational oblique projection separates all atoms and bond lines.
  return projectBonds(vertices, bonds, ([x, y, z]) => point(`${10 * x + 3 * z}/10`, `${10 * y + 7 * z}/10`))
}

function nanotube(): Segment[] {
  const circumference = 6
  const rows = 4
  const vertices: Vertex[] = []
  const bonds: Bond[] = []
  const index = (i: number, j: number, sublattice: number) => (j * circumference + (i + circumference) % circumference) * 2 + sublattice
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < circumference; i++) {
      // Flat honeycomb coordinates: sqrt(3)*(i+j/2), 3*j/2+s.
      // Quotient by (6*sqrt(3), 0) closes a (6,0) zigzag tube.
      vertices.push([i, j, 0], [i, j, 1])
      bonds.push([index(i, j, 0), index(i, j, 1)])
      if (j > 0) {
        bonds.push([index(i, j, 0), index(i, j - 1, 1)])
        bonds.push([index(i, j, 0), index(i + 1, j - 1, 1)])
      }
    }
  }
  const radius = circumference * Math.sqrt(3) / (2 * Math.PI)
  return projectBonds(vertices, bonds, ([i, j, sublattice]) => {
    const angle = 2 * Math.PI * (i + j / 2) / circumference + Math.PI / 17
    const height = 1.5 * j + sublattice
    const x = radius * Math.cos(angle) + 0.23 * height
    const y = height + 0.43 * radius * Math.sin(angle)
    // Rotate the long axis into the landscape viewport, then uniformly scale.
    // The 3/4 scale avoids wasting half the available power-of-two plot scale.
    return point(`${3 * Math.round(y * 10000)}/40000`, `${-3 * Math.round(x * 10000)}/40000`)
  })
}

export const carbonLatticePresets: Preset[] = [
  {
    id: 'graphene', name: '石墨烯',
    description: '七个六边形组成有限蜂窝片层，共享化学键仅保留一次；边缘原子的配位因截断而减少。',
    segments: graphene(),
    learning: {
      goal: '辨认蜂窝网络的三邻接内点，观察真实原子连接处的端点归组。',
      verification: '片层有 24 个原子、30 条键和 7 个六边形面；12 个内侧三邻接点各产生 3 对，12 个二邻接边缘点各产生 1 对，共 48 对、24 处。没有内部穿越或重叠。纵向使用 433/500 近似 √3/2，求交对这些有理输入精确计算。',
    },
  },
  {
    id: 'diamond-lattice', name: '金刚石晶格',
    description: '一个常规晶胞的四个四面体中心及其全部近邻，共 14 个原子、16 条键；外围连接在有限簇边界截断。',
    segments: diamond(),
    learning: {
      goal: '比较四面体中心的四邻接接触与不同深度化学键在二维投影中的穿越。',
      verification: '四个中心各有 4 条等长空间键，其方向两两点积为 −1、长度平方为 3，符合四面体夹角。六个共享近邻度数为 2，四个边界原子度数为 1。投影为 (x + 3z/10, y + 7z/10)；中心 (1,1,1) 投影至 (13/10,17/10)，四条键产生 6 对。S6 与 S13 内部交于 (281/100,489/100)；二维穿越不代表新增化学键，投影使用精确有理数。',
    },
  },
  {
    id: 'carbon-nanotube', name: '碳纳米管',
    description: '蜂窝片层沿周向闭合为 (6,0) 锯齿型管，四排二子格共 48 个原子、60 条键；两端开口，无端帽。',
    segments: nanotube(),
    learning: {
      goal: '观察周向接缝仍然连续的三邻接网络，区分原子共端点与管前后侧的投影穿越。',
      verification: '36 个内部原子各连 3 条键，两个开口的 12 个末端原子各保留 1 条键，度数和为 36×3 + 12 = 120，即 60 条唯一键。周向索引按模 6 连接，不重复接缝；只截断轴向边界。圆筒坐标及固定斜投影四舍五入至 1/10000，再旋转并统一缩放 3/4，按实际有理输入精确求交。例如 S1 与 S19 内部交于 (1640458343/2867030000,-4910230279/11468120000)，投影穿越不是原子连接。',
    },
  },
]
