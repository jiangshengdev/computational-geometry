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
  { id: 'triangle', name: msg`Equilateral triangle`, description: msg`An equilateral triangle uses rational coordinates rounded to six decimal places; triangulation is exact for those input values.`, vertices: boundary(['-3', '0'], ['3', '0'], ['0', '5196152/1000000']) },
  { id: 'convex', name: msg`Regular hexagon`, description: msg`A regular hexagon uses rational coordinates rounded to six decimal places, preserving horizontal edges and equal-height vertices.`, vertices: boundary(['-3', '0'], ['-3/2', '-2598076/1000000'], ['3/2', '-2598076/1000000'], ['3', '0'], ['3/2', '2598076/1000000'], ['-3/2', '2598076/1000000']) },
  { id: 'concave', name: msg`Concave polygon`, description: msg`An inward corner keeps the triangulation inside an L-shaped boundary.`, vertices: boundary(['0', '0'], ['6', '0'], ['6', '2'], ['2', '2'], ['2', '6'], ['0', '6']) },
  { id: 'multiple-notches', name: msg`Multiple notches`, description: msg`Four evenly spaced notches balance repetition with open space, retaining horizontal edges and equal-height vertices.`, vertices: [point('0', '0'), point('18', '0'), point('18', '8'), ...Array.from({ length: 4 }, (_, i) => {
    const x = 16 - 4 * i
    return boundary([String(x), '8'], [String(x), '4'], [String(x - 2), '4'], [String(x - 2), '8'])
  }).flat(), point('0', '8')] },
  { id: 'collinear', name: msg`Collinear boundary vertices`, description: msg`Consecutive collinear vertices retain their original input indices.`, vertices: boundary(['0', '0'], ['2', '0'], ['4', '0'], ['6', '0'], ['6', '4'], ['0', '4']) },
  { id: 'exact-fractions', name: msg`Exact fractional vertices`, description: msg`Fractional input coordinates travel losslessly to the Rust algorithm.`, vertices: boundary(['1/3', '1/7'], ['13/3', '1/7'], ['13/3', '15/7'], ['7/3', '8/7'], ['1/3', '15/7']) },
  {
    id: 'spiral', name: msg`Spiral`, description: msg`A narrow region winds inward; observe how the triangles stay inside each turn.`,
    // Start with the center cap, then follow a width-2 band outward with width-2 gaps.
    vertices: boundary(
      ['0', '1'], ['2', '1'], ['2', '3'], ['-2', '3'], ['-2', '-3'], ['6', '-3'],
      ['6', '7'], ['-6', '7'], ['-6', '-7'], ['10', '-7'], ['10', '11'], ['-10', '11'],
      ['-10', '-12'], ['-12', '-12'], ['-12', '13'], ['12', '13'], ['12', '-9'],
      ['-8', '-9'], ['-8', '9'], ['8', '9'], ['8', '-5'], ['-4', '-5'],
      ['-4', '5'], ['4', '5'], ['4', '-1'], ['0', '-1'],
    ),
  },
  {
    id: 'concave-star', name: msg`Multi-arm concave star`, description: msg`Eight arms alternate with deep notches in a boundary with mirror symmetry and quarter-turn rotational symmetry.`,
    vertices: boundary(
      ['0', '14'], ['2', '5'], ['10', '10'], ['5', '2'], ['14', '0'], ['5', '-2'],
      ['10', '-10'], ['2', '-5'], ['0', '-14'], ['-2', '-5'], ['-10', '-10'], ['-5', '-2'],
      ['-14', '0'], ['-5', '2'], ['-10', '10'], ['-2', '5'],
    ),
  },
  {
    id: 'winding-channel', name: msg`Winding channel`, description: msg`Aligned turns, uniform channel width and even spacing give the winding boundary a regular rhythm.`,
    vertices: boundary(
      ['0', '0'], ['18', '0'], ['18', '9'], ['3', '9'], ['3', '12'], ['18', '12'],
      ['18', '21'], ['0', '21'], ['0', '18'], ['15', '18'], ['15', '15'], ['0', '15'],
      ['0', '6'], ['15', '6'], ['15', '3'], ['0', '3'],
    ),
  },
  {
    id: 'irregular-outline', name: msg`Irregular outline`, description: msg`Uneven protrusions and indentations face different directions, without a repeating boundary pattern.`,
    vertices: boundary(
      ['0', '0'], ['4', '1'], ['7', '-2'], ['9', '2'], ['14', '0'], ['13', '5'],
      ['19', '3'], ['23', '6'], ['18', '9'], ['24', '12'], ['19', '15'], ['21', '20'],
      ['16', '18'], ['13', '23'], ['11', '17'], ['7', '21'], ['6', '16'], ['1', '18'],
      ['3', '13'], ['-3', '12'], ['1', '9'], ['-2', '6'], ['3', '5'],
    ),
  },
]
