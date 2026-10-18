export type Triangle = [number, number, number]

export function decodeTriangulation(data: unknown): Triangle[] {
  const { triangles } = data as { triangles: Triangle[] }
  if (!Array.isArray(triangles) || triangles.some(triangle => !Array.isArray(triangle) || triangle.length !== 3 || triangle.some(index => !Number.isSafeInteger(index) || index < 0))) {
    throw new Error('Invalid result structure')
  }
  return triangles
}

export const triangleVertices = (triangle: Triangle) => triangle.map(index => `P${index}`).join(', ')
