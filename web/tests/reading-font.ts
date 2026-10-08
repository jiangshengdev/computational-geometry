import type { Page } from '@playwright/test'

// Measure large-text layouts after the existing controls' size transitions.
export async function setReadingFont(page: Page, size: number) {
  await page.addStyleTag({ content: `:root { font-size: ${size}px; }` })
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await Promise.all(document.getAnimations().map(animation => animation.finished))
  })
}
