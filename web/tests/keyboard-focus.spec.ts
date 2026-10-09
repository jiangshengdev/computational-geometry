import { expect, test, type Locator, type Page } from '@playwright/test'
import { installCase, longDetailsCase } from './scrolling-cases'

async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

async function expectFocusRing(target: Locator) {
  await expect(target).toHaveCSS('box-shadow', /0px 0px 0px 4px/)
}

for (const width of [1920, 390]) {
  test(`列表链接通过普通 Tab 和 Enter 导航 ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 990 })
    await page.goto('/')
    const card = page.getByRole('article', { name: '普通交叉', exact: true })
    const thumbnail = card.getByRole('link', { name: '查看普通交叉详情', exact: true })
    const learn = card.getByRole('link', { name: '开始学习', exact: true })
    const details = card.getByRole('link', { name: '查看详情', exact: true })
    await tabTo(page, thumbnail)
    await expectFocusRing(thumbnail)
    await expect(thumbnail).toHaveCSS('outline-style', 'none')
    await page.screenshot({ path: testInfo.outputPath('thumbnail-focus.png') })
    await tabTo(page, learn)
    await expectFocusRing(learn)
    await tabTo(page, details)
    await expectFocusRing(details)
    await page.screenshot({ path: testInfo.outputPath('list-focus.png') })
    await page.keyboard.press('Shift+Tab')
    await expect(learn).toBeFocused()
    await page.keyboard.press('Tab')
    const navigations: string[] = []
    page.on('request', request => { if (request.isNavigationRequest()) navigations.push(request.url()) })
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/cases\/crossing$/)
    await expect(page.getByRole('radio').first()).toBeVisible()
    expect(navigations).toEqual([])
  })
}

for (const learning of [false, true]) {
  test(`${learning ? '学习' : '详情'}页的导航链接普通 Tab 可达`, async ({ page }, testInfo) => {
    await page.goto(`/cases/crossing${learning ? '/learn' : ''}`)
    await tabTo(page, page.getByRole('link', { name: '返回列表', exact: true }))
    await tabTo(page, page.getByRole('button', { name: '说明与帮助', exact: true }))
    await tabTo(page, page.getByRole('button', { name: '案例说明', exact: true }))
    const target = page.getByRole('link', { name: learning ? '返回结果查看器' : '开始逐步学习', exact: true })
    await tabTo(page, target)
    await expectFocusRing(target)
    await page.screenshot({ path: testInfo.outputPath('navigation-focus.png') })
    if (!learning) await expect(target).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(learning ? /\/cases\/crossing$/ : /\/cases\/crossing\/learn$/)
  })
}

test('错误恢复入口普通 Tab 可达', async ({ page }) => {
  await page.goto('/cases/crossing/extra')
  const recovery = page.getByRole('navigation', { name: '恢复导航' })
  for (const name of ['返回列表', '查看详情', '从头学习']) {
    const link = recovery.getByRole('link', { name, exact: true })
    await tabTo(page, link)
    await expectFocusRing(link)
  }
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/cases\/crossing\/learn$/)
})

test('导航链接保留新标签页打开行为', async ({ page }) => {
  await page.goto('/')
  const popupPromise = page.context().waitForEvent('page')
  await page.getByRole('article', { name: '普通交叉', exact: true }).getByRole('link', { name: '查看详情', exact: true }).click({ modifiers: ['ControlOrMeta'] })
  const popup = await popupPromise
  await expect(popup).toHaveURL(/\/cases\/crossing$/)
  await expect(page).toHaveURL('/')
  await popup.close()
})

test('无需滚动的详情区域不占用 Tab 停留点', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 990 })
  await page.goto('/cases/crossing')
  const pair = page.getByRole('radio').first()
  await expect(pair).toBeVisible()
  const details = page.getByRole('region', { name: '精确详情' })
  for (const selected of [false, true]) {
    if (selected) await pair.click()
    expect(await details.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
    await pair.focus()
    await tabTo(page, page.getByRole('button', { name: '输入说明', exact: true }))
  }
})

test('详情溢出时可用键盘滚动，恢复尺寸后移除多余停留点', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 720 })
  await installCase(page, longDetailsCase)
  await page.goto(`/cases/${longDetailsCase.id}`)
  const pair = page.getByRole('radio').last()
  await pair.click()
  const details = page.getByRole('region', { name: '精确详情' })
  await expect(details).toContainText('(0, 0)')
  await expect.poll(() => details.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0)
  await pair.focus()
  await tabTo(page, details)
  await expect(details).toHaveCSS('outline-style', 'solid')
  await expect(details).toHaveCSS('outline-offset', '-2px')
  await page.screenshot({ path: testInfo.outputPath('scroll-region-focus.png') })
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
  await pair.focus()
  await tabTo(page, page.getByRole('button', { name: '输入说明', exact: true }))
})
