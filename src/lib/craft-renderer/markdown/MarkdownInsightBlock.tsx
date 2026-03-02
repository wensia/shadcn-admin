/**
 * MarkdownInsightBlock - DISC 行为洞察卡片，用于 ```insight 代码块
 *
 * 将 JSON 格式的 DISC 维度洞察渲染为视觉化卡片列表。
 * 每张卡片按 DISC 维度着色，支持 **粗体** 文本渲染。
 *
 * 预期 JSON 格式：
 * {
 *   "items": [
 *     {
 *       "dim": "D",
 *       "label": "支配",
 *       "insight": "D维度在压力下从45%飙升至72%，揭示了**潜在的强硬应激反应模式**",
 *       "tag": "压力偏移"
 *     }
 *   ],
 *   "summary": "总体来看，该候选人三图数据差异明显..."
 * }
 *
 * 解析失败时回退到普通代码块。
 */

import * as React from 'react'
import { cn } from '../utils'
import { CodeBlock } from './CodeBlock'

// ── Types ────────────────────────────────────────────────────────────────────

type DiscDim = 'D' | 'I' | 'S' | 'C'

interface InsightItem {
  dim: DiscDim
  label: string
  insight: string
  tag?: string
}

interface InsightData {
  items: InsightItem[]
  summary?: string
}

// ── DISC 颜色映射 ─────────────────────────────────────────────────────────────

const DISC_COLORS: Record<DiscDim, { color: string; bgColor: string; borderColor: string }> = {
  D: { color: '#dc2626', bgColor: '#fff1f0', borderColor: '#dc2626' },
  I: { color: '#ea580c', bgColor: '#fff7e6', borderColor: '#ea580c' },
  S: { color: '#16a34a', bgColor: '#e6fffb', borderColor: '#16a34a' },
  C: { color: '#2563eb', bgColor: '#e6f7ff', borderColor: '#2563eb' },
}

// ── 内联标记解析器（**粗体** / ***风险*** / <mark>标签</mark>）────────────────

function renderWithBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|<mark>[^<]*<\/mark>)/g)
  return parts.map((part, i) => {
    if (part.startsWith('***') && part.endsWith('***')) {
      return (
        <strong key={i} style={{ fontWeight: 600, fontStyle: 'normal', color: 'var(--destructive)', opacity: 0.85 }}>
          {part.slice(3, -3)}
        </strong>
      )
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
      return (
        <mark key={i} className="bg-primary/10 text-primary font-medium text-[0.9em] px-1.5 py-0.5 rounded-[4px]"
              style={{ textDecoration: 'none' }}>
          {part.slice(6, -7)}
        </mark>
      )
    }
    return part
  })
}

// ── 单张洞察卡片 ──────────────────────────────────────────────────────────────

function InsightCard({ item }: { item: InsightItem }) {
  const colors = DISC_COLORS[item.dim] ?? DISC_COLORS['D']

  return (
    <div
      className="flex gap-0 rounded-[6px] overflow-hidden"
      style={{
        border: `1px solid ${colors.borderColor}22`,
        background: colors.bgColor,
      }}
    >
      {/* 左侧色条 */}
      <div
        className="w-[3px] shrink-0"
        style={{ background: colors.color }}
      />

      {/* 内容区 */}
      <div className="flex-1 px-3 py-2.5 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {/* 维度徽章 */}
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[11px] font-semibold leading-none shrink-0"
            style={{
              color: colors.color,
              background: `${colors.color}18`,
            }}
          >
            <span className="font-bold">{item.dim}</span>
            <span className="font-medium opacity-80">{item.label}</span>
          </span>

          {/* 偏移类型标签 */}
          {item.tag && (
            <span
              className="text-[11px] leading-none px-1.5 py-0.5 rounded-[4px] font-medium shrink-0"
              style={{
                color: colors.color,
                background: `${colors.color}10`,
              }}
            >
              {item.tag}
            </span>
          )}
        </div>

        {/* 洞察文本 */}
        <p
          className="text-[13px] leading-[1.55] m-0"
          style={{ color: 'var(--semi-color-text-1, #646a73)' }}
        >
          {renderWithBold(item.insight)}
        </p>
      </div>
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────────────────────────────

export interface MarkdownInsightBlockProps {
  code: string
  className?: string
}

export function MarkdownInsightBlock({ code, className }: MarkdownInsightBlockProps) {
  const parsed = React.useMemo<InsightData | null>(() => {
    try {
      const raw = JSON.parse(code)
      if (Array.isArray(raw.items) && raw.items.length > 0) {
        return raw as InsightData
      }
      return null
    } catch {
      return null
    }
  }, [code])

  if (!parsed) {
    return <CodeBlock code={code} language="json" mode="full" className={className} />
  }

  return (
    <div className={cn('rounded-[8px] overflow-hidden border bg-muted/10', className)}>
      {/* 头部标签栏 */}
      <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
        <span className="text-[12px] text-muted-foreground font-medium">行为洞察</span>
        <span className="text-[11px] text-muted-foreground/50">
          {parsed.items.length} 个维度
        </span>
      </div>

      {/* 洞察卡片列表 */}
      <div className="p-3 flex flex-col gap-2">
        {parsed.items.map((item, i) => (
          <InsightCard key={`${item.dim}-${i}`} item={item} />
        ))}

        {/* 总结区域 */}
        {parsed.summary && (
          <div
            className="mt-1 px-3 py-2.5 rounded-[6px] text-[13px] leading-[1.55]"
            style={{
              background: 'var(--semi-color-fill-0, rgba(0,0,0,0.04))',
              color: 'var(--semi-color-text-2, #8f959e)',
              borderLeft: '3px solid var(--semi-color-border, #e0e0e0)',
            }}
          >
            {renderWithBold(parsed.summary)}
          </div>
        )}
      </div>
    </div>
  )
}
