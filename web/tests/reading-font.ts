import type { Page } from '@playwright/test'

// Measure large-text layouts after the existing controls' size transitions.
export async function setReadingFont(page: Page, size: number) {
  await page.addStyleTag({ content: `:root { font-size: ${size}px; }` })
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    // Scroll-driven shadows settle at the current scroll position, not over time.
    await Promise.all(document.getAnimations()
      .filter(animation => animation.timeline === document.timeline)
      .map(animation => animation.finished))
  })
}
