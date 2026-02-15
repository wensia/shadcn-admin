/**
 * DISC 问题卡片 - 移动端优化 + Anthropic 品牌配色
 */

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { DISCQuestion, DISCAnswer } from '../types'

interface DiscQuestionCardProps {
  question: DISCQuestion
  answer: DISCAnswer
  onAnswer: (answer: DISCAnswer) => void
}

export function DiscQuestionCard({
  question,
  answer,
  onAnswer,
}: DiscQuestionCardProps) {
  const handleMost = (index: number) => {
    if (answer.most === index) {
      onAnswer({ ...answer, most: null })
    } else if (answer.least === index) {
      onAnswer({ ...answer, most: index, least: null })
    } else {
      onAnswer({ ...answer, most: index })
    }
  }

  const handleLeast = (index: number) => {
    if (answer.least === index) {
      onAnswer({ ...answer, least: null })
    } else if (answer.most === index) {
      onAnswer({ ...answer, least: index, most: null })
    } else {
      onAnswer({ ...answer, least: index })
    }
  }

  return (
    <div>
      {/* 题号与说明 */}
      <div className="mb-4">
        <div
          className="mb-1.5 inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.85)', color: '#141413' }}
        >
          第 {question.id} 题
        </div>
        <p className="mt-2 text-[13px]" style={{ color: '#b0aea5' }}>
          请选择最符合和最不符合你的描述
        </p>
      </div>

      {/* 选项列表 */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isMost = answer.most === index
          const isLeast = answer.least === index
          const isSelected = isMost || isLeast

          return (
            <div
              key={index}
              className={cn(
                'rounded-2xl border-2 p-4 transition-all duration-200',
                !isSelected && 'bg-white'
              )}
              style={
                isMost
                  ? { borderColor: '#788c5d', backgroundColor: 'rgba(120,140,93,0.08)' }
                  : isLeast
                    ? { borderColor: '#c9554a', backgroundColor: 'rgba(201,85,74,0.06)' }
                    : { borderColor: '#e8e6dc' }
              }
            >
              <p
                className="mb-3 text-[15px] leading-relaxed"
                style={{ color: '#141413' }}
              >
                {option.label}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.96]"
                  style={
                    isMost
                      ? { backgroundColor: '#788c5d', color: '#fff', boxShadow: '0 1px 3px rgba(120,140,93,0.3)' }
                      : { backgroundColor: '#e8e6dc', color: '#b0aea5' }
                  }
                  onClick={() => handleMost(index)}
                >
                  {isMost && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  最符合
                </button>
                <button
                  type="button"
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.96]"
                  style={
                    isLeast
                      ? { backgroundColor: '#c9554a', color: '#fff', boxShadow: '0 1px 3px rgba(201,85,74,0.3)' }
                      : { backgroundColor: '#e8e6dc', color: '#b0aea5' }
                  }
                  onClick={() => handleLeast(index)}
                >
                  {isLeast && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  最不符合
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
