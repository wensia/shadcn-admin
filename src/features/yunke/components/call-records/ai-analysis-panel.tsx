/**
 * AI 分析结果展示面板
 * 使用 Semi Design CSS 变量作为配色
 */

import { useEffect, useMemo, useState } from 'react'
import { Button, Tag, Tabs, TabPane, Spin } from '@douyinfe/semi-ui-19'
import { IconAlertCircle } from '@douyinfe/semi-icons'
import {
  BrainCircuit,
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
  high: { label: '高意向', color: 'var(--semi-color-success)', bg: 'var(--semi-color-success-light-default)' },
  medium: { label: '中等意向', color: 'var(--semi-color-warning)', bg: 'var(--semi-color-warning-light-default)' },
  low: { label: '低意向', color: 'var(--semi-color-text-2)', bg: 'var(--semi-color-fill-0)' },
  none: { label: '无意向', color: 'var(--semi-color-text-2)', bg: 'var(--semi-color-fill-0)' },
}

const riskSeverityConfig = {
  high: { label: '高风险', color: '#fff', bg: '#ef4444' },
  medium: { label: '中风险', color: '#fff', bg: '#f97316' },
  low: { label: '低风险', color: '#fff', bg: '#f59e0b' },
}

const riskBorderConfig: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#f59e0b',
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
  if (percent >= 80) return 'var(--semi-color-success)'
  if (percent >= 60) return 'var(--semi-color-warning)'
  if (percent >= 40) return 'var(--semi-color-text-2)'
  return 'var(--semi-color-danger)'
}

/**
 * SVG 环形进度指示器
 */
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.min(100, Math.max(0, score))
  const offset = circumference - (percent / 100) * circumference
  const color = score >= 80 ? 'var(--semi-color-success)' : score >= 60 ? 'var(--semi-color-warning)' : score >= 40 ? 'var(--semi-color-text-2)' : 'var(--semi-color-danger)'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: 9, color: 'var(--semi-color-text-2)' }}>/100</span>
      </div>
    </div>
  )
}

function MiniScoreRow({ label, score, max, percent }: {
  label: string
  score: number | null
  max: number
  percent: number
}) {
  const color = getScoreColor(percent)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 6 }}>
        <span style={{ height: 6, width: 6, flexShrink: 0, borderRadius: '50%', backgroundColor: color }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--semi-color-text-2)' }}>{label}</span>
      </div>
      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {score ?? '-'}/{max}
      </span>
    </div>
  )
}

function TagList({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item, i) => (
          <Tag key={i} size="small" style={{ fontSize: 12 }}>{item}</Tag>
        ))}
      </div>
    </div>
  )
}

