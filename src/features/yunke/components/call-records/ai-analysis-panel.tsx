/**
 * AI 分析结果展示面板
 * Brand colors: Orange #d97757, Blue #6a9bcc, Green #788c5d
 */

import { useEffect, useMemo, useState } from 'react'
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
  ChevronDown,
} from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
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
  high: { label: '高意向', color: '#788c5d', bg: 'rgba(120,140,93,0.12)' },
  medium: { label: '中等意向', color: '#d97757', bg: 'rgba(217,119,87,0.12)' },
  low: { label: '低意向', color: '#b0aea5', bg: 'rgba(176,174,165,0.12)' },
  none: { label: '无意向', color: '#b0aea5', bg: 'rgba(176,174,165,0.08)' },
}

const riskSeverityConfig = {
  high: { label: '高风险', className: 'bg-red-500 hover:bg-red-600' },
  medium: { label: '中风险', className: 'bg-orange-500 hover:bg-orange-600' },
  low: { label: '低风险', className: 'bg-amber-500 hover:bg-amber-600' },
}

const scoreDimensions = [
  { key: 'opening', label: '开场白', max: 10 },
  { key: 'needs_discovery', label: '需求挖掘', max: 20 },
  { key: 'product_intro', label: '产品介绍', max: 15 },
  { key: 'objection_handling', label: '异议处理', max: 15 },
  { key: 'closing', label: '促成邀约', max: 15 },
  { key: 'communication', label: '沟通技巧', max: 10 },
  { key: 'compliance', label: '合规性', max: 10 },
  { key: 'ending', label: '结束语', max: 5 },
] as const

function getScoreColor(percent: number) {
  if (percent >= 80) return '#788c5d'
  if (percent >= 60) return '#d97757'
  if (percent >= 40) return '#b0aea5'
  return '#c45c4a'
}

