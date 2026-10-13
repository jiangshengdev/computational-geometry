export const learningLayouts = {
  '1:2:2': [1, 2, 2],
  '2:3:3': [2, 3, 3],
  '1:1:1': [1, 1, 1],
  '1:3:2': [1, 3, 2],
  '1:2:3': [1, 2, 3],
} as const

export type LearningLayout = keyof typeof learningLayouts

export function isLearningLayout(value: unknown): value is LearningLayout {
  return typeof value === 'string' && Object.hasOwn(learningLayouts, value)
}
