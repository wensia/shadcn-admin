/**
 * 滚轮时间选择器组件
 * 类似 iOS 风格的滚动选择小时和分钟
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TimePickerWheelProps {
  value: string // HH:mm 格式
  onChange: (value: string) => void
  className?: string
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
}

function WheelColumn({ options, value, onChange, formatValue = (v) => String(v).padStart(2, '0') }: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const itemHeight = 32
  const visibleItems = 5
  const paddingItems = Math.floor(visibleItems / 2)

  // 滚动到选中项
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const index = options.indexOf(value)
    if (index !== -1) {
      container.scrollTop = index * itemHeight
    }
  }, [value, options])

  // 处理滚动结束
  const handleScroll = React.useCallback(() => {
    const container = containerRef.current
    if (!container) return

    // 使用 requestAnimationFrame 确保滚动结束后计算
    requestAnimationFrame(() => {
      const scrollTop = container.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(index, options.length - 1))

      if (options[clampedIndex] !== value) {
        onChange(options[clampedIndex])
      }
    })
  }, [options, value, onChange])

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

  return (
    <div className="relative h-[160px] w-16 overflow-hidden">
      {/* 选中区域高亮 */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 h-8 -translate-y-1/2 rounded border bg-accent/50"
      />
      {/* 上下渐变遮罩 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-background to-transparent" />

      {/* 滚动容器 */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-none"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: paddingItems * itemHeight,
          paddingBottom: paddingItems * itemHeight,
        }}
        onScroll={handleScroll}
        onWheel={(e) => e.stopPropagation()}
      >
        {options.map((option) => (
          <div
            key={option}
            className={cn(
              'flex h-8 cursor-pointer items-center justify-center text-sm transition-all',
              'scroll-snap-align-center',
              option === value ? 'font-semibold text-foreground' : 'text-muted-foreground'
            )}
            style={{ scrollSnapAlign: 'center' }}
            onClick={() => handleItemClick(option)}
          >
            {formatValue(option)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TimePickerWheel({ value, onChange, className }: TimePickerWheelProps) {
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
      />
      <span className="text-lg font-medium">:</span>
      <WheelColumn
        options={minutes}
        value={minute}
        onChange={handleMinuteChange}
      />
    </div>
  )
}