function EvidenceRefs({ supportIds, supportMap }: { supportIds: string[]; supportMap: Map<string, AIAnalysisSupport> }) {
  if (!supportIds.length) return null

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', margin: 0 }}>证据引用</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {supportIds.map((id) => {
          const support = supportMap.get(id)
          if (!support) {
            return (
              <div key={id} style={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--semi-color-fill-0)', padding: '4px 8px', fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--semi-color-primary)' }}>#{id}</span>（未找到对应证据片段）
              </div>
            )
          }

          return (
            <div key={id} style={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--semi-color-fill-0)', padding: '6px 8px', fontSize: 12 }}>
              <div style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--semi-color-text-2)' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--semi-color-primary)', fontWeight: 500 }}>#{support.id}</span>
                {support.time_range && <span>{support.time_range}</span>}
                {support.speaker && <span>· {support.speaker}</span>}
              </div>
              <p style={{
                lineHeight: 1.6,
                margin: 0,
                fontStyle: 'italic',
                borderLeft: '2px solid var(--semi-color-primary-light-default)',
                paddingLeft: 8,
                color: 'var(--semi-color-text-1)',
              }}>
                {support.quote || '（无摘录）'}
              </p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
      {/* 通话摘要 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-2)', margin: 0 }}>通话摘要</p>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{analysis.summary}</p>
      </div>

      {/* 评分总览：环形进度 + 意向 + 雷达图 + 8维度分数（紧凑） */}
      <div style={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--semi-color-fill-0)', padding: 16 }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0,1fr) 240px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 8 }}>
              {/* 环形进度指示器 */}
              <ScoreRing score={analysis.quality_score} size={80} />
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: intent.color,
                  backgroundColor: intent.bg,
                }}
              >
                <span
                  style={{ height: 6, width: 6, borderRadius: '50%', backgroundColor: intent.color }}
                />
                {intent.label}
              </div>
            </div>
            {analysis.quality_feedback && (
              <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {analysis.quality_feedback}
              </p>
            )}

            {hasScoreContent ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 6, paddingTop: 4 }}>
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
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>暂无维度评分</p>
            )}
          </div>

          <div style={{ height: 210, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <RadarChart data={radarData} margin={{ top: 14, right: 14, bottom: 14, left: 14 }}>
                <PolarGrid gridType="polygon" radialLines={false} stroke="rgba(0,0,0,0.06)" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.55)' }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke="var(--semi-color-primary)"
                  fill="var(--semi-color-primary)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 结构化分析标签页 */}
      <Tabs defaultActiveKey={defaultTab} size="small" style={{ gap: 12 }}>
        <TabPane tab="洞察" itemKey="overview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            {/* 改进建议 */}
            {analysis.improvements && analysis.improvements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lightbulb style={{ height: 16, width: 16, color: 'var(--semi-color-primary)' }} aria-hidden="true" />
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>改进建议</p>
                  <span style={{ fontSize: 10, color: 'var(--semi-color-text-2)' }}>
                    {analysis.improvements.length} 项
                  </span>
                </div>
                <div>
                  {analysis.improvements.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        gap: 12,
                        borderLeft: '2px solid var(--semi-color-primary)',
                        padding: '10px 4px 10px 12px',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--semi-color-fill-0)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span
                        style={{
                          marginTop: 2,
                          display: 'flex',
                          height: 20,
                          width: 20,
                          flexShrink: 0,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#fff',
                          backgroundColor: 'var(--semi-color-primary)',
                        }}
                      >
                        {i + 1}
                      </span>
                      {typeof item === 'string' ? (
                        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item}</p>
                      ) : (
                        <div style={{ minWidth: 0 }}>
                          <div style={{ marginBottom: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                            <Tag size="small" style={{ fontSize: 10 }}>
                              {scoreDimensions.find((d) => d.key === item.dimension)?.label || item.dimension}
                            </Tag>
                            <Tag size="small" color="grey" style={{ fontSize: 10 }}>
                              {item.priority === 'high' ? '高优先' : item.priority === 'medium' ? '中优先' : '低优先'}
                            </Tag>
                          </div>
                          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.suggestion}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 关键信息 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--semi-color-fill-0)', padding: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>关键信息</p>
              <TagList label="客户需求" items={analysis.key_info.customer_needs} />
              <TagList label="客户异议" items={analysis.key_info.objections} />
              <TagList label="跟进时间" items={analysis.key_info.follow_up_times} />
              <TagList label="提及竞品" items={analysis.key_info.competitors_mentioned} />
              <TagList label="决策人" items={analysis.key_info.decision_makers} />
              {!hasKeyInfo && (
                <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>未提取到关键信息</p>
              )}
            </div>

            {!hasOverviewContent && !hasKeyInfo && (
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>暂无可展示的洞察内容</p>
            )}
          </div>
        </TabPane>

        <TabPane tab="评分" itemKey="scorecard">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            {(!analysis.scorecard || (analysis.version ?? 0) < 3) && (
              <div style={{ borderRadius: 8, border: '1px solid #fbbf24', background: 'rgba(251,191,36,0.08)', padding: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#92400e', margin: 0 }}>旧版本结果</p>
                <p style={{ marginTop: 4, fontSize: 12, lineHeight: 1.6, color: '#b45309', marginBottom: 0 }}>
                  当前分析结果缺少新版评分依据与证据引用。请点击"重新分析"生成新版结果。
                </p>
              </div>
            )}

            {analysis.scorecard ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--semi-color-text-2)', margin: 0 }}>评分依据</p>
                  <Button
                    type="tertiary"
                    theme="borderless"
                    size="small"
                    style={{ height: 24, padding: '0 8px', fontSize: 10, color: 'var(--semi-color-text-2)' }}
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
                      style={{
                        overflow: 'hidden',
                        borderRadius: 8,
                        border: '1px solid rgba(0,0,0,0.06)',
                        borderLeftWidth: 3,
                        borderLeftColor: color,
                        background: 'var(--semi-color-fill-0)',
                        transition: 'background 0.15s',
                      }}
                    >
                      {!isOpen ? (
                        <button
                          type="button"
                          style={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            textAlign: 'left',
                            transition: 'background 0.15s',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            font: 'inherit',
                          }}
                          onClick={() => setScorecardExpanded((prev) => ({ ...prev, [item.key]: true }))}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                              <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color }}>{item.score ?? '-'}/{item.max}</span>
                            </div>
                            <div style={{ height: 6, width: '100%', overflow: 'hidden', borderRadius: 999, background: 'rgba(0,0,0,0.04)' }}>
                              <div style={{ height: '100%', borderRadius: 999, transition: 'width 0.5s', width: `${item.percent}%`, backgroundColor: color }} />
                            </div>
                          </div>
                          <ChevronDown style={{ height: 14, width: 14, flexShrink: 0, color: 'var(--semi-color-text-2)' }} />
                        </button>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, padding: 12 }}>
                          {/* 左 1/3：维度名 + 分数 + 进度条 + 收起 */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--semi-color-text-2)' }}>{item.label}</span>
                            <span style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color }}>
                              {item.score ?? '-'}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--semi-color-text-2)' }}>满分 {item.max}</span>
                            <div style={{ height: 6, width: '100%', overflow: 'hidden', borderRadius: 999, background: 'rgba(0,0,0,0.04)' }}>
                              <div style={{ height: '100%', borderRadius: 999, width: `${item.percent}%`, backgroundColor: color }} />
                            </div>
                            <button
                              type="button"
                              style={{
                                marginTop: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 10,
                                color: 'var(--semi-color-text-2)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                font: 'inherit',
                              }}
                              onClick={() => setScorecardExpanded((prev) => ({ ...prev, [item.key]: false }))}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--semi-color-text-0)' }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--semi-color-text-2)' }}
                            >
                              <ChevronDown style={{ height: 12, width: 12, transform: 'rotate(180deg)' }} />
                              收起
                            </button>
                          </div>
                          {/* 右 2/3：文字说明 + 证据 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {scItem.rationale && (
                              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--semi-color-text-2)', margin: 0 }}>{scItem.rationale}</p>
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
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>暂无评分依据</p>
            )}
          </div>
        </TabPane>

        <TabPane tab="风险" itemKey="risk">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            {/* 合规自动扣分 */}
            {complianceAdjustment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--semi-color-fill-0)', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert style={{ height: 16, width: 16, color: 'var(--semi-color-text-2)' }} aria-hidden="true" />
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-2)', margin: 0 }}>合规自动扣分</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                  <Tag size="small">基础分：{complianceAdjustment.base_score}</Tag>
                  <Tag size="small">自动扣分：-{complianceAdjustment.auto_deduction}</Tag>
                  <Tag size="small" color="grey">最终分：{complianceAdjustment.final_score}</Tag>
                </div>
                {complianceAdjustment.reasons?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {complianceAdjustment.reasons.map((reason: string, index: number) => (
                      <p key={index} style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-2)', margin: 0 }}>
                        {index + 1}. {reason}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', margin: 0 }}>无自动扣分记录</p>
                )}
                {(complianceAdjustment.ignored_without_evidence || 0) > 0 && (
                  <p style={{ fontSize: 12, color: '#d97706', margin: 0 }}>
                    {complianceAdjustment.ignored_without_evidence} 条风险因缺少证据已忽略
                  </p>
                )}
              </div>
            )}

            {/* 风险标记 */}
            {riskFlags.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-2)', margin: 0 }}>风险标记</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {riskFlags.map((risk, index) => {
                    const severity = riskSeverityConfig[risk.severity as keyof typeof riskSeverityConfig]
                    const borderColor = riskBorderConfig[risk.severity as string] || 'rgba(0,0,0,0.06)'
                    return (
                      <div
                        key={index}
                        style={{
                          borderRadius: 8,
                          border: '1px solid rgba(0,0,0,0.06)',
                          borderLeft: `3px solid ${borderColor}`,
                          background: 'var(--semi-color-fill-0)',
                          padding: 12,
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                          <Tag size="small">{risk.type}</Tag>
                          {severity ? (
                            <Tag size="small" style={{ color: severity.color, backgroundColor: severity.bg }}>{severity.label}</Tag>
                          ) : (
                            <Tag size="small" color="grey">{risk.severity}</Tag>
                          )}
                          {typeof risk.deduction === 'number' && risk.deduction > 0 && (
                            <Tag size="small">合规扣分 -{risk.deduction}</Tag>
                          )}
                        </div>
                        {risk.detail && (
                          <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, marginBottom: 0 }}>{risk.detail}</p>
                        )}
                        <EvidenceRefs supportIds={risk.support_ids || []} supportMap={supportMap} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!hasRiskContent && (
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>暂无风险信息</p>
            )}
          </div>
        </TabPane>

        <TabPane tab="证据" itemKey="evidence">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            {/* 结论证据映射 */}
            {evidence.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileSearch style={{ height: 16, width: 16, color: 'var(--semi-color-text-2)' }} aria-hidden="true" />
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-2)', margin: 0 }}>结论证据映射</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {evidence.map((item, index) => (
                    <div key={index} style={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--semi-color-fill-0)', padding: 12 }}>
                      <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.claim}</p>
                      <EvidenceRefs supportIds={item.support_ids || []} supportMap={supportMap} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 证据池 */}
            {supports.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquareQuote style={{ height: 16, width: 16, color: 'var(--semi-color-text-2)' }} aria-hidden="true" />
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--semi-color-text-2)', margin: 0 }}>证据池（supports）</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {supports.map((item) => (
                    <div key={item.id} style={{ borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--semi-color-fill-0)', padding: 12 }}>
                      <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--semi-color-primary)', fontWeight: 500 }}>#{item.id}</span>
                        {item.time_range && <span>{item.time_range}</span>}
                        {item.speaker && <span>· {item.speaker}</span>}
                        <span>turn={item.turn_index}</span>
                      </div>
                      <p style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        margin: 0,
                        fontStyle: 'italic',
                        borderLeft: '2px solid var(--semi-color-primary-light-default)',
                        paddingLeft: 8,
                        color: 'var(--semi-color-text-1)',
                      }}>
                        {item.quote || '（无摘录）'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasEvidenceContent && (
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>暂无证据片段</p>
            )}
          </div>
        </TabPane>
      </Tabs>
    </div>
  )
}

