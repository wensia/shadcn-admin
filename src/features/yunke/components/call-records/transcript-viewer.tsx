/**
 * 转写文本查看器组件
 * 支持时间同步高亮和点击跳转
 */

import { useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
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
 * 获取说话人标签样式
 */
function getSpeakerStyle(speaker: string): { label: string; className: string } {
  const lowerSpeaker = speaker.toLowerCase()

  if (lowerSpeaker.includes('agent') || lowerSpeaker.includes('员工') || lowerSpeaker === '0') {
    return {
      label: '员工',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    }
  }

  if (lowerSpeaker.includes('customer') || lowerSpeaker.includes('客户') || lowerSpeaker === '1') {
    return {
      label: '客户',
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
  }

  return {
    label: speaker,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  }
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
    <ScrollArea className="h-full" ref={containerRef}>
      <div className="space-y-3 p-4">
        {transcript.map((segment, index) => {
          const isActive = index === activeIndex
          const { label, className } = getSpeakerStyle(segment.speaker)

          return (
            <div
              key={index}
              ref={isActive ? activeRef : undefined}
              className={cn(
                'group rounded-lg p-3 transition-colors cursor-pointer hover:bg-muted/50',
                isActive && 'bg-primary/10 ring-1 ring-primary/20'
              )}
              onClick={() => onSeek?.(segment.start_time)}
            >
              {/* 头部：说话人和时间 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded',
                    className
                  )}
                >
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeDisplay(segment.start_time)} - {formatTimeDisplay(segment.end_time)}
                </span>
              </div>

              {/* 文本内容 */}
              <p
                className={cn(
                  'text-sm leading-relaxed',
                  isActive && 'text-primary font-medium'
                )}
              >
                {segment.text}
              </p>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
