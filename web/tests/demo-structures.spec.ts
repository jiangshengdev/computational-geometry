import { expect, test, type Page } from '@playwright/test'
import { approximate, point, samePoint, type Point, type Segment } from '../src/geometry'
import { selectPreset } from './cases'
import { captureIntersections } from './trace-navigation'

// Inspect the submitted wire data, not generator-owned vertices or assertions.
async function submittedGraph(page: Page, id: string) {
  await page.goto('/')
  const capture = await captureIntersections(page)
  const pending = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST')
  await selectPreset(page, id)
  const response = await pending
  expect(response.status()).toBe(200)
  const input = response.request().postDataJSON() as { segments: Segment[]; trace: boolean }
  const { segments } = input
  const { intersections } = await capture.result
  const vertices: Point[] = []
  const index = (p: Point) => {
    const found = vertices.findIndex(vertex => samePoint(vertex, p))
    if (found >= 0) return found
    vertices.push(p)
    return vertices.length - 1
  }
  const edges = segments.map(segment => [index(segment.start), index(segment.end)] as const)
  expect(edges.every(([a, b]) => a !== b)).toBe(true)
  expect(new Set(edges.map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join(','))).size).toBe(edges.length)
  const adjacent = vertices.map(() => [] as number[])
  for (const [a, b] of edges) {
    adjacent[a].push(b)
    adjacent[b].push(a)
  }
  const reached = new Set<number>()
  const pendingVertices = [0]
  while (pendingVertices.length) {
    const vertex = pendingVertices.pop()!
    if (reached.has(vertex)) continue
    reached.add(vertex)
    pendingVertices.push(...adjacent[vertex])
  }
  expect(reached.size).toBe(vertices.length)
  expect(intersections.every(result => result.geometry.type === 'point')).toBe(true)
  // The submitted topology independently requires every pair of bonds at an
  // atom/tile vertex to meet there, including tube atoms behind the silhouette.
  for (let vertex = 0; vertex < vertices.length; vertex++) {
    const incident = edges.flatMap((edge, index) => edge.includes(vertex) ? [index] : [])
    for (let a = 0; a < incident.length; a++) for (let b = a + 1; b < incident.length; b++) {
      const matches = intersections.filter(result => result.segments[0] === incident[a] && result.segments[1] === incident[b])
      expect(matches, `vertex ${vertex}: S${incident[a]} × S${incident[b]}`).toHaveLength(1)
      const geometry = matches[0].geometry
      expect(geometry.type).toBe('point')
      if (geometry.type === 'point') expect(samePoint(geometry.point, vertices[vertex])).toBe(true)
    }
  }
  return { vertices, edges, adjacent, intersections }
}

type Graph = Awaited<ReturnType<typeof submittedGraph>>

function degreeCounts(graph: Graph) {
  const counts: Record<number, number> = {}
  for (const neighbors of graph.adjacent) counts[neighbors.length] = (counts[neighbors.length] ?? 0) + 1
  return counts
}

// Enumerate simple cycles once: the least vertex starts, and one orientation wins.
function cycles(graph: Graph, maximum: number) {
  const found: number[][] = []
  for (let start = 0; start < graph.vertices.length; start++) {
    const walk = (path: number[]) => {
      for (const next of graph.adjacent[path.at(-1)!]) {
        if (next === start && path.length >= 3 && path[1] < path.at(-1)!) found.push(path)
        else if (path.length < maximum && next > start && !path.includes(next)) walk([...path, next])
      }
    }
    walk([start])
  }
  return found
}

function expectPointPair(graph: Graph, pair: [number, number], x: string, y: string) {
  const actual = graph.intersections.find(result => result.segments[0] === pair[0] && result.segments[1] === pair[1])
  expect(actual?.geometry.type).toBe('point')
  if (actual?.geometry.type === 'point') expect(samePoint(actual.geometry.point, point(x, y))).toBe(true)
}

function expectOnlyVertexContacts(graph: Graph) {
  // Every reported pair must share its original atom/tile vertex; proper
  // crossings and overlaps would invalidate this planar embedded structure.
  for (const result of graph.intersections) {
    const [a, b] = result.segments.map(index => graph.edges[index])
    const common = a.find(vertex => b.includes(vertex))
    expect(common).toBeDefined()
    if (common !== undefined && result.geometry.type === 'point') {
      expect(samePoint(result.geometry.point, graph.vertices[common])).toBe(true)
    }
  }
  expect(graph.intersections).toHaveLength(graph.adjacent.reduce((sum, neighbors) => sum + neighbors.length * (neighbors.length - 1) / 2, 0))
}