export function AIAnalysisPanel({ record, isAnalyzing, onAnalyze }: AIAnalysisPanelProps) {
  const { ai_analysis, ai_analysis_status } = record

  // 已有分析结果
  if (ai_analysis && ai_analysis_status === 'completed') {
    return (
      <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <AnalysisContent analysis={ai_analysis} />
      </div>
    )
  }

  // 分析中
  if (ai_analysis_status === 'processing' || isAnalyzing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--semi-color-text-2)' }}>
        <Spin size="large" />
        <p style={{ fontSize: 14, margin: 0 }}>AI 正在分析中...</p>
      </div>
    )
  }

  // 分析失败
  if (ai_analysis_status === 'failed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <IconAlertCircle style={{ fontSize: 32, color: 'var(--semi-color-danger)' }} />
        <p style={{ fontSize: 14, color: 'var(--semi-color-danger)', margin: 0 }}>分析失败</p>
        <Button
          theme="borderless"
          size="small"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          icon={<BrainCircuit style={{ height: 16, width: 16 }} />}
        >
          重试分析
        </Button>
      </div>
    )
  }

  // 未分析 - 检查是否可以分析
  const canAnalyze = record.transcript_status === 'completed' && record.transcript && record.transcript.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <BrainCircuit style={{ height: 40, width: 40, color: 'var(--semi-color-text-2)' }} />
      <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', margin: 0 }}>
        {canAnalyze ? '尚未进行 AI 分析' : '需要先完成语音转写'}
      </p>
      {canAnalyze && (
        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          size="small"
          icon={isAnalyzing
            ? <Spin size="small" />
            : <BrainCircuit style={{ height: 16, width: 16 }} />
          }
        >
          {isAnalyzing ? '分析中...' : 'AI 分析'}
        </Button>
      )}
    </div>
  )
}
