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
    id: 'graphene', name: /*i18n*/ { id: "Graphene", message: "Graphene" },
    description: /*i18n*/ { id: "Seven hexagons form a finite honeycomb sheet, with each shared chemical bond retained once; boundary truncation reduces the coordination of edge atoms.", message: "Seven hexagons form a finite honeycomb sheet, with each shared chemical bond retained once; boundary truncation reduces the coordination of edge atoms." },
    segments: graphene(),
    learning: {
      goal: /*i18n*/ { id: "Identify interior sites with three neighbors in the honeycomb network and observe endpoint grouping at actual atomic connections.", message: "Identify interior sites with three neighbors in the honeycomb network and observe endpoint grouping at actual atomic connections." },
      verification: /*i18n*/ { id: "The sheet has 24 atoms, 30 bonds, and 7 hexagonal faces; each of the 12 inner sites with three neighbors produces 3 pairs, and each of the 12 edge sites with two neighbors produces 1 pair, totaling 48 pairs at 24 positions. There are no interior crossings or overlaps. The vertical direction approximates √3/2 by 433/500, and intersections are computed exactly for these rational inputs.", message: "The sheet has 24 atoms, 30 bonds, and 7 hexagonal faces; each of the 12 inner sites with three neighbors produces 3 pairs, and each of the 12 edge sites with two neighbors produces 1 pair, totaling 48 pairs at 24 positions. There are no interior crossings or overlaps. The vertical direction approximates √3/2 by 433/500, and intersections are computed exactly for these rational inputs." },
    },
  },
  {
    id: 'diamond-lattice', name: /*i18n*/ { id: "Diamond lattice", message: "Diamond lattice" },
    description: /*i18n*/ { id: "The four tetrahedral centers of one conventional unit cell and all their nearest neighbors form 14 atoms and 16 bonds; outer connections are truncated at the finite cluster boundary.", message: "The four tetrahedral centers of one conventional unit cell and all their nearest neighbors form 14 atoms and 16 bonds; outer connections are truncated at the finite cluster boundary." },
    segments: diamond(),
    learning: {
      goal: /*i18n*/ { id: "Compare contact among four neighbors at tetrahedral centers with crossings of chemical bonds at different depths in a two-dimensional projection.", message: "Compare contact among four neighbors at tetrahedral centers with crossings of chemical bonds at different depths in a two-dimensional projection." },
      verification: /*i18n*/ { id: "Each of the four centers has 4 spatial bonds of equal length, with pairwise direction dot products of −1 and squared lengths of 3, matching the tetrahedral angle. Six shared nearest neighbors have degree 2, and four boundary atoms have degree 1. The projection is (x + 3z/10, y + 7z/10); center (1,1,1) projects to (13/10,17/10), where four bonds produce 6 pairs. S6 and S13 cross internally at (281/100,489/100); a two-dimensional crossing is not an additional chemical bond, and the projection uses exact rational numbers.", message: "Each of the four centers has 4 spatial bonds of equal length, with pairwise direction dot products of −1 and squared lengths of 3, matching the tetrahedral angle. Six shared nearest neighbors have degree 2, and four boundary atoms have degree 1. The projection is (x + 3z/10, y + 7z/10); center (1,1,1) projects to (13/10,17/10), where four bonds produce 6 pairs. S6 and S13 cross internally at (281/100,489/100); a two-dimensional crossing is not an additional chemical bond, and the projection uses exact rational numbers." },
    },
  },
  {
    id: 'carbon-nanotube', name: /*i18n*/ { id: "Carbon nanotube", message: "Carbon nanotube" },
    description: /*i18n*/ { id: "A honeycomb sheet closes circumferentially into a (6,0) zigzag tube; four rows of two sublattices contain 48 atoms and 60 bonds, with two open ends and no caps.", message: "A honeycomb sheet closes circumferentially into a (6,0) zigzag tube; four rows of two sublattices contain 48 atoms and 60 bonds, with two open ends and no caps." },
    segments: nanotube(),
    learning: {
      goal: /*i18n*/ { id: "Observe the three-neighbor network remaining continuous across the circumferential seam; distinguish shared atomic endpoints from projected crossings between the front and back of the tube.", message: "Observe the three-neighbor network remaining continuous across the circumferential seam; distinguish shared atomic endpoints from projected crossings between the front and back of the tube." },
      verification: /*i18n*/ { id: "The 36 interior atoms each have 3 bonds, while the 12 terminal atoms at the two openings each retain 1 bond; the degree sum is 36×3 + 12 = 120, giving 60 unique bonds. Circumferential indices connect modulo 6 without duplicating the seam; only axial boundaries are truncated. Cylinder coordinates and the fixed oblique projection are rounded to 1/10000, then rotated and uniformly scaled by 3/4; intersections are computed exactly for the actual rational inputs. For example, S1 and S19 cross internally at (1640458343/2867030000,-4910230279/11468120000); a projected crossing is not an atomic connection.", message: "The 36 interior atoms each have 3 bonds, while the 12 terminal atoms at the two openings each retain 1 bond; the degree sum is 36×3 + 12 = 120, giving 60 unique bonds. Circumferential indices connect modulo 6 without duplicating the seam; only axial boundaries are truncated. Cylinder coordinates and the fixed oblique projection are rounded to 1/10000, then rotated and uniformly scaled by 3/4; intersections are computed exactly for the actual rational inputs. For example, S1 and S19 cross internally at (1640458343/2867030000,-4910230279/11468120000); a projected crossing is not an atomic connection." },
    },
  },
]
