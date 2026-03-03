/**
 * DISC 问题卡片
 *
 * Design system: Nature Distilled + Flat hybrid
 *   - Cards: frosted white, soft shadow, no hard borders
 *   - Buttons: pill outline (unselected) → solid fill (selected)
 *   - Touch target ≥ 44px, focus-visible ring, prefers-reduced-motion
 *   - Left accent bar on selected cards
 */

import { cn } from '@/lib/utils'
import { Check, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button as SemiButton } from '@douyinfe/semi-ui-19'
import type { DISCQuestion, DISCAnswer } from '../types'

/* ─── Palette ─── */
const clr = {
  most: { bg: '#788c5d', ring: '#788c5d', tint: 'rgba(120,140,93,0.07)' },
  least: { bg: '#c9554a', ring: '#c9554a', tint: 'rgba(201,85,74,0.06)' },
} as const

interface Props {
  question: DISCQuestion
  answer: DISCAnswer
  onAnswer: (a: DISCAnswer) => void
}

export function DiscQuestionCard({ question, answer, onAnswer }: Props) {
  const toggle = (kind: 'most' | 'least', idx: number) => {
    const other = kind === 'most' ? 'least' : 'most'
    if (answer[kind] === idx) return onAnswer({ ...answer, [kind]: null })
    if (answer[other] === idx) return onAnswer({ ...answer, [kind]: idx, [other]: null })
    onAnswer({ ...answer, [kind]: idx })
  }

  return (
    <div className="space-y-6">
      {/* ── 题头 ── */}
      <header>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-[#3d3d3a] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            {question.id} / 24
          </span>
          {question.category && (
            <span className="inline-flex items-center rounded-full bg-[#0064FA]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0064FA]">
              {question.category}
            </span>
          )}
        </div>

        {question.scenario && (
          <p className="text-[15px] font-medium leading-[1.75] text-[#2c2c2a]">
            {question.scenario}
          </p>
        )}

      </header>

      {/* ── 选项 ── */}
      <div className="space-y-3">
        {question.options.map((opt, i) => {
          const isMost = answer.most === i
          const isLeast = answer.least === i
          const active = isMost || isLeast

          return (
            <div
              key={i}
              className={cn(
                'relative rounded-2xl p-4 transition-all duration-200',
                'motion-reduce:transition-none',
                active
                  ? 'shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'bg-white/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]',
              )}
              style={
                active
                  ? { backgroundColor: isMost ? clr.most.tint : clr.least.tint }
                  : undefined
              }
            >
              {/* 左色条 */}
              {active && (
                <div
                  className="absolute inset-y-2 left-0 w-[3px] rounded-full"
                  style={{ backgroundColor: isMost ? clr.most.bg : clr.least.bg }}
                />
              )}

              {/* 选项文字 */}
              <p className="mb-3 text-[14px] leading-[1.75] text-[#2c2c2a]">
                {opt.label}
              </p>

              {/* 按钮组 */}
              <div className="flex gap-2.5">
                <ActionBtn
                  active={isMost}
                  kind="most"
                  onClick={() => toggle('most', i)}
                />
                <ActionBtn
                  active={isLeast}
                  kind="least"
                  onClick={() => toggle('least', i)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── 最符合 / 最不符合 按钮 ── */
function ActionBtn({
  active,
  kind,
  onClick,
}: {
  active: boolean
  kind: 'most' | 'least'
  onClick: () => void
}) {
  const c = clr[kind]
  const label = kind === 'most' ? '最符合' : '最不符合'
  const Icon = kind === 'most' ? ThumbsUp : ThumbsDown

  return (
    <SemiButton
      theme="solid"
      onClick={onClick}
      className={cn(
        // 基础：pill, 44px 触控高度, flex 居中
        'flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium',
        // 过渡 + 点按
        'transition-all duration-200 active:scale-[0.96]',
        'motion-reduce:transition-none motion-reduce:active:scale-100',
        // focus-visible
        'outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        active
          ? 'text-white shadow-sm'
          : [
              // 未选中：白底 + 描边 + 可读文字
              'bg-white text-[#7a7a74]',
              'ring-1 ring-inset ring-black/[0.08]',
              kind === 'most'
                ? 'hover:bg-[#788c5d]/[0.06] hover:text-[#5e7043] hover:ring-[#788c5d]/25'
                : 'hover:bg-[#c9554a]/[0.06] hover:text-[#a8433a] hover:ring-[#c9554a]/25',
            ],
      )}
      style={
        active
          ? { backgroundColor: c.bg, boxShadow: `0 2px 6px ${c.bg}33` }
          : undefined
      }
    >
      {active ? (
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      ) : (
        <Icon className="h-3 w-3 opacity-30" />
      )}
      {label}
    </SemiButton>
  )
}
