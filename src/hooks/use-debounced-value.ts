/**
 * useDebouncedValue Hook
 * 用于对值进行防抖处理,常用于搜索输入等场景
 */

import { useEffect, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 设置定时器
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 清理函数:当value变化时,清除之前的定时器
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
