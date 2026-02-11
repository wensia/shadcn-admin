/**
 * 时间处理工具函数
 *
 * 重要：后端返回的时间是 UTC 时间，前端显示时必须转换为本地时间
 *
 * 后端 API 返回的时间字符串格式为 `2025-12-16T07:44:42.406969`（无时区标识），
 * 这是 UTC 时间。JavaScript 的 `new Date()` 在解析无时区标识的时间字符串时，
 * 会将其视为本地时间而非 UTC 时间，导致显示时间比实际少 8 小时（北京时间 UTC+8）。
 * 解决方案：为无时区标识的时间字符串添加 `Z` 后缀，表示这是 UTC 时间。
 */

/**
 * 确保时间字符串包含 UTC 时区标识
 */
function ensureUtc(time: string): string {
  if (time.endsWith('Z') || time.includes('+')) return time
  return time + 'Z'
}

/**
 * 格式化时间为本地时间字符串
 * @returns 如 "2025/12/16 15:44"
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '-'
  return new Date(ensureUtc(time)).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 格式化日期（不包含时间）
 * @returns 如 "2025/12/16"
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(ensureUtc(date)).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 格式化相对时间（如 "3分钟前"、"2小时前"）
 */
export function formatRelativeTime(time: string | null | undefined): string {
  if (!time) return '-'

  const date = new Date(ensureUtc(time))
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) return formatDate(time)
  if (days > 0) return `${days}天前`
  if (hours > 0) return `${hours}小时前`
  if (minutes > 0) return `${minutes}分钟前`
  return '刚刚'
}

/**
 * 将本地时间转换为UTC时间字符串（用于发送到后端）
 *
 * @param localTime - 本地时间字符串或Date对象
 * @returns UTC时间字符串（ISO 8601格式，无时区标识）
 */
export function toUTCString(localTime: string | Date): string {
  const date = typeof localTime === 'string' ? new Date(localTime) : localTime
  return date.toISOString().replace('Z', '')
}
