type DateValue = Date | string | number
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function asDate(value: DateValue): Date | undefined {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// App logic runtimes may omit Intl. Use local Date fields on every platform.
export function formatHomeDate(value: DateValue = new Date()): string {
  const date = asDate(value)
  return date ? `${date.getMonth() + 1}月${date.getDate()}日${weekdays[date.getDay()]}` : '日期待更新'
}

export function formatLocalDate(value: DateValue): string {
  const date = asDate(value)
  return date ? `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}` : '日期待更新'
}

export function formatLocalDateTime(value: DateValue): string {
  const date = asDate(value)
  if (!date) return '日期待更新'
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${formatLocalDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
