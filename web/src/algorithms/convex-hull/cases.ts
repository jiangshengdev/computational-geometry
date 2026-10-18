import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { point, type Point } from '../../geometry/geometry'

export interface HullCase {
  id: string
  name: MessageDescriptor
  description: MessageDescriptor
  points: Point[]
}

export const hullCases: HullCase[] = [
  {
    id: 'triangle-interior',
    name: msg`Triangle and interior point`,
    description: msg`The interior point is excluded from the three-vertex hull.`,
    points: [point('0', '0'), point('6', '0'), point('3', '6'), point('3', '2')],
  },
  {
    id: 'duplicate-coordinates',
    name: msg`Duplicate coordinates`,
    description: msg`Repeated inputs keep their identities without adding hull vertices.`,
    points: [point('0', '0'), point('4', '0'), point('4', '4'), point('0', '4'), point('0', '0'), point('2', '2')],
  },
  {
    id: 'exact-fractions',
    name: msg`Exact fractions`,
    description: msg`Exact rational coordinates remain fractions in the ordered hull result.`,
    points: [point('0', '0'), point('3/2', '0'), point('0', '5/3'), point('1/3', '1/3')],
  },
]
