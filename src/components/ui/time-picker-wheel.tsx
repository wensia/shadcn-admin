/**
 * 滚轮时间选择器组件
 * 类似 iOS 风格的滚动选择小时和分钟
 * 支持鼠标拖动、滚轮滚动、点击选择
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TimePickerWheelProps {
  value: string // HH:mm 格式
  onChange: (value: string) => void
  className?: string
  /** 组件高度，默认 280px 匹配日历高度 */
  height?: number
}

// 生成小时选项 (6-22)
const hours = Array.from({ length: 17 }, (_, i) => i + 6)
// 生成分钟选项 (0, 15, 30, 45)
const minutes = [0, 15, 30, 45]

interface WheelColumnProps {
  options: number[]
  value: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  height?: number
}

function WheelColumn({ options, value, onChange, formatValue = (v) => String(v).padStart(2, '0'), height = 280 }: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const itemHeight = 36
  const visibleItems = Math.floor(height / itemHeight)
  const paddingItems = Math.floor(visibleItems / 2)

  // 拖动状态
  const isDragging = React.useRef(false)
  const startY = React.useRef(0)
  const startScrollTop = React.useRef(0)

  // 滚动到选中项
  React.useEffect(() => {
    const container = containerRef.current
    if (!container || isDragging.current) return

    const index = options.indexOf(value)
    if (index !== -1) {
      container.scrollTop = index * itemHeight
    }
  }, [value, options])

  // 滚动结束后吸附到最近的选项
  const snapToNearest = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const scrollTop = container.scrollTop
    const index = Math.round(scrollTop / itemHeight)
    const clampedIndex = Math.max(0, Math.min(index, options.length - 1))

    // 平滑滚动到对齐位置
    container.scrollTo({
      top: clampedIndex * itemHeight,
      behavior: 'smooth'
    })

    if (options[clampedIndex] !== value) {
      onChange(options[clampedIndex])
    }
  }, [options, value, onChange])

  // 鼠标按下开始拖动
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startScrollTop.current = containerRef.current?.scrollTop ?? 0

    // 阻止文本选择
    e.preventDefault()
  }, [])

  // 鼠标移动时拖动
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return

      const deltaY = startY.current - e.clientY
      containerRef.current.scrollTop = startScrollTop.current + deltaY
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        snapToNearest()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [snapToNearest])

  // 滚轮滚动
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const container = containerRef.current
    if (!container) return

    container.scrollTop += e.deltaY
  }, [])

  // 滚轮滚动结束后吸附
  const scrollEndTimer = React.useRef<NodeJS.Timeout>()
  const handleScroll = React.useCallback(() => {
    // 清除之前的定时器
    if (scrollEndTimer.current) {
      clearTimeout(scrollEndTimer.current)
    }

    // 设置新的定时器，滚动停止 150ms 后吸附
    scrollEndTimer.current = setTimeout(() => {
      if (!isDragging.current) {
        snapToNearest()
      }
    }, 150)
  }, [snapToNearest])

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (scrollEndTimer.current) {
        clearTimeout(scrollEndTimer.current)
      }
    }
  }, [])

  // 点击选项
  const handleItemClick = (option: number) => {
    onChange(option)
    const container = containerRef.current
    if (container) {
      const index = options.indexOf(option)
      container.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      })
    }
  }

  const gradientHeight = Math.floor(height / 3)

  return (
    <div className="relative w-16 overflow-hidden" style={{ height }}>
      {/* 选中区域高亮 */}
      <div
        className="pointer-events-none absolute left-1 right-1 top-1/2 z-10 -translate-y-1/2 rounded-md border bg-accent/50"
        style={{ height: itemHeight }}
      />
      {/* 上下渐变遮罩 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background to-transparent"
        style={{ height: gradientHeight }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background to-transparent"
        style={{ height: gradientHeight }}
      />

      {/* 滚动容器 - 隐藏滚动条 */}
      <style>{`
        .time-picker-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        ref={containerRef}
        className="time-picker-scroll h-full cursor-grab overflow-y-scroll active:cursor-grabbing"
        style={{
          paddingTop: paddingItems * itemHeight,
          paddingBottom: paddingItems * itemHeight,
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onScroll={handleScroll}
      >
        {options.map((option) => (
          <div
            key={option}
            className={cn(
              'flex cursor-pointer items-center justify-center text-base transition-all select-none',
              option === value ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground/70'
            )}
            style={{ height: itemHeight }}
            onClick={() => handleItemClick(option)}
          >
            {formatValue(option)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimePickerWheel({ value, onChange, className, height = 280 }: TimePickerWheelProps) {
  const [hour, minute] = React.useMemo(() => {
    const [h, m] = value.split(':').map(Number)
    return [isNaN(h) ? 10 : h, isNaN(m) ? 0 : m]
  }, [value])

  const handleHourChange = React.useCallback((newHour: number) => {
    onChange(`${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }, [minute, onChange])

  const handleMinuteChange = React.useCallback((newMinute: number) => {
    onChange(`${String(hour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`)
  }, [hour, onChange])

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <WheelColumn
        options={hours}
        value={hour}
        onChange={handleHourChange}
        height={height}
      />
      <span className="text-lg font-medium text-muted-foreground">:</span>
      <WheelColumn
        options={minutes}
        value={minute}
        onChange={handleMinuteChange}
        height={height}
      />
    </div>
  )
}
