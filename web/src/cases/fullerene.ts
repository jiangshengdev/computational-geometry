import { point, type Segment } from '../geometry/geometry'
import { type Preset } from './preset'

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
  name: /*i18n*/ { id: "Fullerene C₆₀", message: "Fullerene C₆₀" },
  description: /*i18n*/ { id: "A perspective projection of the complete truncated-icosahedral cage retains all 60 atoms and 90 connections. The golden ratio is approximated by 1618/1000; interior crossings in the image are not chemical bond connections.", message: "A perspective projection of the complete truncated-icosahedral cage retains all 60 atoms and 90 connections. The golden ratio is approximated by 1618/1000; interior crossings in the image are not chemical bond connections." },
  segments: fullerene(),
  learning: {
    goal: /*i18n*/ { id: "Distinguish atomic endpoints where three chemical bonds meet from interior crossings caused by projecting front and back layers; observe events at different positions on the cage.", message: "Distinguish atomic endpoints where three chemical bonds meet from interior crossings caused by projecting front and back layers; observe events at different positions on the cage." },
    verification: /*i18n*/ { id: "Each of the 30 icosahedron edges yields two truncation vertices, giving 60 atoms; the 12 original vertices become pentagons and the 20 triangular faces become hexagons. Each atom connects to three neighbors, giving 60 × 3 / 2 = 90 edges and 60 × 3 = 180 endpoint pairs, plus projected crossing pairs. Both front and back layers are retained; the rational approximation of the golden ratio affects only the shape, while the submitted rational coordinates and their intersections are still computed exactly.", message: "Each of the 30 icosahedron edges yields two truncation vertices, giving 60 atoms; the 12 original vertices become pentagons and the 20 triangular faces become hexagons. Each atom connects to three neighbors, giving 60 × 3 / 2 = 90 edges and 60 × 3 = 180 endpoint pairs, plus projected crossing pairs. Both front and back layers are retained; the rational approximation of the golden ratio affects only the shape, while the submitted rational coordinates and their intersections are still computed exactly." },
  },
}
