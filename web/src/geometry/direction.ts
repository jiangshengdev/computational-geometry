export type Position = { x: number; y: number }
export type Direction = 'left' | 'right' | 'collinear'

export const directionColor = (direction: Direction) => direction === 'left' ? 'var(--success)' : direction === 'right' ? 'var(--danger)' : 'var(--warning)'
