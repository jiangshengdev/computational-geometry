import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { point, type Point } from '../../geometry/geometry'
import { bridgeTruss, hexagonalSnowflake, patternPoints, spiderWeb } from '../../geometry/patterns'

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
  {
    id: 'spider-web',
    name: msg`Spider web`,
    description: msg`The outer ring determines the hull; the inner ring and center lie inside. Only web junctions are input points.`,
    points: patternPoints(spiderWeb()),
  },
  {
    id: 'bridge-truss',
    name: msg`Bridge truss`,
    description: msg`The four corners form the hull, excluding collinear joints along its edges. Brace crossings are not input points.`,
    points: patternPoints(bridgeTruss()),
  },
  {
    id: 'hexagonal-snowflake',
    name: msg`Hexagonal snowflake`,
    description: msg`Branch tips determine the hull of this forked point set. The shape uses the fixed rational approximation √3/2 ≈ 433/500; hull computation is exact for the submitted coordinates.`,
    points: patternPoints(hexagonalSnowflake()),
  },
  {
    id: 'all-collinear',
    name: msg`All collinear`,
    description: msg`Only the two extreme endpoints remain; intermediate collinear points do not become hull vertices.`,
    points: [point('2', '2'), point('-2', '-2'), point('0', '0'), point('4', '4'), point('1', '1')],
  },
  {
    id: 'empty',
    name: msg`Empty set`,
    description: msg`No input points: the computation succeeds with an empty hull.`,
    points: [],
  },
  {
    id: 'single',
    name: msg`Single point`,
    description: msg`A single input is its own hull, displayed as a point.`,
    points: [point('2', '3')],
  },
  {
    id: 'two-points',
    name: msg`Two points`,
    description: msg`Two distinct points form a segment, ordered from the lexicographically smaller endpoint.`,
    points: [point('4', '3'), point('-2', '1')],
  },
]
