import { expect, test } from '../support/learning-test'
import { readTrace } from '../support/trace-navigation'

test('同一步教学切换语言保持代码语句、执行边界和变量展开', async ({ page, browser }) => {
  const trace = await readTrace(page, 'crossing')
  const index = trace.steps.findIndex(step => step.execution.module === 'event' && step.execution.boundary === 1)
  expect(index).toBeGreaterThan(0)
  await page.goto(`/bo/cases/crossing/learn?step=${index}`)
  const code = page.getByRole('region', { name: '核心代码回放', exact: true })
  await expect(code.locator('.code-line').first()).toBeAttached()
  const statements = await code.locator('.code-line').allTextContents()
  const machineLines = (lines: string[]) => lines.map(line => line.replace(/\/\/[^\r\n]*/g, '').trim()).filter(Boolean)
  const variable = page.getByRole('region', { name: '核心变量', exact: true }).getByTestId('variable-segments').filter({ hasText: 'segments: Vec<SweepSegment>' })
  const expand = variable.getByRole('button', { name: 'segments: Vec<SweepSegment>', exact: true })
  if (await expand.getAttribute('aria-expanded') === 'false') await expand.locator('code').first().click()
  await expect(expand).toHaveAttribute('aria-expanded', 'true')
  const value = await variable.locator('dd').innerText()
  const url = page.url()
  let requests = 0
  page.on('request', request => { if (request.url().endsWith('/api/bo/intersections')) requests++ })
  await page.getByRole('button', { name: 'Language / 语言' }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  const englishCode = page.getByRole('region', { name: 'Core code replay', exact: true })
  await expect(englishCode).toContainText('report_cross_line_and_point_pairs')
  await expect(englishCode.locator('.execution-code-scroll')).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Teaching step', exact: true })).toHaveValue(String(index))
  expect(machineLines(await englishCode.locator('.code-line').allTextContents())).toEqual(machineLines(statements))
  const englishVariable = page.getByRole('region', { name: 'Core variables', exact: true }).getByTestId('variable-segments').filter({ hasText: 'segments: Vec<SweepSegment>' })
  await expect(englishVariable.getByRole('button', { name: 'segments: Vec<SweepSegment>', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await expect(englishVariable.locator('dd')).toHaveText(value)
  await expect(page).toHaveURL(url)
  expect(requests).toBe(0)
  await page.goto('/bo/cases/crossing/learn?step=0')
  await page.getByRole('button', { name: /^Function prepare ·/ }).hover()
  const call = page.getByRole('dialog', { name: /^Function prepare ·/ })
  await expect(call).toContainText('segments')
  await expect(call).toContainText('Return value')
  await page.keyboard.press('Escape')
  const recipient = await browser.newContext({ locale: 'zh-CN' })
  try {
    const shared = await recipient.newPage()
    await shared.goto(url)
    await expect(shared.getByRole('slider', { name: '教学步骤', exact: true })).toHaveValue(String(index))
    await expect(shared.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await expect(shared.getByRole('region', { name: '核心代码回放', exact: true })).toContainText('report_cross_line_and_point_pairs')
  } finally { await recipient.close() }
})

test('轨迹生成期间切换语言仍等待原目标，可以取消等待', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch
    window.fetch = async (input, init) => {
      const response = await original(input, init)
      if (!String(input).includes('/api/bo/intersections') || !response.body) return response
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      let pending = ''
      let delivered = false
      const stream = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        async transform(chunk, controller) {
          if (delivered) { controller.enqueue(chunk); return }
          pending += decoder.decode(chunk, { stream: true })
          const end = pending.indexOf('\n')
          if (end < 0) return
          delivered = true
          controller.enqueue(encoder.encode(pending.slice(0, end + 1)))
          await new Promise<void>(resolve => { Object.assign(window, { releaseLanguageTrace: resolve }) })
          controller.enqueue(encoder.encode(pending.slice(end + 1)))
        },
      }))
      return new Response(stream, { status: response.status, headers: response.headers })
    }
  })
  await page.goto('/bo/cases/crossing/learn?step=999999')
  await expect(page.getByRole('status', { name: '步骤等待', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Language / 语言' }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Waiting for a step', exact: true })).toContainText('999999')
  await expect(page).toHaveURL(/step=999999$/)
  await page.getByRole('button', { name: 'Cancel waiting', exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Teaching step', exact: true })).toHaveValue('0')
  await expect(page).toHaveURL(/step=0$/)
  await page.getByRole('link', { name: 'Back to results viewer', exact: true }).click()
})