// Rotation-system face traversal is independent of the mesh construction.
function planarFaces(graph: Graph) {
  const xy = graph.vertices.map(p => [approximate(p.x), approximate(p.y)])
  const ordered = graph.adjacent.map((neighbors, a) => [...neighbors].sort((b, c) =>
    Math.atan2(xy[b][1] - xy[a][1], xy[b][0] - xy[a][0]) - Math.atan2(xy[c][1] - xy[a][1], xy[c][0] - xy[a][0])))
  const visited = new Set<string>()
  const faces: { vertices: number[]; area: number }[] = []
  for (const [a, b] of graph.edges.flatMap(([a, b]) => [[a, b], [b, a]])) {
    if (visited.has(`${a},${b}`)) continue
    const face: number[] = []
    let from = a, to = b
    do {
      expect(visited.has(`${from},${to}`)).toBe(false)
      visited.add(`${from},${to}`)
      face.push(from)
      const neighbors = ordered[to]
      const next = neighbors[(neighbors.indexOf(from) + neighbors.length - 1) % neighbors.length]
      from = to
      to = next
    } while (from !== a || to !== b)
    const area = face.reduce((sum, vertex, i) => {
      const next = face[(i + 1) % face.length]
      return sum + xy[vertex][0] * xy[next][1] - xy[next][0] * xy[vertex][1]
    }, 0) / 2
    faces.push({ vertices: face, area })
  }
  expect(visited.size).toBe(2 * graph.edges.length)
  expect(graph.vertices.length - graph.edges.length + faces.length).toBe(2)
  expect(faces.filter(face => face.area < 0)).toHaveLength(1)
  return { xy, inner: faces.filter(face => face.area > 0), outer: faces.find(face => face.area < 0)! }
}

test('富勒烯真实输入是三配位 C60，具有十二五环和二十六环', async ({ page }) => {
  const graph = await submittedGraph(page, 'fullerene')
  expect(graph.vertices).toHaveLength(60)
  expect(graph.edges).toHaveLength(90)
  expect(degreeCounts(graph)).toEqual({ 3: 60 })
  const rings = cycles(graph, 6)
  expect(rings.filter(ring => ring.length < 5)).toHaveLength(0)
  expect(rings.filter(ring => ring.length === 5)).toHaveLength(12)
  expect(rings.filter(ring => ring.length === 6)).toHaveLength(20)
  // Euler's 60 - 90 + 32 = 2; every bond belongs to two cage faces.
  for (const [a, b] of graph.edges) {
    expect(rings.filter(ring => ring.some((vertex, i) => vertex === a && ring[(i + 1) % ring.length] === b || vertex === b && ring[(i + 1) % ring.length] === a))).toHaveLength(2)
  }
  expectPointPair(graph, [0, 1], '-20727200/639023', '-24562000/639023')
  expectPointPair(graph, [2, 10], '-454781790139300/15675989673937', '-614898394752000/15675989673937')
})

test('石墨烯真实输入包含七个无交叉蜂窝面及三配位内点', async ({ page }) => {
  const graph = await submittedGraph(page, 'graphene')
  expect(graph.vertices).toHaveLength(24)
  expect(graph.edges).toHaveLength(30)
  expect(degreeCounts(graph)).toEqual({ 2: 12, 3: 12 })
  expect(cycles(graph, 6).map(ring => ring.length)).toEqual(Array(7).fill(6))
  expectOnlyVertexContacts(graph)
  const faces = planarFaces(graph)
  expect(faces.inner).toHaveLength(7)
  expect(faces.inner.every(face => face.vertices.length === 6)).toBe(true)
  expect(faces.outer.vertices).toHaveLength(18)
  const at = graph.vertices.findIndex(vertex => samePoint(vertex, point('-1', '0')))
  expect(at).toBeGreaterThanOrEqual(0)
  expect(graph.adjacent[at]).toHaveLength(3)
})

