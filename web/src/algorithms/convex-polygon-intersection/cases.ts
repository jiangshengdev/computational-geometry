import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { point, type Point } from '../../geometry/geometry'

export interface PolygonCase {
  id: string
  name: MessageDescriptor
  description: MessageDescriptor
  first: Point[]
  second: Point[]
}

const boundary = (...coordinates: [string, string][]) => coordinates.map(([x, y]) => point(x, y))
const square = boundary(['0', '0'], ['4', '0'], ['4', '4'], ['0', '4'])

export const polygonCases: PolygonCase[] = [
  { id: 'right-side-advances', name: msg`Advance the red-labeled polygon`, description: msg`Two triangles overlap in a triangle. First observe a right turn with A0 to the right of B: advance A. Later observe a left turn with B1 to the right of A: advance B. In both steps, the red-highlighted endpoint belongs to the polygon that advances.`, first: boundary(['0', '0'], ['6', '0'], ['0', '6']), second: boundary(['1', '-2'], ['3', '-1'], ['3', '2']) },
  { id: 'irregular-overlap', name: msg`Irregular convex polygons`, description: msg`An irregular pentagon and hexagon intersect in a nine-sided region with six new crossings and three original vertices.`, first: boundary(['-4', '-1'], ['-1', '-4'], ['4', '-2'], ['3', '3'], ['-2', '5']), second: boundary(['-5', '1'], ['-2', '-2'], ['2', '-3'], ['5', '1'], ['2', '6'], ['-2', '4']) },
  { id: 'overlap', name: msg`Overlapping polygons`, description: msg`Two rectangles share a rectangular region.`, first: square, second: boundary(['2', '1'], ['6', '1'], ['6', '3'], ['2', '3']) },
  { id: 'disjoint', name: msg`Disjoint polygons`, description: msg`Separated boundaries have an empty intersection.`, first: square, second: boundary(['6', '0'], ['8', '0'], ['8', '2'], ['6', '2']) },
  { id: 'contained', name: msg`Contained polygon`, description: msg`The inner polygon is the entire intersection.`, first: square, second: boundary(['1', '1'], ['3', '1'], ['2', '3']) },
  { id: 'coincident', name: msg`Coincident polygons`, description: msg`Identical boundaries retain their complete common region.`, first: square, second: square },
  { id: 'point-contact', name: msg`Point contact`, description: msg`The boundaries meet at a single vertex.`, first: square, second: boundary(['4', '4'], ['6', '4'], ['6', '6'], ['4', '6']) },
  { id: 'shared-edge', name: msg`Shared edge`, description: msg`A shared boundary segment is a nonempty intersection.`, first: square, second: boundary(['4', '1'], ['6', '1'], ['6', '3'], ['4', '3']) },
  { id: 'exact-fractions', name: msg`Fractional intersection`, description: msg`Sloping edges produce exact fractional intersection coordinates.`, first: boundary(['0', '0'], ['3', '0'], ['0', '3']), second: boundary(['0', '1'], ['3', '2'], ['0', '2']) },
  { id: 'many-vertices', name: msg`Many boundary vertices`, description: msg`A convex boundary sampled along a parabola lies inside a rectangle. Equivalent fractions identify the same positions.`, first: Array.from({ length: 41 }, (_, index) => { const x = index - 20; return point(`${x}/5`, `${x * x}/100`) }), second: boundary(['-5', '-1'], ['5', '-1'], ['5', '5'], ['-5', '5']) },
]
