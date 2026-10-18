import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import { point, type Point } from '../../geometry/geometry'

export interface TriangulationCase {
  id: string
  name: MessageDescriptor
  description: MessageDescriptor
  vertices: Point[]
}

const boundary = (...coordinates: [string, string][]) => coordinates.map(([x, y]) => point(x, y))

export const triangulationCases: TriangulationCase[] = [
  { id: 'triangle', name: msg`Triangle`, description: msg`The smallest valid boundary produces one triangle.`, vertices: boundary(['0', '0'], ['6', '0'], ['2', '4']) },
  { id: 'convex', name: msg`Convex polygon`, description: msg`A convex hexagon with horizontal edges and equal-height vertices.`, vertices: boundary(['0', '0'], ['4', '0'], ['6', '3'], ['4', '6'], ['0', '6'], ['-2', '3']) },
  { id: 'concave', name: msg`Concave polygon`, description: msg`An inward corner keeps the triangulation inside an L-shaped boundary.`, vertices: boundary(['0', '0'], ['6', '0'], ['6', '2'], ['2', '2'], ['2', '6'], ['0', '6']) },
  { id: 'multiple-notches', name: msg`Multiple notches`, description: msg`A comb-shaped boundary has many inward corners, horizontal edges and equal-height vertices.`, vertices: [point('0', '0'), point('26', '0'), point('26', '6'), ...Array.from({ length: 12 }, (_, i) => {
    const x = 25 - 2 * i
    return boundary([String(x), '6'], [String(x), '3'], [String(x - 1), '3'], [String(x - 1), '6'])
  }).flat(), point('0', '6')] },
  { id: 'collinear', name: msg`Collinear boundary vertices`, description: msg`Consecutive collinear vertices retain their original input indices.`, vertices: boundary(['0', '0'], ['2', '0'], ['4', '0'], ['6', '0'], ['6', '4'], ['0', '4']) },
  { id: 'exact-fractions', name: msg`Exact fractional vertices`, description: msg`Fractional input coordinates travel losslessly to the Rust algorithm.`, vertices: boundary(['1/3', '1/7'], ['13/3', '1/7'], ['13/3', '15/7'], ['7/3', '8/7'], ['1/3', '15/7']) },
]
