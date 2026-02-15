/**
 * 转写文本查看器组件
 * 聊天气泡样式展示，支持时间同步高亮和点击跳转
 */

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { TranscriptSegment } from '../../types'

interface TranscriptViewerProps {
  transcript: TranscriptSegment[]
  currentTime?: number
  onSeek?: (time: number) => void
}

/**
 * 格式化时间为 MM:SS 格式
 */
function formatTimeDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 判断是否为员工消息
 */
function isStaffMessage(speaker: string): boolean {
  const lowerSpeaker = speaker.toLowerCase()
  return (
    lowerSpeaker.includes('agent') ||
    lowerSpeaker.includes('员工') ||
    lowerSpeaker.includes('staff') ||
    lowerSpeaker === '0'
  )
}

export function TranscriptViewer({ transcript, currentTime = 0, onSeek }: TranscriptViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  // 找到当前播放位置对应的段落
  const activeIndex = transcript.findIndex(
    (seg) => currentTime >= seg.start_time && currentTime < seg.end_time
  )

  // 自动滚动到当前播放的段落
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeIndex])

  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        暂无转写文本
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-y-auto overscroll-contain"
    >
      <div className="flex flex-col gap-3 p-4">
        {transcript.map((segment, index) => {
          const isActive = index === activeIndex
          const isStaff = isStaffMessage(segment.speaker)

          return (
            <button
              key={index}
              type="button"
              ref={isActive ? activeRef : undefined}
              className={cn(
                'flex flex-col max-w-[85%] cursor-pointer transition-all text-left',
                isStaff ? 'self-end items-end' : 'self-start items-start'
              )}
              onClick={() => onSeek?.(segment.start_time)}
              aria-label={`跳转到 ${formatTimeDisplay(segment.start_time)}，${isStaff ? '员工' : '客户'}发言`}
            >
              {/* 说话人标签和时间 */}
              <div
                className={cn(
                  'flex items-center gap-2 mb-1 text-xs text-muted-foreground',
                  isStaff ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <span className="font-medium">
                  {isStaff ? '员工' : '客户'}
                </span>
                <span>{formatTimeDisplay(segment.start_time)}</span>
              </div>

              {/* 气泡消息 */}
              <div
                className={cn(
                  'relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                  isStaff
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md',
                  isActive && 'ring-2 ring-primary/50 ring-offset-1'
                )}
              >
                {segment.text}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
