import { test as base, type BrowserContext } from '@playwright/test'

export { expect, type Locator, type Page } from '@playwright/test'

// Existing teaching tests exercise content with pinned panels. Fresh-user and
// persistence behavior is tested separately in learning-docks/learning-columns.
export async function expandedPanels(context: BrowserContext) {
  await context.addInitScript(() => {
    for (const side of ['left', 'right']) {
      const key = `bo-learning-layout-v1-${side}`
      if (localStorage.getItem(key) === null) localStorage.setItem(key, 'true')
    }
  })
}

export const test = base.extend({
  context: async ({ context }, provide) => {
    await expandedPanels(context)
    await provide(context)
  },
})
