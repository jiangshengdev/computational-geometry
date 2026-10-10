import { point, type Preset, type Segment } from './geometry'

type Vertex = readonly [number, number]
interface Triangle { wide: boolean; a: Vertex; b: Vertex; c: Vertex }

const phi = (1 + Math.sqrt(5)) / 2
const denominator = 1_000_000

function divide(from: Vertex, to: Vertex): Vertex {
  return [from[0] + (to[0] - from[0]) / phi, from[1] + (to[1] - from[1]) / phi]
}

function subdivide({ wide, a, b, c }: Triangle): Triangle[] {
  // Robinson triangles: a is the 36° (thin) or 108° (wide) apex.
  // Orientation matters: these ordered rules carry the matching information.
  if (!wide) {
    const p = divide(a, b)
    return [{ wide: false, a: c, b: p, c: b }, { wide: true, a: p, b: c, c: a }]
  }
  const q = divide(b, a)
  const r = divide(b, c)
  return [
    { wide: true, a: r, b: c, c: a },
    { wide: true, a: q, b: r, c: b },
    { wide: false, a: r, b: q, c: a },
  ]
}

const vertexKey = ([x, y]: Vertex) => `${x},${y}`
const edgeKey = (a: Vertex, b: Vertex) => [vertexKey(a), vertexKey(b)].sort().join('|')
const snap = ([x, y]: Vertex): Vertex => [Math.round(x * denominator), Math.round(y * denominator)]
const rotatedDenominator = 5 * denominator
const rationalCoordinate = (value: number) => value % rotatedDenominator === 0
  ? String(value / rotatedDenominator) : `${value}/${rotatedDenominator}`
// An exact rational rotation of the snapped patch preserves every seam and
// length. This fixed viewing angle has no vertical edges, so the exact sweep
// can use zero shear without constructing a huge denominator-product shear.
const inputPoint = ([x, y]: Vertex) => point(rationalCoordinate(3 * x - 4 * y), rationalCoordinate(4 * x + 3 * y))

function penroseEdges(): Segment[] {
  // A legal P3 sun seed: ten thin Robinson triangles, alternating chirality.
  // Two deflations give 20 thin and 30 wide triangles. Pairing their bases
  // leaves 10 thin + 10 thick complete rhombs and ten boundary half-rhombs.
  const ring: Vertex[] = Array.from({ length: 10 }, (_, index) => {
    const angle = (2 * index - 1) * Math.PI / 10
    return [10 * Math.cos(angle), 10 * Math.sin(angle)]
  })
  let triangles: Triangle[] = ring.map((vertex, index) => {
    const next = ring[(index + 1) % ring.length]
    return { wide: false, a: [0, 0], b: index % 2 === 0 ? next : vertex, c: index % 2 === 0 ? vertex : next }
  })
  for (let generation = 0; generation < 2; generation++) triangles = triangles.flatMap(subdivide)

  // Approximate only the final vertices, on one common rational grid. Using
  // these same vertices for both incident tiles preserves their shared seam.
  const bases = new Map<string, Triangle[]>()
  for (const triangle of triangles) {
    const snapped = { wide: triangle.wide, a: snap(triangle.a), b: snap(triangle.b), c: snap(triangle.c) }
    const key = `${snapped.wide}:${edgeKey(snapped.b, snapped.c)}`
    const adjacent = bases.get(key) ?? []
    adjacent.push(snapped)
    bases.set(key, adjacent)
  }
  const edges = new Map<string, Segment>()
  for (const adjacent of bases.values()) {
    // Trim unmatched boundary triangles; suppress paired bases (diagonals).
    if (adjacent.length !== 2) continue
    for (const { a, b, c } of adjacent) {
      for (const end of [b, c]) edges.set(edgeKey(a, end), { start: inputPoint(a), end: inputPoint(end) })
    }
  }
  return [...edges.values()]
}

export const penrosePreset: Preset = {
  id: 'penrose',
  name: '彭罗斯拼贴',
  description: '彭罗斯 P3 太阳种子经两次 Robinson 三角形黄金分割细分，配成 20 块完整菱形的有限片段。理想无理坐标先统一近似到百万分之一，再精确旋转至固定视角；共享边只输入一次。',
  segments: penroseEdges(),
  learning: {
    goal: '辨认非周期铺砌规则产生的五重局部秩序，观察宽、细菱形接缝处的端点归组；有限片段本身不能证明无限铺砌的非周期性。',
    verification: '细分使用 φ = (1 + √5)/2，将同类 Robinson 三角形沿底边配对并去掉内部对角线，舍去边界未配对半片，得到 10 块细菱形、10 块宽菱形。50 条唯一边连接 31 个顶点：5 点度数为 2、20 点为 3、6 点为 5，所以有 5 × 1 + 20 × 3 + 6 × 10 = 125 个端点配对、31 处交点；原点连接 5 条边，恰有 10 对。接缝无内部交叉或重叠。近似后的共享顶点统一按 (x, y) → ((3x − 4y)/5, (4x + 3y)/5) 精确旋转，保持长度、夹角与接缝。服务精确计算提交的有理坐标，不把近似菱形当作精确无理几何。',
  },
}
