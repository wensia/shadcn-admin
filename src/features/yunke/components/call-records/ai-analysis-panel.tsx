/**
 * AI 分析结果展示面板
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BrainCircuit, Loader2, AlertCircle, Lightbulb } from 'lucide-react'
import type { AIAnalysisResult, CallRecord } from '../../types'

interface AIAnalysisPanelProps {
  record: CallRecord
  isAnalyzing: boolean
  onAnalyze: () => void
}

const intentConfig = {
  high: { label: '高意向', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' },
  medium: { label: '中等意向', variant: 'default' as const, className: 'bg-yellow-500 hover:bg-yellow-600' },
  low: { label: '低意向', variant: 'default' as const, className: 'bg-orange-500 hover:bg-orange-600' },
  none: { label: '无意向', variant: 'secondary' as const, className: '' },
}

function ScoreDisplay({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : score >= 40 ? 'text-orange-600' : 'text-red-600'
  return (
    <span className={`text-2xl font-bold ${color}`}>
      {Math.round(score)}
      <span className="text-sm font-normal text-muted-foreground">/100</span>
    </span>
  )
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function AnalysisContent({ analysis }: { analysis: AIAnalysisResult }) {
  const intent = intentConfig[analysis.customer_intent] || intentConfig.none

  return (
    <div className="space-y-5 p-5">
      {/* 通话摘要 */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">通话摘要</p>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      <Separator />

      {/* 客户意向 + 质量评分 */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">客户意向</p>
          <Badge className={intent.className} variant={intent.variant}>
            {intent.label}
          </Badge>
        </div>
        <div className="space-y-1.5 text-right">
          <p className="text-sm font-medium text-muted-foreground">质量评分</p>
          <ScoreDisplay score={analysis.quality_score} />
        </div>
      </div>

      {/* 质量评价 */}
      {analysis.quality_feedback && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">质量评价</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.quality_feedback}</p>
        </div>
      )}

      {/* 改进建议 */}
      {analysis.improvements && analysis.improvements.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">改进建议</p>
          <div className="space-y-1.5">
            {analysis.improvements.map((item, i) => (
              <div key={i} className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* 关键信息 */}
      <div className="space-y-3">
        <p className="text-sm font-medium">关键信息</p>
        <TagList label="客户需求" items={analysis.key_info.customer_needs} />
        <TagList label="客户异议" items={analysis.key_info.objections} />
        <TagList label="跟进时间" items={analysis.key_info.follow_up_times} />
        <TagList label="提及竞品" items={analysis.key_info.competitors_mentioned} />
        <TagList label="决策人" items={analysis.key_info.decision_makers} />

        {/* 所有关键信息都为空时 */}
        {!analysis.key_info.customer_needs.length &&
         !analysis.key_info.objections.length &&
         !analysis.key_info.follow_up_times.length &&
         !analysis.key_info.competitors_mentioned.length &&
         !analysis.key_info.decision_makers.length && (
          <p className="text-sm text-muted-foreground">未提取到关键信息</p>
        )}
      </div>
    </div>
  )
}

export function AIAnalysisPanel({ record, isAnalyzing, onAnalyze }: AIAnalysisPanelProps) {
  const { ai_analysis, ai_analysis_status } = record

  // 已有分析结果
  if (ai_analysis && ai_analysis_status === 'completed') {
    return (
      <div className="h-full overflow-y-auto">
        <AnalysisContent analysis={ai_analysis} />
        {/* 重新分析按钮 */}
        <div className="px-5 pb-5">
          <Separator className="mb-4" />
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                重新分析中...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" />
                重新分析
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // 分析中
  if (ai_analysis_status === 'processing' || isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">AI 正在分析中...</p>
      </div>
    )
  }

  // 分析失败
  if (ai_analysis_status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">分析失败</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          <BrainCircuit className="mr-2 h-4 w-4" />
          重试分析
        </Button>
      </div>
    )
  }

  // 未分析 - 检查是否可以分析
  const canAnalyze = record.transcript_status === 'completed' && record.transcript && record.transcript.length > 0

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <BrainCircuit className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {canAnalyze ? '尚未进行 AI 分析' : '需要先完成语音转写'}
      </p>
      {canAnalyze && (
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <BrainCircuit className="mr-2 h-4 w-4" />
              AI 分析
            </>
          )}
        </Button>
      )}
    </div>
  )
}
