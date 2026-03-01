/**
 * useTableScroll - 动态计算表格 scroll.y 高度
 * 使用 ResizeObserver 监听容器尺寸变化，自动扣除表头高度
 */

import { useRef, useState, useEffect, useCallback } from 'react'

interface UseTableScrollOptions {
  /** 默认 scroll.y，在 ResizeObserver 未测量前使用 */
  defaultScrollY?: number
}

export function useTableScroll(options?: UseTableScrollOptions) {
  const { defaultScrollY = 400 } = options ?? {}
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState<number>(defaultScrollY)

  const measure = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    const headerHeight =
      el.querySelector('.semi-table-thead')?.getBoundingClientRect().height ?? 47
    const available = el.clientHeight - headerHeight
    if (available > 100) setScrollY(available)
  }, [])

  useEffect(() => {
    measure()
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  return { wrapperRef, scrollY }
}
