import { expect, test } from '../support/learning-test'
import { tabToReachable } from '../support/keyboard'
import { readTrace, waitForTraceCompletion } from '../support/trace-navigation'

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`教学画布、代码滚动区与符号支持键盘访问 ${browserName}`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const trace = await readTrace(page, 'crossing')
    const entry = trace.steps.findIndex(step => step.action === 'take-entry')
    expect(entry).toBeGreaterThan(0)
    await page.goto(`/bo/cases/crossing/learn?step=${entry}`)
    await waitForTraceCompletion(page)
    const canvas = page.locator('svg[data-teaching="true"]')
    await tabToReachable(page, canvas)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    const code = page.locator('.execution-code-scroll')
    await tabToReachable(page, code)
    const symbol = code.locator('.execution-symbol').first()
    await tabToReachable(page, symbol)
    await page.keyboard.press('Escape')
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

}
