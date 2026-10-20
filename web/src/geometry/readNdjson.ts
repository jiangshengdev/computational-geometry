/** Read bounded network chunks, yielding to input/painting and closing on error. */
export async function* readNdjson(response: Response): AsyncGenerator<unknown[]> {
  if (!response.body) throw new Error('The execution trace response has no body')
  const reader = response.body.getReader()
  const text = new TextDecoder()
  let pending = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      pending += text.decode(value, { stream: !done })
      const frames: unknown[] = []
      let newline: number
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        if (line) frames.push(JSON.parse(line))
      }
      yield frames
      if (done) break
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
    if (pending.trim()) throw new Error('Execution trace transfer interrupted')
  } finally {
    try { await reader.cancel() } finally { reader.releaseLock() }
  }
}
