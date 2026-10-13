// Trace values are Rust-style teaching text, not JSON. Split only at the
// collection's own commas: coordinates, fields and nested lists stay intact.
export function formatExecutionValue(source: string, mode: 'expanded' | 'summary' = 'expanded'): string {
  const opening = source[0]
  if (opening !== '[' && opening !== '{') return source
  const closing = opening === '[' ? ']' : '}'
  if (!source.endsWith(closing)) return source
  const body = source.slice(1, -1)
  if (!body.trim()) return source
  const items = splitExecutionItems(body)
  if (!items) return source
  // Intersections use the compact domain notation "S0 × S1: (x, y)".
  if (opening === '[' && !items.some(item => item.includes('{') || /^S\d+ × S\d+:/.test(item))) return source
  if (mode === 'summary') return `${opening}${items[0]}${items.length > 1 ? ', ...' : ''}${closing}`
  return `${opening}\n  ${items.join(',\n  ')}\n${closing}`
}

export function splitExecutionItems(body: string): string[] | undefined {
  const items: string[] = []
  const stack: string[] = []
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  let start = 0
  for (let index = 0; index < body.length; index++) {
    const character = body[index]
    if (pairs[character]) stack.push(pairs[character])
    else if (')]}'.includes(character)) {
      if (stack.pop() !== character) return undefined
    } else if (character === ',' && stack.length === 0) {
      items.push(body.slice(start, index).trim())
      start = index + 1
    }
  }
  if (stack.length) return undefined
  items.push(body.slice(start).trim())
  return items
}
