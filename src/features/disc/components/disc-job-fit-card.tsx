/**
 * DISC 岗位适配度卡片组件（AI 驱动版）
 * 纯文字分析布局，支持 **加粗** 和 【标记】 渲染
 */

import React from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DISCAIAnalysis, DISCJobFit } from '../types'

interface DiscJobFitCardProps {
  aiJobFitAnalysis?: DISCAIAnalysis['jobFitAnalysis']
  hasAI: boolean
  jobFit?: DISCJobFit // 保留用于降级显示算法最佳岗位名
}

// ─── matchLevel 颜色映射 ───────────────────────────────────

const MATCH_LEVEL_STYLES: Record<string, string> = {
  '优秀': 'bg-primary/10 text-primary border-primary/20',
  '良好': 'bg-secondary text-foreground border-border',
  '一般': 'bg-muted text-muted-foreground border-border',
  '偏低': 'bg-muted text-muted-foreground/70 border-border',
}

function getMatchLevelStyle(level: string): string {
  return MATCH_LEVEL_STYLES[level] || 'bg-muted text-muted-foreground border-border'
}

// ─── 文本渲染：支持 **加粗** 和 【标记】 ─────────────────────

export function renderMarkedText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|【[^】]+】)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('【') && part.endsWith('】')) {
      return (
        <span key={i} className="inline-flex items-center bg-primary/8 text-primary px-1 py-0.5 rounded text-[13px] font-medium">
          {part.slice(1, -1)}
        </span>
      )
    }
    return part
  })
}

// ─── AI 标记 ─────────────────────────────────────────────

function AITag() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium">
      <Sparkles className="h-3 w-3" />
      AI
    </span>
  )
}

// ─── matchLevel 标签 ─────────────────────────────────────

function MatchLevelBadge({ level }: { level: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium',
      getMatchLevelStyle(level),
    )}>
      {level}
    </span>
  )
}

// ─── 旧版岗位名映射 ─────────────────────────────────────

const JOB_NAME_MAP: Record<string, string> = {
  course_consultant: '课程顾问',
  instructor: '讲师',
  study_manager: '学管师',
  admin: '行政',
  teaching_researcher: '教研主管',
  campus_director: '校区主管',
  marketing_specialist: '市场专员',
  customer_service: '客服专员',
}

// ─── 主组件 ──────────────────────────────────────────────

export function DiscJobFitCard({ aiJobFitAnalysis, hasAI, jobFit }: DiscJobFitCardProps) {
  // 无 AI 数据时显示占位
  if (!hasAI || !aiJobFitAnalysis) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          AI 分析完成后将展示岗位适配度详情
        </p>
      </div>
    )
  }

  const { summary, bestMatch, otherMatches, developmentAdvice } = aiJobFitAnalysis

  // 兼容旧版数据：如果没有新字段，尝试用旧字段展示
  const hasNewFormat = !!(summary || bestMatch || otherMatches?.length || developmentAdvice)
  if (!hasNewFormat) {
    const { bestMatchReason, developmentRole, topJobInsights } = aiJobFitAnalysis
    const hasOldData = !!(bestMatchReason || developmentRole || (topJobInsights && Object.keys(topJobInsights).length > 0))

    if (!hasOldData) {
      return (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            AI 分析完成后将展示岗位适配度详情
          </p>
        </div>
      )
    }

    // 旧版数据降级展示
    const bestJobName = jobFit?.bestMatch
      ? (JOB_NAME_MAP[jobFit.bestMatch] || jobFit.bestMatch)
      : undefined

    return (
      <div className="space-y-3">
        {bestMatchReason && (
          <div className="rounded-lg border p-4">
            {bestJobName && (
              <p className="text-sm font-medium mb-2">
                最佳匹配：{bestJobName}
              </p>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {renderMarkedText(bestMatchReason)}
              {' '}<AITag />
            </p>
          </div>
        )}

        {topJobInsights && Object.keys(topJobInsights).length > 0 && (
          <div className="space-y-2">
            {Object.entries(topJobInsights).map(([job, insight]) => (
              <div key={job} className="rounded-lg border p-3 flex items-start gap-3">
                <span className="text-sm font-medium shrink-0">{job}</span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {renderMarkedText(insight)}
                </p>
              </div>
            ))}
          </div>
        )}

        {developmentRole && (
          <div className="rounded-lg border border-violet-200/60 bg-violet-50/30 p-4">
            <p className="text-xs font-medium text-violet-600 mb-1.5 flex items-center gap-1">
              职业发展建议 <AITag />
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {renderMarkedText(developmentRole)}
            </p>
          </div>
        )}
      </div>
    )
  }

  // 新版数据展示
  return (
    <div className="space-y-3">
      {/* 总结区域 */}
      {summary && (
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-sm leading-relaxed text-foreground">
            {renderMarkedText(summary)}
            {' '}<AITag />
          </p>
        </div>
      )}

      {/* 最佳匹配卡片 */}
      {bestMatch && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-xs font-medium text-primary/70">最佳匹配</span>
            <span className="text-sm font-semibold">{bestMatch.jobName}</span>
            <MatchLevelBadge level={bestMatch.matchLevel} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {renderMarkedText(bestMatch.analysis)}
          </p>
        </div>
      )}

      {/* 其他岗位列表 */}
      {otherMatches && otherMatches.length > 0 && (
        <div className="rounded-lg border divide-y">
          {otherMatches.map((match, idx) => (
            <div key={idx} className="flex items-start gap-3 px-4 py-3">
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <span className="text-sm font-medium w-[4.5rem]">{match.jobName}</span>
                <MatchLevelBadge level={match.matchLevel} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground flex-1 min-w-0">
                {renderMarkedText(match.brief)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 职业发展建议 */}
      {developmentAdvice && (
        <div className="rounded-lg border border-violet-200/60 bg-violet-50/30 p-4">
          <p className="text-xs font-medium text-violet-600 mb-1.5 flex items-center gap-1">
            职业发展建议 <AITag />
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {renderMarkedText(developmentAdvice)}
          </p>
        </div>
      )}
    </div>
  )
}
