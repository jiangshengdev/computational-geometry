import { expect, type Locator, type Page } from '@playwright/test'

// Cross section boundaries without coupling to unrelated intermediate controls.
// A repeated focus stop means the target is unreachable or focus is trapped.
export async function tabToReachable(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  const visited = await page.evaluateHandle(() => new Set<Element>())
  try {
    while (true) {
      await page.keyboard.press('Tab')
      const state = await target.evaluate((element, visited) => {
        const active = document.activeElement!
        const repeated = visited.has(active)
        visited.add(active)
        return {
          reached: active === element,
          repeated,
          stop: active.getAttribute('aria-label') || active.textContent || active.tagName,
        }
      }, visited)
      if (state.reached) break
      expect(state.repeated, `Tab focus cycled at ${state.stop}; target ${target} was not reached`).toBe(false)
    }
    await expect(target).toBeFocused()
  } finally {
    await visited.dispose()
  }
}
