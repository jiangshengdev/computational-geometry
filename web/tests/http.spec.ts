import { expect, test } from '@playwright/test'

const r = (numerator: string, denominator = '1') => ({ numerator, denominator })
const p = (x: ReturnType<typeof r>, y = r('0')) => ({ x, y })

test('HTTP 接受目录外集合，保留超安全整数分数及配对身份', async ({ request }) => {
  const point = p(r('9007199254740993', '9007199254740997'), r('-2', '3'))
  const response = await request.post('/api/intersections', { data: {
    segments: [{ start: point, end: point }, { start: point, end: point }],
  } })
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ intersections: [{ segments: [0, 1], geometry: { type: 'point', point } }] })
})

test('HTTP 返回完整重叠区间，规范化保持数学值', async ({ request }) => {
  const response = await request.post('/api/intersections', { data: { segments: [
    { start: p(r('0')), end: p(r('6', '2')) },
    { start: p(r('-2', '-2')), end: p(r('4')) },
  ] } })
  expect(response.status()).toBe(200)
  const { intersections } = await response.json()
  expect(intersections).toHaveLength(1)
  expect(intersections[0].segments).toEqual([0, 1])
  expect(intersections[0].geometry.type).toBe('overlap')
  expect([intersections[0].geometry.start, intersections[0].geometry.end]).toEqual(expect.arrayContaining([p(r('1')), p(r('3'))]))
})

test('HTTP 合法空集成功，非法结构、整数及零分母明确失败', async ({ request }) => {
  const empty = await request.post('/api/intersections', { data: { segments: [] } })
  expect(empty.status()).toBe(200)
  expect(await empty.json()).toEqual({ intersections: [] })
  for (const data of [{}, { segments: null }, ...[r('1', '0'), r('1', '-00'), r('1.5'), r('1e3'), r(' 1'), { numerator: 1, denominator: '1' }].map(x => ({ segments: [{ start: { x, y: r('0') }, end: p(r('0')) }] }))]) {
    const response = await request.post('/api/intersections', { data })
    expect(response.status()).toBe(400)
    expect((await response.json()).error).toEqual(expect.any(String))
  }
  const malformed = await request.post('/api/intersections', { data: '{', headers: { 'Content-Type': 'application/json' } })
  expect(malformed.status()).toBe(400)
})
