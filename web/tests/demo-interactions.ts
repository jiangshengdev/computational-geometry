import { expect, type Page } from '@playwright/test'
import { formatPoint, pairName, type Intersection } from '../src/geometry'
import { captureIntersections, waitForTraceCompletion } from './trace-navigation'

export async function checkPairSelection(page: Page, sample: Intersection) {
  if (sample.geometry.type !== 'point') throw new Error('演示不应存在意外重叠')
  const radio = page.getByRole('radio', { name: `${pairName(sample)} · 点`, exact: true })
  await radio.click()
  await expect(page.getByRole('region', { name: '精确详情' })).toContainText(formatPoint(sample.geometry.point))
  for (const id of sample.segments) await expect(page.getByRole('img', { name: `输入 S${id}，已选中`, exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: `交集 ${pairName(sample)}，已选中`, exact: true })).toBeVisible()
  await radio.click()
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
  await waitForTraceCompletion(page)
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toHaveValue('0')
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
