import { expect, test } from './learning-test'
import { captureIntersections, waitForTraceCompletion } from './trace-navigation'

test('轨迹捕获保留渐进回放并来自页面实际消费的请求', async ({ page }) => {
  test.setTimeout(60_000)
  const capture = await captureIntersections(page)
  let captured = false
  void capture.result.then(() => { captured = true }, () => {})
  const response = page.waitForResponse(response => response.url().endsWith('/api/intersections') && response.ok())
  await page.goto('/cases/fullerene/learn')
  const learning = await response
  const controls = page.getByRole('region', { name: '回放控制' })
  await expect(controls).toContainText('轨迹生成中')
  const slider = page.getByRole('slider', { name: '教学步骤' })
  await expect(slider).toBeVisible()
  expect(captured).toBe(false)
  await page.getByRole('button', { name: '下一步', exact: true }).click()
  await expect(slider).toHaveValue('1')
  const { trace } = await capture.result
  expect((await capture.response).traceId).toBe(await learning.headerValue('x-trace-id'))
  await waitForTraceCompletion(page)
  await expect(slider).toHaveAttribute('max', String(trace.steps.length - 1))
  await slider.press('End')
  await expect(controls).toContainText('学习完成')
})