test('金刚石真实输入的四个内部原子各有四面体近邻', async ({ page }) => {
  const graph = await submittedGraph(page, 'diamond-lattice')
  expect(graph.vertices).toHaveLength(14)
  expect(graph.edges).toHaveLength(16)
  expect(degreeCounts(graph)).toEqual({ 1: 4, 2: 6, 4: 4 })
  // Independently invert the documented (x+3z/10,y+7z/10) projection
  // on the conventional-cell integer lattice [0,4]^3.
  const lattice = graph.vertices.map(vertex => {
    const candidates: number[][] = []
    for (let x = 0; x <= 4; x++) for (let y = 0; y <= 4; y++) for (let z = 0; z <= 4; z++) {
      if (samePoint(vertex, point(`${10 * x + 3 * z}/10`, `${10 * y + 7 * z}/10`))) candidates.push([x, y, z])
    }
    expect(candidates).toHaveLength(1)
    return candidates[0]
  })
  for (let center = 0; center < graph.vertices.length; center++) {
    if (graph.adjacent[center].length !== 4) continue
    const directions = graph.adjacent[center].map(neighbor => lattice[neighbor].map((value, axis) => value - lattice[center][axis]))
    for (let a = 0; a < 4; a++) {
      expect(directions[a].reduce((sum, value) => sum + value * value, 0)).toBe(3)
      for (let b = a + 1; b < 4; b++) expect(directions[a].reduce((sum, value, axis) => sum + value * directions[b][axis], 0)).toBe(-1)
    }
  }
  expectPointPair(graph, [0, 1], '13/10', '17/10')
  expectPointPair(graph, [6, 13], '281/100', '489/100')
})

test('碳纳米管真实输入保持三配位管壁与两端开口', async ({ page }) => {
  const graph = await submittedGraph(page, 'carbon-nanotube')
  expect(graph.vertices).toHaveLength(48)
  expect(graph.edges).toHaveLength(60)
  expect(degreeCounts(graph)).toEqual({ 1: 12, 3: 36 })
  const rings = cycles(graph, 6)
  expect(rings.every(ring => ring.length === 6)).toBe(true)
  expect(rings).toHaveLength(12)
  // Each adjacent pair of axial rows has a closed 12-bond zigzag around
  // the circumference. In particular S23/S41/S59 close the wrap seam.
  for (const offset of [0, 18, 36]) {
    const ringEdges = [7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23].map(index => graph.edges[index + offset])
    const ringVertices = new Set(ringEdges.flat())
    expect(ringVertices.size).toBe(12)
    for (const vertex of ringVertices) expect(ringEdges.filter(edge => edge.includes(vertex))).toHaveLength(2)
    const reached = new Set<number>([ringEdges[0][0]])
    for (let i = 0; i < ringEdges.length; i++) {
      for (const [a, b] of ringEdges) if (reached.has(a) || reached.has(b)) {
        reached.add(a)
        reached.add(b)
      }
    }
    expect(reached.size).toBe(12)
  }
  // The twelve terminal atoms have no cap bonds; their neighbors remain
  // three-coordinated, rather than a row of dangling seam atoms.
  for (const neighbors of graph.adjacent) if (neighbors.length === 1) expect(graph.adjacent[neighbors[0]]).toHaveLength(3)
  expectPointPair(graph, [1, 19], '1640458343/2867030000', '-4910230279/11468120000')
})

test('彭罗斯真实输入拼成完整薄厚菱形，接缝去重且无洞无交叉', async ({ page }) => {
  const graph = await submittedGraph(page, 'penrose')
  expect(graph.vertices).toHaveLength(31)
  expect(graph.edges).toHaveLength(50)
  expect(degreeCounts(graph)).toEqual({ 2: 5, 3: 20, 5: 6 })
  expectOnlyVertexContacts(graph)
  const { xy, inner, outer } = planarFaces(graph)
  expect(inner).toHaveLength(20)
  expect(outer.vertices).toHaveLength(20)
  const acuteAngles: number[] = []
  const lengths: number[] = []
  for (const face of inner) {
    expect(face.vertices).toHaveLength(4)
    const angles = face.vertices.map((vertex, i) => {
      const previous = xy[face.vertices[(i + 3) % 4]], next = xy[face.vertices[(i + 1) % 4]], current = xy[vertex]
      const a = previous.map((value, axis) => value - current[axis]), b = next.map((value, axis) => value - current[axis])
      lengths.push(Math.hypot(...b))
      return Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI
    })
    const acute = Math.min(...angles)
    expect(Math.min(Math.abs(acute - 36), Math.abs(acute - 72))).toBeLessThan(0.0001)
    expect(angles.reduce((sum, angle) => sum + angle, 0)).toBeCloseTo(360, 6)
    acuteAngles.push(Math.round(acute))
  }
  expect(acuteAngles.filter(angle => angle === 36)).toHaveLength(10)
  expect(acuteAngles.filter(angle => angle === 72)).toHaveLength(10)
  // All tiles have the same edge length; rational rounding is explicitly
  // tolerated only here in the shape check, never in endpoint identity.
  expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(0.000003)
  expectPointPair(graph, [4, 5], '0', '0')
})
