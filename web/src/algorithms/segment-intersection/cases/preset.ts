import type { MessageDescriptor } from '@lingui/core'
import type { Segment } from '../geometry'

export interface Preset { id: string; name: MessageDescriptor; description: MessageDescriptor; segments: Segment[]; learning?: { goal: MessageDescriptor; verification: MessageDescriptor; overlap?: boolean } }
