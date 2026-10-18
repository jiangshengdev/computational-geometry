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
  { id: 'overlap', name: msg`Overlapping polygons`, description: msg`Two squares share a rectangular region.`, first: square, second: boundary(['2', '1'], ['6', '1'], ['6', '3'], ['2', '3']) },
  { id: 'disjoint', name: msg`Disjoint polygons`, description: msg`Separated boundaries have an empty intersection.`, first: square, second: boundary(['6', '0'], ['8', '0'], ['8', '2'], ['6', '2']) },
  { id: 'contained', name: msg`Contained polygon`, description: msg`The inner polygon is the entire intersection.`, first: square, second: boundary(['1', '1'], ['3', '1'], ['2', '3']) },
  { id: 'coincident', name: msg`Coincident polygons`, description: msg`Identical boundaries retain their complete common region.`, first: square, second: square },
  { id: 'point-contact', name: msg`Point contact`, description: msg`The boundaries meet at a single vertex.`, first: square, second: boundary(['4', '4'], ['6', '4'], ['6', '6'], ['4', '6']) },
  { id: 'shared-edge', name: msg`Shared edge`, description: msg`A shared boundary segment is a nonempty intersection.`, first: square, second: boundary(['4', '1'], ['6', '1'], ['6', '3'], ['4', '3']) },
  { id: 'exact-fractions', name: msg`Fractional intersection`, description: msg`Sloping edges produce exact fractional intersection coordinates.`, first: boundary(['0', '0'], ['3', '0'], ['0', '3']), second: boundary(['0', '1'], ['3', '2'], ['0', '2']) },
]
