import { expect, test, type Locator, type Page } from './learning-test'
import { formatPoint, samePoint } from '../src/geometry'
import { installCase, scrollingCase } from './scrolling-cases'
import { readResponse } from './trace-navigation'

test.beforeEach(async ({ page }) => {
  await installCase(page, scrollingCase)
})

async function readTrace(page: Page, id: string) {
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST')
  await page.goto(`/cases/${id}/learn`)
  const result = await response
  expect(result.status()).toBe(200)
  expect(result.request().postDataJSON()).toEqual({ segments: scrollingCase.segments, trace: true })
  const body = await readResponse(result)
  expect(body.intersections).toHaveLength(3)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveAttribute('max', String(body.trace.steps.length - 1))
  return body.trace
}

async function visibilityInPanel(row: Locator) {
  return row.evaluate(element => {
    let panel = element.parentElement
    while (panel && !['auto', 'scroll'].includes(getComputedStyle(panel).overflowY)) panel = panel.parentElement
    if (!panel) throw new Error('条目没有内部滚动面板')
    const item = element.getBoundingClientRect(), viewport = panel.getBoundingClientRect()
    return {
      visible: item.top >= viewport.top - 1 && item.bottom <= viewport.bottom + 1,
      rowTop: item.top, rowBottom: item.bottom, rowHeight: item.height,
      panelTop: viewport.top, panelBottom: viewport.bottom, panelHeight: panel.clientHeight,
      scrollTop: panel.scrollTop, scrollHeight: panel.scrollHeight,
    }
  })
}

async function scrollPanel(row: Locator, end: boolean) {
  return row.evaluate((element, end) => {
    let panel = element.parentElement
    while (panel && !['auto', 'scroll'].includes(getComputedStyle(panel).overflowY)) panel = panel.parentElement
    if (!panel) throw new Error('条目没有内部滚动面板')
    panel.scrollTop = end ? panel.scrollHeight : 0
    return { overflow: panel.scrollHeight - panel.clientHeight, top: panel.scrollTop,
      rowHeight: element.getBoundingClientRect().height, panelHeight: panel.clientHeight }
  }, end)
}

async function hideRowInOverflowingPanel(row: Locator, end: boolean) {
  const panel = await scrollPanel(row, end)
  expect(panel.overflow).toBeGreaterThan(0)
  expect(panel.rowHeight).toBeLessThanOrEqual(panel.panelHeight)
  expect(await visibilityInPanel(row)).toMatchObject({ visible: false })
}

for (const mode of ['前进', '回退', '快捷键', '滑块'] as const) {
  test(`教学定位：${mode} 定位目标步骤实际活动条目并保留页面及焦点`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 720 })
    const trace = await readTrace(page, scrollingCase.id)
    const target = trace.steps.findIndex(step => step.action === 'record' && step.active.length === scrollingCase.segments.length && step.subjects[0] === step.active[0])
    expect(target).toBeGreaterThan(0)
    const prior = mode === '回退' ? target + 1 : target - 1
    await page.goto(`/cases/${scrollingCase.id}/learn?step=${prior}`)
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await expect(slider).toHaveValue(String(prior))
    const active = page.getByRole('region', { name: '活动线段顺序' })
    const row = active.getByRole('listitem').filter({ hasText: new RegExp(`^S${trace.steps[target].subjects[0]}$`) })
    await hideRowInOverflowingPanel(row, false)
    const control = mode === '滑块' ? slider : page.getByRole('button', { name: mode === '回退' ? '上一步' : '下一步', exact: true })
    await control.focus()
    const before = await page.evaluate(() => window.scrollY)
    const canvas = await page.getByRole('region', { name: '几何视图' }).boundingBox()
    if (mode === '前进' || mode === '回退') await control.click()
    else await control.press('ArrowRight')
    await expect(slider).toHaveValue(String(target))
    await expect.poll(() => visibilityInPanel(row)).toEqual(expect.objectContaining({ visible: true }))
    await expect(control).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
    expect(await page.getByRole('region', { name: '几何视图' }).boundingBox()).toEqual(canvas)
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('记录')
    expect(new URL(page.url()).search).toBe(`?step=${target}`)
    // Manual browsing at this step survives hover-driven rerenders.
    await scrollPanel(row, false)
    await active.getByRole('heading', { name: '活动线段顺序' }).hover()
    expect(await visibilityInPanel(row)).toMatchObject({ visible: false })
    await page.getByRole('button', { name: '上一步', exact: true }).click()
    await page.getByRole('button', { name: '下一步', exact: true }).click()
    await expect.poll(() => visibilityInPanel(row)).toEqual(expect.objectContaining({ visible: true }))
  })
}

