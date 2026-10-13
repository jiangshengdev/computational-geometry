import type { Segment } from '../geometry/geometry'

export interface Preset { id: string; name: string; description: string; segments: Segment[]; learning?: { goal: string; verification: string; overlap?: boolean } }
