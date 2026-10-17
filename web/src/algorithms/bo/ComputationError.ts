import type { MessageDescriptor } from '@lingui/core'

/** Keeps application diagnostics translatable after the failed request settles. */
export class ComputationError extends Error {
  readonly descriptor: MessageDescriptor

  constructor(descriptor: MessageDescriptor) {
    super(descriptor.message)
    this.descriptor = descriptor
  }
}
