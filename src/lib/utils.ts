import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 格式化日期时间
 * @param date - 日期字符串或 Date 对象
 * @param options - 格式化选项
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: {
    showTime?: boolean
    format?: 'short' | 'long'
  } = {}
): string {
  if (!date) return '-'

  const { showTime = true, format = 'short' } = options
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) return '-'

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  if (!showTime) {
    return format === 'long' ? `${year}年${month}月${day}日` : `${year}-${month}-${day}`
  }

  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return format === 'long'
    ? `${year}年${month}月${day}日 ${hours}:${minutes}`
    : `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 复制文本到剪贴板（兼容HTTP环境）
 * 优先使用 navigator.clipboard API，不可用时降级到 execCommand
 * @param text - 要复制的文本
 * @returns Promise<boolean> - 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 优先尝试使用现代 Clipboard API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Clipboard API 失败，降级到 execCommand
    }
  }

  // 降级方案：使用 execCommand (兼容HTTP环境)
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    // 避免滚动到底部
    textArea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent;'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch {
    return false
  }
}

/**
 * 生成分页页码数组（含省略号）
 * @param currentPage - 当前页码 (1-based)
 * @param totalPages - 总页数
 * @returns 页码和省略号数组
 *
 * 示例:
 * - 少页 (<=5): [1, 2, 3, 4, 5]
 * - 靠前: [1, 2, 3, 4, '...', 10]
 * - 居中: [1, '...', 4, 5, 6, '...', 10]
 * - 靠后: [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
}
