/**
 * CallTimer 组件
 * 独立管理通话计时器状态，避免计时器更新导致父组件重新渲染
 */

import { useState, useEffect, useRef } from 'react'

interface CallTimerProps {
  /** 通话开始时间（时间戳） */
  startTime: number | null
  /** 自定义样式 */
  style?: React.CSSProperties
}

export function CallTimer({ startTime, style }: CallTimerProps) {
  const [duration, setDuration] = useState('00:00')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (startTime) {
      // 启动计时器
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const minutes = Math.floor(elapsed / 60)
        const seconds = elapsed % 60
        setDuration(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      }, 1000)
    } else {
      // 重置计时器
      setDuration('00:00')
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [startTime])

  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{duration}</span>
}
