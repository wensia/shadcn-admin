/**
 * AI 分析结果展示面板
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BrainCircuit,
  Loader2,
  AlertCircle,
  Lightbulb,
  ShieldAlert,
  FileSearch,
  MessageSquareQuote,
} from 'lucide-react'
import type {
  AIAnalysisResult,
  AIAnalysisSupport,
  CallRecord,
} from '../../types'

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

const riskSeverityConfig = {
  high: { label: '高风险', className: 'bg-red-500 hover:bg-red-600' },
  medium: { label: '中风险', className: 'bg-orange-500 hover:bg-orange-600' },
  low: { label: '低风险', className: 'bg-amber-500 hover:bg-amber-600' },
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

function EvidenceRefs({ supportIds, supportMap }: { supportIds: string[]; supportMap: Map<string, AIAnalysisSupport> }) {
  if (!supportIds.length) return null

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs text-muted-foreground">证据引用</p>
      <div className="space-y-1.5">
        {supportIds.map((id) => {
          const support = supportMap.get(id)
          if (!support) {
            return (
              <div key={id} className="rounded border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                <span className="font-mono">#{id}</span>（未找到对应证据片段）
              </div>
            )
          }

          return (
            <div key={id} className="rounded border bg-muted/30 px-2 py-1.5 text-xs">
              <div className="mb-0.5 flex items-center gap-1.5 text-muted-foreground">
                <span className="font-mono">#{support.id}</span>
                {support.time_range && <span>{support.time_range}</span>}
                {support.speaker && <span>· {support.speaker}</span>}
              </div>
              <p className="leading-relaxed">{support.quote || '（无摘录）'}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnalysisContent({ analysis }: { analysis: AIAnalysisResult }) {
  const intent = intentConfig[analysis.customer_intent] || intentConfig.none
  const supports = analysis.supports || []
  const evidence = analysis.evidence || []
  const riskFlags = analysis.risk_flags || []
  const complianceAdjustment = analysis.compliance_adjustment
  const supportMap = new Map(supports.map((item) => [item.id, item]))
  const hasOverviewContent = !!analysis.quality_feedback || (analysis.improvements?.length || 0) > 0
  const hasKeyInfo =
    analysis.key_info.customer_needs.length > 0 ||
    analysis.key_info.objections.length > 0 ||
    analysis.key_info.follow_up_times.length > 0 ||
    analysis.key_info.competitors_mentioned.length > 0 ||
    analysis.key_info.decision_makers.length > 0
  const hasRiskContent = !!complianceAdjustment || riskFlags.length > 0
  const hasEvidenceContent = evidence.length > 0 || supports.length > 0
  const defaultTab = hasRiskContent ? 'risk' : hasEvidenceContent ? 'evidence' : 'overview'

  return (
    <div className="space-y-4 p-5">
      {/* 通话摘要 */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">通话摘要</p>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* 客户意向 + 质量评分 */}
      <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/20 p-3">
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

      {/* 结构化分析标签页 */}
      <Tabs defaultValue={defaultTab} className="gap-3">
        <TabsList className="grid h-8 w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">洞察</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">风险</TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs">证据</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0 space-y-3">
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
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                    <p className="text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 关键信息 */}
          <div className="space-y-3 rounded-md border bg-muted/20 p-3">
            <p className="text-sm font-medium">关键信息</p>
            <TagList label="客户需求" items={analysis.key_info.customer_needs} />
            <TagList label="客户异议" items={analysis.key_info.objections} />
            <TagList label="跟进时间" items={analysis.key_info.follow_up_times} />
            <TagList label="提及竞品" items={analysis.key_info.competitors_mentioned} />
            <TagList label="决策人" items={analysis.key_info.decision_makers} />
            {!hasKeyInfo && (
              <p className="text-sm text-muted-foreground">未提取到关键信息</p>
            )}
          </div>

          {!hasOverviewContent && !hasKeyInfo && (
            <p className="text-sm text-muted-foreground">暂无可展示的洞察内容</p>
          )}
        </TabsContent>

        <TabsContent value="risk" className="m-0 space-y-3">
          {/* 合规自动扣分 */}
          {complianceAdjustment && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">合规自动扣分</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">基础分：{complianceAdjustment.base_score}</Badge>
                <Badge variant="outline">自动扣分：-{complianceAdjustment.auto_deduction}</Badge>
                <Badge variant="secondary">最终分：{complianceAdjustment.final_score}</Badge>
              </div>
              {complianceAdjustment.reasons?.length > 0 ? (
                <div className="space-y-1">
                  {complianceAdjustment.reasons.map((reason, index) => (
                    <p key={index} className="text-xs leading-relaxed text-muted-foreground">
                      {index + 1}. {reason}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">无自动扣分记录</p>
              )}
              {(complianceAdjustment.ignored_without_evidence || 0) > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {complianceAdjustment.ignored_without_evidence} 条风险因缺少证据已忽略
                </p>
              )}
            </div>
          )}

          {/* 风险标记 */}
          {riskFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">风险标记</p>
              <div className="space-y-2">
                {riskFlags.map((risk, index) => {
                  const severity = riskSeverityConfig[risk.severity as keyof typeof riskSeverityConfig]
                  return (
                    <div key={index} className="rounded-md border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{risk.type}</Badge>
                        {severity ? (
                          <Badge className={severity.className}>{severity.label}</Badge>
                        ) : (
                          <Badge variant="secondary">{risk.severity}</Badge>
                        )}
                        {typeof risk.deduction === 'number' && (
                          <Badge variant="outline">合规扣分 -{risk.deduction}</Badge>
                        )}
                      </div>
                      {risk.detail && (
                        <p className="mt-2 text-sm leading-relaxed">{risk.detail}</p>
                      )}
                      <EvidenceRefs supportIds={risk.support_ids || []} supportMap={supportMap} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!hasRiskContent && (
            <p className="text-sm text-muted-foreground">暂无风险信息</p>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="m-0 space-y-3">
          {/* 结论证据映射 */}
          {evidence.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">结论证据映射</p>
              </div>
              <div className="space-y-2">
                {evidence.map((item, index) => (
                  <div key={index} className="rounded-md border bg-muted/20 p-3">
                    <p className="text-sm leading-relaxed">{item.claim}</p>
                    <EvidenceRefs supportIds={item.support_ids || []} supportMap={supportMap} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 证据池 */}
          {supports.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">证据池（supports）</p>
              </div>
              <div className="space-y-2">
                {supports.map((item) => (
                  <div key={item.id} className="rounded-md border bg-muted/20 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">#{item.id}</span>
                      {item.time_range && <span>{item.time_range}</span>}
                      {item.speaker && <span>· {item.speaker}</span>}
                      <span>turn={item.turn_index}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{item.quote || '（无摘录）'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasEvidenceContent && (
            <p className="text-sm text-muted-foreground">暂无证据片段</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function AIAnalysisPanel({ record, isAnalyzing, onAnalyze }: AIAnalysisPanelProps) {
  const { ai_analysis, ai_analysis_status } = record

  // 已有分析结果
  if (ai_analysis && ai_analysis_status === 'completed') {
    return (
      <div className="h-full overflow-y-auto overscroll-contain">
        <AnalysisContent analysis={ai_analysis} />
      </div>
    )
  }

  // 分析中
  if (ai_analysis_status === 'processing' || isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
        <p className="text-sm">AI 正在分析中…</p>
      </div>
    )
  }

  // 分析失败
  if (ai_analysis_status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="text-sm text-destructive">分析失败</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          <BrainCircuit className="mr-2 h-4 w-4" aria-hidden="true" />
          重试分析
        </Button>
      </div>
    )
  }

  // 未分析 - 检查是否可以分析
  const canAnalyze = record.transcript_status === 'completed' && record.transcript && record.transcript.length > 0

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <BrainCircuit className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              分析中…
            </>
          ) : (
            <>
              <BrainCircuit className="mr-2 h-4 w-4" aria-hidden="true" />
              AI 分析
            </>
          )}
        </Button>
      )}
    </div>
  )
}
