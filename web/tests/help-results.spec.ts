import { expect, test } from '@playwright/test'

test('结果帮助：默认数据完整，按需说明保持选择与画布', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  await page.setViewportSize({ width: 1360, height: 900 })
  const response = page.waitForResponse('/api/intersections')
  await page.goto('/cases/crossing')
  expect((await response).ok()).toBe(true)
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await expect(page.getByText('两条对角线相交于 (2, 2)。', { exact: true })).toBeHidden()
  await expect(page.getByText('学习目标：观察加入、发现交点、换序和退出。', { exact: true })).toBeHidden()
  const inputs = page.getByRole('region', { name: '原始输入', exact: true })
  await expect(inputs.getByRole('listitem')).toHaveText(['S0(0, 0) → (4, 4)', 'S1(0, 4) → (4, 0)'])
  const pair = page.getByRole('radio', { name: 'S0 × S1 · 点', exact: true })
  await pair.click()
  const details = page.getByRole('region', { name: '精确详情', exact: true })
  await expect(details).toContainText('(2, 2)')
  await page.getByRole('button', { name: '放大', exact: true }).click()
  const drawing = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
  await drawing.scrollIntoViewIfNeeded()
  const box = (await drawing.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 15, { steps: 4 })
  await page.mouse.up()
  // Let the drag gesture's end-of-task click suppression finish before
  // starting a separate keyboard interaction.
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)))
  const geometry = drawing.locator('g[data-layer="geometry"]')
  const grid = drawing.locator('g[data-layer="grid"]')
  const transform = await geometry.getAttribute('transform')
  await expect(grid).toHaveAttribute('transform', transform!)
  const detailText = await details.innerText()
  const dialog = page.getByRole('dialog', { name: '说明与帮助', exact: true })
  for (const [name, topic, content] of [
    ['案例说明', '案例介绍与目标', '两条对角线相交于 (2, 2)。'],
    ['结果说明', '配对与精确详情', '交集可以是点或完整重叠区间'],
    ['输入说明', '原始输入', '即使几何重合，也保留各自的输入身份'],
  ]) {
    const trigger = page.getByRole('button', { name, exact: true })
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(dialog, name).toBeVisible()
    await expect(dialog.getByRole('tab', { name: topic, exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(dialog).toContainText(content)
    if (name === '案例说明') {
      await expect(dialog).toContainText('两条对角线相交于 (2, 2)。')
      await expect(dialog).toContainText('学习目标：观察加入、发现交点、换序和退出。')
    }
    if (name === '结果说明') {
      await dialog.getByRole('button', { name: '关闭帮助', exact: true }).click()
    } else await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(pair).toBeChecked()
    await expect(details).toHaveText(detailText, { useInnerText: true })
    await expect(geometry).toHaveAttribute('transform', transform!)
    await expect(grid).toHaveAttribute('transform', transform!)
    await expect(page).toHaveURL(/\/cases\/crossing$/)
  }
  await inputs.getByRole('listitem').first().hover()
  await expect(page.getByRole('img', { name: '输入 S0，已选中', exact: true })).toHaveAttribute('data-highlighted', 'true')
  await expect(page.getByRole('img', { name: '输入 S1，已选中', exact: true })).toHaveAttribute('data-highlighted', 'false')
  await expect(pair).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
  await expect(page).toHaveURL(/\/cases\/crossing\/learn$/)
  await page.getByRole('link', { name: '返回结果查看器', exact: true }).click()
  await expect(page).toHaveURL(/\/cases\/crossing$/)
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await expect(page).toHaveURL('/')
  expect(errors).toEqual([])
})
