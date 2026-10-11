import { expect, type Locator, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { formatPoint, pairName, type Intersection } from '../src/geometry'
import { captureIntersections } from './trace-navigation'

export async function captureDemo(page: Page, target: Locator, id: string, width: number, view: 'card' | 'drawing') {
  const pictures = join(tmpdir(), 'bo-demo-58')
  await mkdir(pictures, { recursive: true })
  await target.scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await target.screenshot({ path: join(pictures, `${id}-${width}-${view}.png`) })
  if (view === 'drawing') await page.screenshot({ path: join(pictures, `${id}-${width}-viewport.png`) })
}

export async function checkPairSelection(page: Page, sample: Intersection) {
  if (sample.geometry.type !== 'point') throw new Error('演示不应存在意外重叠')
  const radio = page.getByRole('radio', { name: `${pairName(sample)} · 点`, exact: true })
  await radio.click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText(formatPoint(sample.geometry.point))
  for (const id of sample.segments) await expect(page.getByRole('img', { name: `输入 S${id}，已选中`, exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: `交集 ${pairName(sample)}，已选中`, exact: true })).toBeVisible()
  await radio.click()
}

export async function checkViewportControls(page: Page) {
  const drawing = page.getByRole('img', { name: '输入与交集坐标图', exact: true })
  const geometry = drawing.locator('[data-layer="geometry"]')
  const initial = await geometry.getAttribute('transform')
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await expect(geometry).not.toHaveAttribute('transform', initial!)
  const zoomed = await geometry.getAttribute('transform')
  await drawing.scrollIntoViewIfNeeded()
  const box = (await drawing.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 5 })
  await page.mouse.up()
  await expect(geometry).not.toHaveAttribute('transform', zoomed!)
  await page.getByRole('button', { name: '重置视图', exact: true }).click()
  await expect(geometry).toHaveAttribute('transform', initial!)
}

export async function checkLearningCompletion(page: Page, intersections: Intersection[], positions: number) {
  const capture = await captureIntersections(page)
  const learningResponse = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.request().method() === 'POST')
  await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
  const learning = await learningResponse
  expect(learning.status()).toBe(200)
  expect(learning.request().postDataJSON().trace).toBe(true)
  expect(await learning.finished()).toBeNull()
  const { intersections: learningIntersections, trace } = await capture.result
  expect(learningIntersections).toEqual(intersections)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveValue('0')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue('1')
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
  await expect(page.getByTestId('variable-next')).toContainText('未赋值')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue('2')
  await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
  await expect(page.getByTestId('variable-next')).toContainText('Some')
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue('3')
  await expect(page.getByRole('region', { name: '当前事件' })).not.toContainText('尚未处理事件')
  await slider.focus()
  await slider.press('End')
  await expect(slider).toHaveValue(String(trace.steps.length - 1))
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
  const result = page.getByRole('region', { name: '学习结果' })
  await expect(result).toContainText(`独立交点位置：${positions}；相交线段对：${intersections.length}`)
  const reportedPairs = (await result.locator('p').filter({ hasNotText: /^独立数学核对：/ }).allTextContents()).join('\n')
  expect(reportedPairs.match(/S\d+ × S\d+/g)?.sort()).toEqual(intersections.map(pairName).sort())
  expect(trace.steps.at(-1)!.results).toEqual(intersections)
  await expect(page.getByTestId('active-order')).toHaveText('空')
  await expect(page.getByRole('region', { name: '待处理事件队列' }).getByRole('listitem')).toHaveCount(0)
  await page.getByRole('button', { name: '重新开始', exact: true }).click()
  await expect(slider).toHaveValue('0')
}
