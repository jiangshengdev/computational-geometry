import { point, uniquePoints, type Point } from './geometry'

interface PatternEdge { start: Point; end: Point }

export function patternPoints(edges: PatternEdge[]): Point[] {
  return uniquePoints(edges.flatMap(edge => [edge.start, edge.end]))
}

export function bridgeTruss(): PatternEdge[] {
  const beams: PatternEdge[] = []
  for (let x = 0; x < 16; x += 4) {
    beams.push(
      { start: point(`${x}`, '0'), end: point(`${x + 4}`, '0') },
      { start: point(`${x}`, '4'), end: point(`${x + 4}`, '4') },
      { start: point(`${x}`, '0'), end: point(`${x + 4}`, '4') },
      { start: point(`${x}`, '4'), end: point(`${x + 4}`, '0') },
    )
  }
  for (let x = 0; x <= 16; x += 4) {
    beams.push({ start: point(`${x}`, '0'), end: point(`${x}`, '4') })
  }
  return beams
}

export function spiderWeb(): PatternEdge[] {
  const directions = [[12, 0], [8, 8], [0, 12], [-8, 8], [-12, 0], [-8, -8], [0, -12], [8, -8]]
  const center = point('0', '0')
  const rings = [1, 2].map(radius => directions.map(([x, y]) => point(String(x * radius), String(y * radius))))
  // Each spoke ends at every ring junction; each shared edge is emitted once.
  return rings.flatMap((ring, layer) => ring.flatMap((vertex, spoke) => [
    { start: layer === 0 ? center : rings[layer - 1][spoke], end: vertex },
    { start: vertex, end: ring[(spoke + 1) % ring.length] },
  ]))
}

export function hexagonalSnowflake(): PatternEdge[] {
  const directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]
  // Triangular lattice: (u + v/2, v*sqrt(3)/2), with sqrt(3)/2 ≈ 433/500.
  // Integer lattice vertices preserve shared endpoints before rational projection.
  const vertex = (u: number, v: number) => point(
    (2 * u + v) % 2 === 0 ? String(u + v / 2) : `${2 * u + v}/2`,
    v === 0 ? '0' : `${433 * v}/500`,
  )
  return directions.flatMap(([u, v], arm) => {
    const trunk = [0, 3, 6, 8].map(distance => vertex(u * distance, v * distance))
    const edges = trunk.slice(1).map((end, index) => ({ start: trunk[index], end }))
    for (const distance of [3, 6]) {
      for (const neighbor of [(arm + 5) % 6, (arm + 1) % 6]) {
        const [du, dv] = directions[neighbor]
        edges.push({ start: vertex(u * distance, v * distance), end: vertex(u * distance + 2 * du, v * distance + 2 * dv) })
      }
    }
    return edges
  })
}
