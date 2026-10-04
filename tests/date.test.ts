import test from 'node:test'
import assert from 'node:assert/strict'
import { formatHomeDate, formatLocalDate, formatLocalDateTime } from '../src/services/date'
import { FSRSScheduler, newCard } from '../packages/srs_fsrs'

test('日期展示与复习排程在缺少 Intl 和 locale 方法的基座中正常工作', () => {
  const intl = Object.getOwnPropertyDescriptor(globalThis, 'Intl')!
  const dateMethods = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'] as const
  const originals = dateMethods.map(name => Date.prototype[name])
  const localeCompare = String.prototype.localeCompare
  try {
    Object.defineProperty(globalThis, 'Intl', { configurable: true, value: undefined })
    for (const name of dateMethods) Date.prototype[name] = () => { throw new Error('Locale API unavailable') }
    String.prototype.localeCompare = () => { throw new Error('Locale API unavailable') }
    const now = new Date(2026, 9, 3, 9, 5, 7)
    assert.equal(formatHomeDate(now), '10月3日周六')
    assert.equal(formatLocalDate(now), '2026/10/3')
    assert.equal(formatLocalDateTime(now.toISOString()), '2026/10/3 09:05:07')
    const old = newCard('cat', new Date(+now - 2000))
    const recent = newCard('dog', new Date(+now - 1000))
    const future = newCard('sun', new Date(+now + 1000))
    const scheduler = new FSRSScheduler([recent, future, old])
    assert.deepEqual(scheduler.getDueCards(now).map(card => card.wordId), ['cat', 'dog'])
    assert.equal(scheduler.schedule(old, 3, now).card.reps, 1)
  } finally {
    Object.defineProperty(globalThis, 'Intl', intl)
    dateMethods.forEach((name, index) => { Date.prototype[name] = originals[index] })
    String.prototype.localeCompare = localeCompare
  }
})

test('日期格式覆盖跨年、所有星期和异常值', () => {
  assert.equal(formatHomeDate(new Date(2027, 0, 1)), '1月1日周五')
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  week.forEach((label, day) => assert.equal(formatHomeDate(new Date(2026, 9, 4 + day)), `10月${4 + day}日${label}`))
  for (const format of [formatHomeDate, formatLocalDate, formatLocalDateTime]) {
    assert.equal(format('invalid'), '日期待更新')
    assert.equal(format(new Date(NaN)), '日期待更新')
  }
})
