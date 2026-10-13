import { expect, test } from '@playwright/test'
import { installCase, longDetailsCase } from '../support/scrolling-cases'
import { tabToReachable } from '../support/keyboard'

test('详情溢出时可用键盘滚动，恢复尺寸后移除多余停留点', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 })
  await installCase(page, longDetailsCase)
  await page.goto(`/cases/${longDetailsCase.id}`)
  const pair = page.getByRole('radio').last()
  await pair.click()
  const details = page.getByRole('region', { name: '精确详情' })
  await expect(details).toContainText('(0, 0)')
  await expect.poll(() => details.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0)
  await pair.focus()
  await tabToReachable(page, details)
  // Let WebKit's native scrolling run while the key is held, rather than
  // sending keydown and keyup in the same rendering frame.
  await page.keyboard.down('ArrowDown')
  try {
    await expect.poll(() => details.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  } finally {
    await page.keyboard.up('ArrowDown')
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.setViewportSize({ width: 1920, height: 990 })
  await expect.poll(() => details.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
  await expect(details).toHaveAttribute('tabindex', '-1')
})
