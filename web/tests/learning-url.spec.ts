import { expect, test, expandedPanels, type Page } from './learning-test'
import { readTrace, stepIndex } from './trace-navigation'

async function expectStep(page: Page, step: number) {
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(step))
  await expect.poll(() => new URL(page.url()).searchParams.get('step')).toBe(String(step))
}

for (const browserName of ['chromium', 'firefox', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`教学步骤 URL：按住方向键实时预览，释放提交且立即刷新恢复 ${browserName}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const trace = await readTrace(page, 'crossing')
    const target = 121
    expect(trace.steps.length).toBeGreaterThan(target + 1)
    await page.goto('/cases/crossing/learn?step=0')
    const slider = page.getByRole('slider', { name: '教学步骤' })
    await expect(slider).toHaveValue('0')
    await slider.focus()
    // A held key previews every native repeat without committing browser history.
    try {
      for (let index = 1; index <= target; index++) {
        await page.keyboard.down('ArrowRight')
        await expect(slider).toHaveValue(String(index))
        expect(new URL(page.url()).search).toBe('?step=0')
      }
    } finally {
      await page.keyboard.up('ArrowRight')
    }
    expect(new URL(page.url()).searchParams.get('step')).toBe(String(target))
    await expectStep(page, target)
    await expect(page.getByText('加载教学代码…', { exact: true })).toHaveCount(0)
    const content = await page.getByRole('region', { name: '逐步学习' }).innerText()
    expect(errors).toEqual([])
    await page.reload()
    await expectStep(page, target)
    await expect.poll(() => page.getByRole('region', { name: '逐步学习' }).innerText()).toBe(content)
    expect(errors).toEqual([])
    // A normal single step commits on release and survives an immediate reload.
    await slider.press('ArrowRight')
    expect(await slider.inputValue()).toBe(String(target + 1))
    expect(new URL(page.url()).searchParams.get('step')).toBe(String(target + 1))
    await page.reload()
    await expectStep(page, target + 1)
    expect(errors).toEqual([])
  })
}

for (const browserName of ['chromium', 'webkit'] as const) {
  const browserTest = test.extend({ browserName })
  browserTest(`教学步骤 URL：连续拖动预览仅在结束时写入 ${browserName}`, async ({ browser, baseURL }) => {
    const page = await browser.newPage({ baseURL, viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' })
    await expandedPanels(page.context())
    try {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto('/cases/crossing')
      await page.getByRole('link', { name: '开始逐步学习' }).click()
      const slider = page.getByRole('slider', { name: '教学步骤' })
      await expect(slider).toHaveValue('0')
      const thumb = (await page.getByTestId('teaching-step-thumb').boundingBox())!
      const group = (await page.getByRole('group', { name: '教学步骤', exact: true }).boundingBox())!
      const y = thumb.y + thumb.height / 2
      await page.mouse.move(thumb.x + thumb.width / 2, y)
      await page.mouse.down()
      // Drag beyond the endpoint so thumb width cannot leave a narrow slider one step short.
      await page.mouse.move(group.x + group.width + thumb.width, y, { steps: 18 })
      await expect(page.getByRole('region', { name: '学习结果' })).toContainText('I0 (2, 2)')
      await expect(page.getByRole('img', { name: /事件侧向状态/ }).locator('svg.lucide-arrow-right')).toBeVisible()
      expect(new URL(page.url()).searchParams.has('step')).toBe(false)
      for (let i = 0; i < 12; i++) {
        await page.mouse.move(group.x + (i % 2 ? group.width + thumb.width : -thumb.width), y, { steps: 18 })
        if (i % 2) await expect(page.getByRole('img', { name: /事件侧向状态/ }).locator('svg.lucide-arrow-right')).toBeVisible()
        else await expect(page.getByRole('img', { name: /事件侧向状态/ })).toHaveCount(0)
      }
      expect(new URL(page.url()).searchParams.has('step')).toBe(false)
      await page.mouse.up()
      const last = Number(await slider.getAttribute('max'))
      await expectStep(page, last)
      await page.reload()
      await expectStep(page, last)
      await page.goBack()
      await expect(page).toHaveURL(/\/cases\/crossing$/)
      await page.goForward()
      await expectStep(page, last)
      expect(errors).toEqual([])
    } finally {
      await page.close()
    }
  })
}

test('教学步骤 URL：直达、刷新和新标签恢复同一步骤', async ({ page, context }) => {
  const insert = stepIndex(await readTrace(page, 'crossing'), step => step.action === 'insert' && step.subjects.includes(0))
  const path = `/cases/crossing/learn?step=${insert}`
  await page.goto(path)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(insert))
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('加入 S0')
  const content = await page.getByRole('region', { name: '逐步学习' }).innerText()
  await page.reload()
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(insert))
  await expect.poll(() => page.getByRole('region', { name: '逐步学习' }).innerText()).toBe(content)
  const shared = await context.newPage()
  await shared.goto(page.url())
  await expect(shared.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(insert))
  await expect.poll(() => shared.getByRole('region', { name: '逐步学习' }).innerText()).toBe(content)
  await shared.close()
})

for (const width of [1360, 390]) {
  test(`教学步骤 URL：所有控件同步真实内容 ${width}px`, async ({ page }) => {
    const trace = await readTrace(page, 'crossing')
    const insert = stepIndex(trace, step => step.action === 'insert' && step.subjects.includes(0))
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/cases/crossing/learn')
    const slider = page.getByRole('slider', { name: '教学步骤' })
    const next = page.getByRole('button', { name: '下一步', exact: true })
    const previous = page.getByRole('button', { name: '上一步', exact: true })
    await expect(slider).toHaveValue('0')
    await expect(previous).toBeDisabled()
    await next.click()
    await expectStep(page, 1)
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).toContainText('S0 起点 (0, 0)')
    await next.click()
    await expectStep(page, 2)
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('queue.pop_first()')
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('S0 起点 (0, 0)')
    await next.click()
    await expectStep(page, 3)
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('S0 起点 (0, 0)')
    for (let index = 3; index < insert; index++) await next.click()
    await expectStep(page, insert)
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('加入 S0')
    await previous.click()
    await expectStep(page, insert - 1)
    await page.keyboard.press('ArrowRight')
    await expectStep(page, insert)
    await page.keyboard.press('ArrowLeft')
    await expectStep(page, insert - 1)
    await slider.focus()
    await slider.press('End')
    const last = Number(await slider.getAttribute('max'))
    await expectStep(page, last)
    await expect(next).toBeDisabled()
    await expect(page.getByRole('region', { name: '学习结果' })).toContainText('I0 (2, 2)')
    await slider.press('Home')
    await expectStep(page, 0)
    await expect(page.getByRole('region', { name: '学习结果' })).toHaveCount(0)
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('I0')
    await next.click()
    await page.keyboard.press('r')
    await expectStep(page, 0)
    await next.click()
    await page.getByRole('button', { name: '重新开始', exact: true }).click()
    await expectStep(page, 0)
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const source of ['list', 'detail']) {
  test(`教学步骤 URL：从 ${source} 进入后多步仅替换当前历史项`, async ({ page }) => {
    const discover = stepIndex(await readTrace(page, 'crossing'), step => step.action === 'discover')
    await page.goto(source === 'list' ? '/' : '/cases/crossing')
    if (source === 'list') {
      await page.getByRole('article', { name: '普通交叉', exact: true }).getByRole('link', { name: '开始学习', exact: true }).click()
    } else await page.getByRole('link', { name: '开始逐步学习', exact: true }).click()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
    for (let step = 1; step <= discover; step++) {
      await page.getByRole('button', { name: '下一步', exact: true }).click()
      await expectStep(page, step)
    }
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('发现未来交点 I0 (2, 2)')
    await page.goBack()
    await expect(page).toHaveURL(source === 'list' ? '/' : '/cases/crossing')
    if (source === 'list') await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()
    else await expect(page.getByRole('region', { name: '原始输入' })).toBeVisible()
    await page.goForward()
    await expectStep(page, discover)
    await expect(page.getByRole('region', { name: '操作解释' })).toContainText('发现未来交点 I0 (2, 2)')
  })
}

test('教学步骤 URL：前导零是有效整数且不主动改写地址', async ({ page }) => {
  const insert = stepIndex(await readTrace(page, 'crossing'), step => step.action === 'insert' && step.subjects.includes(0))
  const query = `?step=00${insert}`
  await page.goto(`/cases/crossing/learn${query}`)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue(String(insert))
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('加入 S0')
  expect(new URL(page.url()).search).toBe(query)
})

for (const query of ['step=', 'step=-1', 'step=1.5', 'step=abc', 'step=1e2', 'step=%EF%BC%92', 'step=1&step=2', 'step=999999']) {
  test(`教学步骤 URL：非法 ${query} 保留地址并主动恢复`, async ({ page }) => {
    await page.goto(`/cases/crossing/learn?${query}`)
    const error = query === 'step=999999' ? '教学步骤超出范围' : '教学步骤参数无效'
    await expect(page.getByRole('alert')).toContainText(error)
    expect(new URL(page.url()).search).toBe(`?${query}`)
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveCount(0)
    const recovery = page.getByRole('navigation', { name: '恢复导航' })
    await expect(page.getByRole('link', { name: '返回列表', exact: true })).toHaveAttribute('href', '/')
    await expect(recovery.getByRole('link', { name: '查看详情', exact: true })).toHaveAttribute('href', '/cases/crossing')
    await expect(recovery.getByRole('link', { name: '从头学习', exact: true })).toBeVisible()
    await recovery.getByRole('link', { name: '从头学习', exact: true }).click()
    await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveValue('0')
    await expect(page.getByRole('region', { name: '当前事件' })).toContainText('尚未处理事件')
    await expect(page.getByRole('region', { name: '待处理事件队列' })).not.toContainText('I0')
  })
}

test('教学步骤 URL：错误页详情和列表恢复入口实际导航', async ({ page }) => {
  await page.goto('/cases/crossing/learn?step=-1')
  await page.getByRole('navigation', { name: '恢复导航' }).getByRole('link', { name: '查看详情', exact: true }).click()
  await expect(page).toHaveURL(/\/cases\/crossing$/)
  await expect(page.getByText('1 个相交配对', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('alert')).toContainText('教学步骤参数无效')
  await page.getByRole('link', { name: '返回列表', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()
})

test('教学步骤 URL：真实轨迹加载期间不误判有效步骤越界', async ({ page }) => {
  const insert = stepIndex(await readTrace(page, 'crossing'), step => step.action === 'insert' && step.subjects.includes(0))
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/intersections', async route => {
    await gate
    await route.continue()
  })
  await page.goto(`/cases/crossing/learn?step=${insert}`)
  await expect(page.getByRole('status')).toContainText('正在加载教学轨迹')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveCount(0)
  expect(new URL(page.url()).search).toBe(`?step=${insert}`)
  release()
  await expectStep(page, insert)
  await expect(page.getByRole('region', { name: '操作解释' })).toContainText('加入 S0')
})

test('教学步骤 URL：请求失败保持计算错误而不误报越界', async ({ page }) => {
  await page.route('**/api/intersections', async route => {
    const response = await route.fetch()
    await route.fulfill({ response, status: 500 })
  })
  await page.goto('/cases/crossing/learn?step=999999')
  await expect(page.getByRole('alert')).toContainText('计算失败')
  await expect(page.getByRole('alert')).toContainText('HTTP 500')
  await expect(page.getByRole('alert')).not.toContainText('教学步骤超出范围')
  expect(new URL(page.url()).search).toBe('?step=999999')
})

for (const late of ['success', 'failure']) for (const destination of ['valid', 'invalid']) {
  test(`教学步骤 URL：迟到 ${late} 不覆盖当前 ${destination} 案例步骤`, async ({ page }) => {
    const insert = stepIndex(await readTrace(page, 'crossing'), step => step.action === 'insert' && step.subjects.includes(0))
    await page.addInitScript(() => {
      const original = window.fetch
      window.fetch = (input, init) => original(input, { ...init, signal: undefined })
    })
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const pending: Promise<void>[] = []
    await page.route('**/api/intersections', async route => {
      if (route.request().postDataJSON().segments.length !== 3) return route.continue()
      const operation = (async () => {
        const response = await route.fetch()
        await gate
        await route.fulfill({ response, status: late === 'failure' ? 500 : response.status() })
      })()
      pending.push(operation)
      await operation
    })
    const step = destination === 'valid' ? insert : 999999
    await page.goto(`/cases/crossing/learn?step=${step}`)
    if (destination === 'valid') await expectStep(page, insert)
    else await expect(page.getByRole('alert')).toContainText('教学步骤超出范围')
    await page.getByRole('link', { name: '返回列表', exact: true }).click()
    await page.getByRole('article', { name: '退出后成为邻居', exact: true }).getByRole('link', { name: '开始学习', exact: true }).click()
    await expect.poll(() => pending.length).toBeGreaterThan(0)
    await expect(page.getByRole('status')).toContainText('正在加载教学轨迹')
    await page.goBack()
    await expect(page.getByRole('region', { name: '案例列表' })).toBeVisible()
    await page.goBack()
    if (destination === 'valid') await expectStep(page, insert)
    else await expect(page.getByRole('alert')).toContainText('教学步骤超出范围')
    release()
    await Promise.all(pending)
    await expect(page).toHaveURL(`/cases/crossing/learn?step=${step}`)
    if (destination === 'valid') {
      await expectStep(page, insert)
      await expect(page.getByRole('region', { name: '操作解释' })).toContainText('加入 S0')
      await expect(page.getByRole('alert')).toHaveCount(0)
    } else {
      await expect(page.getByRole('alert')).toContainText('教学步骤超出范围')
      await expect(page.getByRole('slider', { name: '教学步骤' })).toHaveCount(0)
    }
  })
}
