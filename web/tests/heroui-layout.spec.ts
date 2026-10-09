import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

for (const viewport of [{ width: 1360, height: 900 }, { width: 390, height: 844 }, { width: 1360, height: 600 }, { width: 390, height: 500 }, { width: 1100, height: 720 }]) {
  test(`HeroUI 全站视觉与流程 ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const capture = async (name: string) => {
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await testInfo.attach(name, { body: await page.screenshot({ path: join(tmpdir(), `bo-heroui-${name}-${viewport.width}-${viewport.height}.png`), animations: 'disabled' }), contentType: 'image/png' })
    }
    await page.goto('/')
    const card = page.getByRole('article', { name: '普通交叉', exact: true })
    await expect(card.getByRole('link', { name: '开始学习', exact: true })).toBeVisible()
    await capture('cases')
    await card.getByRole('link', { name: '查看详情', exact: true }).click()
    const pair = page.getByRole('radio', { name: 'S0 × S1 · 点', exact: true })
    await pair.click()
    await expect(page.getByRole('region', { name: '精确详情' })).toContainText('(2, 2)')
    await pair.click()
    await expect(page.getByRole('region', { name: '精确详情' })).toContainText('选择一个配对')
    await page.getByRole('region', { name: '几何视图' }).scrollIntoViewIfNeeded()
    await capture('results')
    await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
    const next = page.getByRole('button', { name: '下一步', exact: true })
    await next.click()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('1')
    // A layout may fit every card yet leave no drawable area after the
    // coordinate plane's padding. Check the actual rendered crossing.
    const segment = (await page.getByRole('img', { name: '输入 S0', exact: true }).boundingBox())!
    expect(segment.width).toBeGreaterThan(40)
    expect(segment.height).toBeGreaterThan(40)
    if (viewport.width < 1100) {
      const order = await Promise.all([
        next,
        page.getByRole('region', { name: '几何视图' }),
        page.getByRole('region', { name: '操作解释' }),
        page.getByRole('region', { name: '当前事件', exact: true }),
      ].map(item => item.boundingBox()))
      for (let index = 1; index < order.length; index++) expect(order[index]!.y).toBeGreaterThan(order[index - 1]!.y)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture('learning')
    const opener = page.getByRole('button', { name: '说明与帮助', exact: true })
    await opener.click()
    const dialog = page.getByRole('dialog')
    const close = dialog.getByRole('button', { name: '关闭帮助' })
    await expect(close).toBeInViewport()
    await capture('help')
    await dialog.getByText('参考资料', { exact: true }).click()
    await expect(dialog.getByRole('radio', { name: '参考资料', exact: true })).toBeChecked()
    await expect(close).toBeInViewport()
    await close.click()
    await expect(opener).toBeFocused()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('1')
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
    await page.getByRole('link', { name: '返回列表', exact: true }).click()
    await expect(card).toBeVisible()
    expect(errors).toEqual([])
  })
}
