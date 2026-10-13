import { point, type Preset, type Segment } from '../geometry/geometry'

function fullerene(): Segment[] {
  // Icosahedron: cyclic permutations of (0, ±1, ±φ), with φ ≈ 1618/1000.
  // Connectivity is fixed before projection, independent of coordinate rounding.
  const vertices: number[][] = []
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      vertices.push([0, a * 1000, b * 1618], [a * 1000, b * 1618, 0], [b * 1618, 0, a * 1000])
    }
  }
  const neighbors = [
    [1, 2, 5, 6, 7], [0, 2, 3, 7, 8], [0, 1, 4, 6, 8],
    [1, 7, 8, 9, 11], [2, 6, 8, 9, 10], [0, 6, 7, 10, 11],
    [0, 2, 4, 5, 10], [0, 1, 3, 5, 11], [1, 2, 3, 4, 9],
    [3, 4, 8, 10, 11], [4, 5, 6, 9, 11], [3, 5, 7, 9, 10],
  ]
  // Truncation at one third creates one atom per directed icosahedral edge.
  // Coordinates retain the common factor of three until projection.
  const atoms = vertices.map((vertex, from) => new Map(neighbors[from].map(to => {
    const [x, y, z] = vertex.map((value, axis) => 2 * value + vertices[to][axis])
    // Exact rational camera rotation (rows are mutually orthogonal unit vectors):
    // (3/5, 0, 4/5), (-4/13, 12/13, 3/13), (-48/65, -5/13, 36/65).
    // Perspective distance 20000 in the retained coordinate scale, then /100.
    const denominator = 1_300_000 + 48 * x + 25 * y - 36 * z
    return [to, point(`${2600 * (3 * x + 4 * z)}/${denominator}`, `${200 * (-20 * x + 60 * y + 15 * z)}/${denominator}`)]
  })))
  const segments: Segment[] = []
  for (const [from, adjacent] of neighbors.entries()) {
    for (const to of adjacent) {
      // The middle third of each original edge separates two hexagonal faces.
      if (from < to) segments.push({ start: atoms[from].get(to)!, end: atoms[to].get(from)! })
      // Each original triangular face supplies one side of this vertex's pentagon.
      for (const next of adjacent) {
        if (to < next && neighbors[to].includes(next)) {
          segments.push({ start: atoms[from].get(to)!, end: atoms[from].get(next)! })
        }
      }
    }
  }
  return segments
}

export const fullerenePreset: Preset = {
  id: 'fullerene',
  name: '富勒烯 C₆₀',
  description: '完整截角二十面体球笼的透视投影，保留全部 60 个原子与 90 条连接。黄金比例以 1618/1000 近似；图中内部穿越不代表化学键连接。',
  segments: fullerene(),
  learning: {
    goal: '区分三条化学键相接的原子端点与前后层投影形成的内部交叉，观察球笼不同位置的事件。',
    verification: '二十面体的 30 条边各产生两个截角顶点，共 60 个原子；12 个原顶点变成五边形、20 个三角面变成六边形。每个原子连接三个邻居，所以共有 60 × 3 / 2 = 90 条边、60 × 3 = 180 个端点配对，另有投影穿越配对。前后层全部保留；黄金比例的有理近似仅影响几何形状，实际提交的有理坐标及其交点仍被精确计算。',
  },
}
