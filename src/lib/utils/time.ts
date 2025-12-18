/**
 * 时间处理工具函数
 *
 * 重要：后端返回的时间是 UTC 时间，前端显示时必须转换为本地时间
 * 参考: frontend-vue/FRONTEND_RULES.md 时间处理规范
 */

/**
 * 格式化时间为本地时间字符串
 *
 * 后端 API 返回的时间字符串格式为 `2025-12-16T07:44:42.406969`（无时区标识），这是 UTC 时间。
 * JavaScript 的 `new Date()` 在解析无时区标识的时间字符串时，会将其视为本地时间而非 UTC 时间，
 * 导致显示时间比实际少 8 小时（北京时间 UTC+8）。
 *
 * 解决方案：为无时区标识的时间字符串添加 `Z` 后缀，表示这是 UTC 时间。
 *
 * @param time - 时间字符串 (UTC时间，无时区标识)
 * @returns 格式化后的本地时间字符串，如 "2025/12/16 15:44"
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '-'

  // 如果时间字符串没有时区标识，添加 Z 后缀表示 UTC 时间
  const utcTime = time.endsWith('Z') || time.includes('+') ? time : time + 'Z'

  return new Date(utcTime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 格式化日期（不包含时间）
 *
 * @param date - 日期字符串 (UTC时间)
 * @returns 格式化后的日期字符串，如 "2025/12/16"
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'

  // 如果时间字符串没有时区标识，添加 Z 后缀表示 UTC 时间
  const utcTime = date.endsWith('Z') || date.includes('+') ? date : date + 'Z'

  return new Date(utcTime).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 格式化相对时间（如 "3分钟前"、"2小时前"）
 *
 * @param time - 时间字符串 (UTC时间)
 * @returns 相对时间字符串
 */
export function formatRelativeTime(time: string | null | undefined): string {
  if (!time) return '-'

  // 如果时间字符串没有时区标识，添加 Z 后缀表示 UTC 时间
  const utcTime = time.endsWith('Z') || time.includes('+') ? time : time + 'Z'
  const date = new Date(utcTime)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return formatDate(time)
  } else if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
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
