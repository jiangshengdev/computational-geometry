// Trace values are Rust-style teaching text, not JSON. Split only at the
// collection's own commas: coordinates, fields and nested lists stay intact.
export function formatExecutionValue(source: string): string {
  const opening = source[0]
  if (opening !== '[' && opening !== '{') return source
  const closing = opening === '[' ? ']' : '}'
  if (!source.endsWith(closing)) return source
  const body = source.slice(1, -1)
  if (!body.trim()) return source
  const items: string[] = []
  const stack: string[] = []
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  let start = 0
  for (let index = 0; index < body.length; index++) {
    const character = body[index]
    if (pairs[character]) stack.push(pairs[character])
    else if (')]}'.includes(character)) {
      if (stack.pop() !== character) return source
    } else if (character === ',' && stack.length === 0) {
      items.push(body.slice(start, index).trim())
      start = index + 1
    }
  }
  if (stack.length) return source
  items.push(body.slice(start).trim())
  // Intersections use the compact domain notation "S0 × S1: (x, y)".
  if (opening === '[' && !items.some(item => item.includes('{') || /^S\d+ × S\d+:/.test(item))) return source
  return `${opening}\n  ${items.join(',\n  ')}\n${closing}`
}
