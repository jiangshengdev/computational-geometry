import { segment, type Segment } from '../geometry'
import { type Preset } from './preset'
import { bridgeTruss } from '../../../geometry/patterns'

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
    id: 'bridge-truss', name: /*i18n*/ { id: "Bridge truss", message: "Bridge truss" },
    description: /*i18n*/ { id: "A four-span bridge connects upper and lower chords with continuous triangular supports, clearly showing connections between vertical members and diagonal braces.", message: "A four-span bridge connects upper and lower chords with continuous triangular supports, clearly showing connections between vertical members and diagonal braces." },
    segments: bridgeTruss(),
    learning: {
      goal: /*i18n*/ { id: "Compare endpoint connections at bridge joints with interior crossings of the braces in each span; observe event grouping at different positions.", message: "Compare endpoint connections at bridge joints with interior crossings of the braces in each span; observe event grouping at different positions." },
      verification: /*i18n*/ { id: "In the first span, S2 satisfies y = x and S3 satisfies y = 4 − x, crossing internally at (2, 2); the other three spans cross at (6, 2), (10, 2), and (14, 2). S0 and S4 connect at the shared endpoint (4, 0). There are 10 structural joints and 4 interior span crossings; each shared member is generated only once.", message: "In the first span, S2 satisfies y = x and S3 satisfies y = 4 − x, crossing internally at (2, 2); the other three spans cross at (6, 2), (10, 2), and (14, 2). S0 and S4 connect at the shared endpoint (4, 0). There are 10 structural joints and 4 interior span crossings; each shared member is generated only once." },
    },
  },
  {
    id: 'meander-window', name: /*i18n*/ { id: "Meander window lattice", message: "Meander window lattice" },
    description: /*i18n*/ { id: "Three angular meander patterns inside a window frame connect to a lower crossbar, with generous gaps between turns.", message: "Three angular meander patterns inside a window frame connect to a lower crossbar, with generous gaps between turns." },
    segments: meanderWindow(),
    learning: {
      goal: /*i18n*/ { id: "Trace endpoint connections along the angular meanders and distinguish contacts where a meander starts inside the crossbar.", message: "Trace endpoint connections along the angular meanders and distinguish contacts where a meander starts inside the crossbar." },
      verification: /*i18n*/ { id: "S5 runs from (0, 0) to (0, 8), and S6 from (0, 8) to (8, 8), sharing endpoint (0, 8). S4 has y = 0, x ∈ [−2, 34], and touches S5 at (0, 0). Each of the three meanders has 7 corners and 1 crossbar contact; with the 4 frame corners and 2 contacts between crossbar and frame, there are 30 distinct positions. There are no interior crossings or overlaps.", message: "S5 runs from (0, 0) to (0, 8), and S6 from (0, 8) to (8, 8), sharing endpoint (0, 8). S4 has y = 0, x ∈ [−2, 34], and touches S5 at (0, 0). Each of the three meanders has 7 corners and 1 crossbar contact; with the 4 frame corners and 2 contacts between crossbar and frame, there are 30 distinct positions. There are no interior crossings or overlaps." },
    },
  },
  {
    id: 'diagonal-weave', name: /*i18n*/ { id: "Diagonal weave", message: "Diagonal weave" },
    description: /*i18n*/ { id: "Two continuous families of diagonals in opposite directions weave a diamond pattern, retaining real segments at every crossing.", message: "Two continuous families of diagonals in opposite directions weave a diamond pattern, retaining real segments at every crossing." },
    segments: diagonalWeave(),
    learning: {
      goal: /*i18n*/ { id: "Identify intersecting pairs among families of parallel lines and observe interior crossings at different heights in the diamond pattern.", message: "Identify intersecting pairs among families of parallel lines and observe interior crossings at different heights in the diamond pattern." },
      verification: /*i18n*/ { id: "Rising lines satisfy y = x + c and falling lines satisfy y = d − x, so their intersection is ((d − c)/2, (d + c)/2); the coordinates must also lie in [0, 12]. For example, S2 × S7 intersects at (6, 6) and S1 × S7 at (8, 4); S0 × S6 touches at endpoint (8, 0). Lines in the same direction are parallel, with no overlap.", message: "Rising lines satisfy y = x + c and falling lines satisfy y = d − x, so their intersection is ((d − c)/2, (d + c)/2); the coordinates must also lie in [0, 12]. For example, S2 × S7 intersects at (6, 6) and S1 × S7 at (8, 4); S0 × S6 touches at endpoint (8, 0). Lines in the same direction are parallel, with no overlap." },
    },
  },
  {
    id: 'parabolic-strings', name: /*i18n*/ { id: "Parabolic string art", message: "Parabolic string art" },
    description: /*i18n*/ { id: "Finite segments on lines y = (t/3)x − t² for integer t ∈ [−6, 6] form a parabolic envelope.", message: "Finite segments on lines y = (t/3)x − t² for integer t ∈ [−6, 6] form a parabolic envelope." },
    segments: parabolicStrings(),
    learning: {
      goal: /*i18n*/ { id: "Observe how real straight segments collectively outline a curve; trace exact intersections between neighboring and distant strings.", message: "Observe how real straight segments collectively outline a curve; trace exact intersections between neighboring and distant strings." },
      verification: /*i18n*/ { id: "The segment for parameter t has endpoints (3(t − 6), −6t) and (3(t + 6), 6t). Strings with parameters t and u intersect at (3(t + u), tu), within both segments; for example, S5 × S7 intersects at (0, −1) and S6 × S7 at (3, 0). The continuous line family is tangent to y = x²/36 at (6t, t²), so the finite arrangement outlines its envelope; 13 strings produce 78 distinct intersection positions.", message: "The segment for parameter t has endpoints (3(t − 6), −6t) and (3(t + 6), 6t). Strings with parameters t and u intersect at (3(t + u), tu), within both segments; for example, S5 × S7 intersects at (0, −1) and S6 × S7 at (3, 0). The continuous line family is tangent to y = x²/36 at (6t, t²), so the finite arrangement outlines its envelope; 13 strings produce 78 distinct intersection positions." },
    },
  },
  {
    id: 'star-polygon', name: /*i18n*/ { id: "Star polygon", message: "Star polygon" },
    description: /*i18n*/ { id: "Connect eight vertices around a ring by advancing 3 positions at each step to form a closed eight-pointed star; vertices use fixed integer coordinates.", message: "Connect eight vertices around a ring by advancing 3 positions at each step to form a closed eight-pointed star; vertices use fixed integer coordinates." },
    segments: starPolygon(),
    learning: {
      goal: /*i18n*/ { id: "Distinguish endpoint connections at star tips from interior crossings, and understand how the vertex-skipping rule generates regular intersection patterns.", message: "Distinguish endpoint connections at star tips from interior crossings, and understand how the vertex-skipping rule generates regular intersection patterns." },
      verification: /*i18n*/ { id: "Number vertices clockwise from 0 to 7 and connect i to (i + 3) mod 8; starting at 0, visit 3, 6, 1, 4, 7, 2, and 5 before closing. S0 satisfies y = 10 − 17x/7 and S1 satisfies y = 17x/7 − 10, with interior intersection (70/17, 0). S0 and S3 connect at endpoint (7, −7). The eight vertices form an integer-coordinate octagon, not a claimed exact regular octagon.", message: "Number vertices clockwise from 0 to 7 and connect i to (i + 3) mod 8; starting at 0, visit 3, 6, 1, 4, 7, 2, and 5 before closing. S0 satisfies y = 10 − 17x/7 and S1 satisfies y = 17x/7 − 10, with interior intersection (70/17, 0). S0 and S3 connect at endpoint (7, −7). The eight vertices form an integer-coordinate octagon, not a claimed exact regular octagon." },
    },
  },
]
