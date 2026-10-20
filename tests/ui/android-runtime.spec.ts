import { test, expect } from '@playwright/test'
import { go,completeDaily } from './helpers'

test('缺少 Intl 的运行环境可打开首页、提交学习并查看复习日期', async ({ page }) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, 'Intl', { configurable: true, value: undefined })
    for (const name of ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'] as const) {
      Date.prototype[name] = () => { throw new Error('Locale API unavailable') }
    }
  })
  await go(page, 'home')
  await expect(page.locator('.home-date')).toHaveText(/\d+月\d+日周[日一二三四五六]/)
  await page.locator('.hero-cta').click()
  await completeDaily(page)
  await go(page, 'review')
  await page.locator('.mode-button').filter({ hasText: '所有单词' }).click()
  const row=page.locator('.review-row').filter({hasText:'cat'})
  await expect(row).toContainText(/(今天|明天|下周|\d+ 天后)/)
  await row.locator('.wordbook-open').click()
  await expect(page.locator('.word-detail-panel')).toContainText(/复习日期 \d{4}\/\d+\/\d+/)
  expect(errors).toEqual([])
})