function MiniScoreRow({ label, score, max, percent }: {
  label: string
  score: number | null
  max: number
  percent: number
}) {
  const color = getScoreColor(percent)
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      </div>
      <span className="shrink-0 text-[11px] font-medium tabular-nums">
        {score ?? '-'}/{max}
      </span>
    </div>
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

  const scorecardKeys = useMemo(() => scoreDimensions.map((d) => d.key), [])
  const [scorecardExpanded, setScorecardExpanded] = useState<Record<string, boolean>>({})
  useEffect(() => {
    // 换一条记录 / 换一版分析时，默认折叠，避免继承上一次的展开状态。
    setScorecardExpanded({})
  }, [analysis.scorecard, analysis.prompt_version, analysis.version])

  const scoreItems = scoreDimensions.map((item) => {
    const scItem = analysis.scorecard?.[item.key]
    const max = typeof scItem?.max_score === 'number' ? scItem.max_score : item.max
    const raw = typeof scItem?.score === 'number' ? scItem.score : analysis.scores?.[item.key]
    const score = typeof raw === 'number' ? Math.max(0, Math.min(max, Math.round(raw))) : null
    const percent = score === null ? 0 : Math.round((score / max) * 100)
    const rationale = typeof scItem?.rationale === 'string' ? scItem.rationale : ''
    const supportIds = Array.isArray(scItem?.support_ids) ? scItem.support_ids : []
    return { ...item, max, score, percent, rationale, supportIds }
  })
  const hasScoreContent = scoreItems.some((item) => item.score !== null)
  const radarData = scoreItems.map((item) => ({
    dimension: item.label,
    value: item.percent,
  }))
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
  const hasScorecard = !!analysis.scorecard && (analysis.version ?? 0) >= 3
  const defaultTab = hasRiskContent ? 'risk' : hasScorecard ? 'scorecard' : hasEvidenceContent ? 'evidence' : 'overview'

  return (
    <div className="space-y-4 p-5">
      {/* 通话摘要 */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-muted-foreground">通话摘要</p>
        <p className="text-sm leading-relaxed">{analysis.summary}</p>
      </div>

      {/* 评分总览：总分 + 意向 + 雷达图 + 8维度分数（紧凑） */}
      <div className="rounded-lg border bg-muted/10 p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tabular-nums leading-none">
                  {Math.round(analysis.quality_score)}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ color: intent.color, backgroundColor: intent.bg }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: intent.color }}
                />
                {intent.label}
              </div>
            </div>
            {analysis.quality_feedback && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {analysis.quality_feedback}
              </p>
            )}

            {hasScoreContent ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                {scoreItems.map((item) => (
                  <MiniScoreRow
                    key={item.key}
                    label={item.label}
                    score={item.score}
                    max={item.max}
                    percent={item.percent}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无维度评分</p>
            )}
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <RadarChart data={radarData} margin={{ top: 14, right: 14, bottom: 14, left: 14 }}>
                <PolarGrid gridType="polygon" radialLines={false} stroke="rgba(0,0,0,0.08)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.55)' }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke="#d97757"
                  fill="#d97757"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 结构化分析标签页 */}
      <Tabs defaultValue={defaultTab} className="gap-3">
        <TabsList className="grid h-8 w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">洞察</TabsTrigger>
          <TabsTrigger value="scorecard" className="text-xs">评分</TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">风险</TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs">证据</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="m-0 space-y-3">
          {/* 改进建议 */}
          {analysis.improvements && analysis.improvements.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" style={{ color: '#d97757' }} aria-hidden="true" />
                <p className="text-sm font-medium">改进建议</p>
                <span className="text-[10px] text-muted-foreground">
                  {analysis.improvements.length} 项
                </span>
              </div>
              <div className="space-y-0">
                {analysis.improvements.map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-3 border-l-2 py-2.5 pl-3 pr-1 transition-colors hover:bg-muted/30"
                    style={{ borderLeftColor: '#d97757' }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: '#d97757' }}
                    >
                      {i + 1}
                    </span>
                    {typeof item === 'string' ? (
                      <p className="text-sm leading-relaxed">{item}</p>
                    ) : (
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {scoreDimensions.find((d) => d.key === item.dimension)?.label || item.dimension}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.priority === 'high' ? '高优先' : item.priority === 'medium' ? '中优先' : '低优先'}
                          </Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{item.suggestion}</p>
                      </div>
                    )}
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

        <TabsContent value="scorecard" className="m-0 space-y-3">
          {(!analysis.scorecard || (analysis.version ?? 0) < 3) && (
            <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">旧版本结果</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
                当前分析结果缺少新版评分依据与证据引用。请点击"重新分析"生成新版结果。
              </p>
            </div>
          )}

          {analysis.scorecard ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">评分依据</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground"
                  onClick={() => {
                    const allExpanded = scorecardKeys.every((k) => scorecardExpanded[k])
                    const nextState: Record<string, boolean> = {}
                    for (const k of scorecardKeys) nextState[k] = !allExpanded
                    setScorecardExpanded(nextState)
                  }}
                >
                  {scorecardKeys.every((k) => scorecardExpanded[k]) ? '收起全部' : '展开全部'}
                </Button>
              </div>
              {scoreItems.map((item) => {
                const scItem = analysis.scorecard?.[item.key]
                if (!scItem) return null
                const color = getScoreColor(item.percent)
                const isOpen = !!scorecardExpanded[item.key]
                return (
                  <div
                    key={item.key}
                    className="overflow-hidden rounded-lg border transition-colors"
                    style={{ borderLeftWidth: 3, borderLeftColor: color }}
                  >
                    {!isOpen ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                        onClick={() => setScorecardExpanded((prev) => ({ ...prev, [item.key]: true }))}
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{item.label}</span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color }}>
                              {item.score ?? '-'}/{item.max}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${item.percent}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 px-3 py-3">
                        {/* 左 1/3：维度名 + 分数 + 进度条 + 收起 */}
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                          <span className="text-2xl font-bold tabular-nums" style={{ color }}>
                            {item.score ?? '-'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">满分 {item.max}</span>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                            <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: color }} />
                          </div>
                          <button
                            type="button"
                            className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => setScorecardExpanded((prev) => ({ ...prev, [item.key]: false }))}
                          >
                            <ChevronDown className="h-3 w-3 rotate-180" />
                            收起
                          </button>
                        </div>
                        {/* 右 2/3：文字说明 + 证据 */}
                        <div className="col-span-2 space-y-2">
                          {scItem.rationale && (
                            <p className="text-sm leading-relaxed text-muted-foreground">{scItem.rationale}</p>
                          )}
                          <EvidenceRefs supportIds={scItem.support_ids || []} supportMap={supportMap} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无评分依据</p>
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
                        {typeof risk.deduction === 'number' && risk.deduction > 0 && (
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