test('教学定位：点击滑块轨道跨多步跳转后定位目标而非来源步骤', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 720 })
  const trace = await readTrace(page, scrollingCase.id)
  const target = trace.steps.findIndex(step => step.action === 'record' && step.active.length === scrollingCase.segments.length && step.subjects[0] === step.active[0])
  const subject = trace.steps[target].subjects[0]
  const prior = trace.steps.findIndex((step, index) => index < target - 1 && step.active.length === scrollingCase.segments.length - 3 && step.active[0] === subject)
  expect(prior).toBeGreaterThanOrEqual(0)
  expect(target - prior).toBeGreaterThan(1)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  const thumb = page.getByTestId('teaching-step-thumb')
  await page.goto(`/cases/${scrollingCase.id}/learn?step=${prior}`)
  await expect(slider).toHaveValue(String(prior))
  await expect(slider).toHaveAttribute('max', String(trace.steps.length - 1))
  const row = page.getByRole('region', { name: '活动线段顺序' }).getByRole('listitem').filter({ hasText: new RegExp(`^S${subject}$`) })
  await hideRowInOverflowingPanel(row, false)
  const scrollBefore = await page.evaluate(() => window.scrollY)
  const current = await thumb.boundingBox()
  const track = await page.getByRole('group', { name: '教学步骤', exact: true }).boundingBox()
  if (!current || !track) throw new Error('找不到滑块与轨道区域')
  const x = track.x + track.width * target / (trace.steps.length - 1)
  expect(x).toBeGreaterThan(current.x + current.width)
  await page.mouse.click(x, current.y + current.height / 2)
  await expect(slider).toHaveValue(String(target))
  await expect.poll(() => visibilityInPanel(row)).toEqual(expect.objectContaining({ visible: true }))
  await expect(slider).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore)
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('记录')
  expect(new URL(page.url()).search).toBe(`?step=${target}`)
})

test('教学定位：发现事件按精确身份定位，回退移除未来条目，重启和完成清空状态', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 720 })
  const trace = await readTrace(page, scrollingCase.id)
  const discovery = trace.steps.findIndex(step => step.action === 'discover')
  expect(discovery).toBeGreaterThan(0)
  const point = trace.steps[discovery].pending.find(point => !trace.steps[discovery - 1].pending.some(old => samePoint(point, old)))!
  await page.goto(`/cases/${scrollingCase.id}/learn?step=${discovery}`)
  const queue = page.getByRole('region', { name: '待处理事件队列' })
  const row = queue.getByRole('listitem').filter({ hasText: formatPoint(point) })
  await expect(row).toHaveCount(1)
  await hideRowInOverflowingPanel(row, true)
  await page.getByRole('button', { name: '上一步', exact: true }).click()
  await expect(row).toHaveCount(0)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect.poll(() => visibilityInPanel(row)).toEqual(expect.objectContaining({ visible: true }))
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveAttribute('max', String(trace.steps.length - 1))
  await expect(page.getByRole('region', { name: '回放控制' })).not.toContainText('轨迹生成中')
  await slider.focus()
  await slider.press('End')
  await expect(queue.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await expect(page.getByRole('region', { name: '学习结果' })).toContainText('学习完成')
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(slider).toHaveValue('0')
  await expect(queue.getByRole('listitem')).toHaveCount(scrollingCase.segments.length * 2)
  await expect(row).toHaveCount(0)
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
  await expect(page.getByTestId('active-order')).toHaveText('空')
})
