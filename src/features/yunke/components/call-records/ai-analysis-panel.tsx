/**
 * 通话详情 AI 分析面板
 * 兼容旧版分析结果，并优先展示“通话分析-K12结构化质检 v2”的结构化输出。
 */

import { Button, Tag, Tabs, TabPane, Spin } from '@douyinfe/semi-ui-19'
import { IconAlertCircle } from '@douyinfe/semi-icons'
import {
  AlertTriangle,
  Award,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  FileText,
  Lightbulb,
  ListChecks,
  MessageSquare,
  MessageSquareQuote,
  Route,
  ShieldAlert,
  ShieldCheck,
  Tags,
  Target,
  UserRound,
  XCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type {
  AIAnalysisResult,
  AIAnalysisSupport,
  CallRecord,
} from '../../types'
import {
  CallAnalysisMappingModel,
  type CallAnalysisTone,
} from './call-analysis-mapping'

interface AIAnalysisPanelProps {
  record: CallRecord
  isAnalyzing: boolean
  onAnalyze: () => void
}

type AnyRecord = Record<string, unknown>
type Tone = CallAnalysisTone

const toneStyle: Record<Tone, { bg: string; fg: string; border: string }> = {
  success: {
    bg: 'var(--semi-color-success-light-default)',
    fg: 'var(--semi-color-success)',
    border: 'var(--semi-color-success-light-active)',
  },
  warning: {
    bg: 'var(--semi-color-warning-light-default)',
    fg: 'var(--semi-color-warning)',
    border: 'var(--semi-color-warning-light-active)',
  },
  danger: {
    bg: 'var(--semi-color-danger-light-default)',
    fg: 'var(--semi-color-danger)',
    border: 'var(--semi-color-danger-light-active)',
  },
  info: {
    bg: 'var(--semi-color-primary-light-default)',
    fg: 'var(--semi-color-primary)',
    border: 'var(--semi-color-primary-light-active)',
  },
  neutral: {
    bg: 'var(--semi-color-fill-0)',
    fg: 'var(--semi-color-text-2)',
    border: 'var(--semi-color-border)',
  },
}

const intentLabelMap: Record<string, string> = {
  A_STRONG: '强意向',
  B_MEDIUM: '中意向',
  C_WEAK: '弱意向',
  D_LOW: '低意向',
  X_INVALID: '无效',
  high: '高意向',
  medium: '中等意向',
  low: '低意向',
  none: '无意向',
}

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as AnyRecord
    : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function recordArray(value: unknown): AnyRecord[] {
  return asArray(value).map(asRecord).filter((item): item is AnyRecord => !!item)
}

function textValue(value: unknown, fallback = '未知'): string {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') return CallAnalysisMappingModel.label(value, fallback)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) {
    const rendered = value.map((item) => textValue(item, '')).filter(Boolean)
    return rendered.length ? rendered.join('、') : fallback
  }
  const record = asRecord(value)
  if (record) {
    const preferred = record.name ?? record.status_name ?? record.code ?? record.action_name ?? record.field_name ?? record.reason
    if (preferred !== undefined) return textValue(preferred, fallback)
  }
  return fallback
}

function optionalText(value: unknown): string {
  const rendered = textValue(value, '')
  return rendered === '未知' ? '' : rendered
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function getRecord(parent: AnyRecord | null, key: string): AnyRecord | null {
  return parent ? asRecord(parent[key]) : null
}

function getStructuredAnalysis(analysis: AIAnalysisResult): AnyRecord | null {
  const direct = asRecord(analysis.structured_analysis)
  if (direct && Object.keys(direct).length > 0) return direct

  const firstStructuredResult = recordArray(analysis.structured_results)[0]
  if (firstStructuredResult) return firstStructuredResult

  const promptResult = recordArray((analysis as unknown as AnyRecord).results)[0]
  if (promptResult) return promptResult

  const self = analysis as unknown as AnyRecord
  if (self.analysis_version || self.stage_action_audit || self.followup_boundary_analysis) return self
  return null
}

function confidenceText(value: unknown): string {
  const number = numberValue(value)
  if (number === null) return ''
  return `置信 ${Math.round(number * 100)}%`
}

function percentText(value: unknown): string {
  const number = numberValue(value)
  if (number === null) return '未知'
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`
}

function scoreTone(score: number | null): Tone {
  if (score === null) return 'neutral'
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

function riskTone(level: unknown): Tone {
  return CallAnalysisMappingModel.riskTone(level)
}

function statusTone(value: unknown): Tone {
  const text = textValue(value, '').toUpperCase()
  if (text.includes('PASS') || text.includes('CONFIRMED') || text.includes('CLOSED') || text.includes('明确且客户确认') || text === '是') return 'success'
  if (text.includes('RISK') || text.includes('FAILED') || text.includes('LOST') || text.includes('REFUND') || text.includes('勿扰') || text.includes('不合格') || text === 'HIGH') return 'danger'
  if (text.includes('PENDING') || text.includes('考虑') || text.includes('待') || text.includes('模糊') || text.includes('软拒绝') || text.includes('暂缓') || text === 'MEDIUM') return 'warning'
  return 'neutral'
}

function stageName(stage: AnyRecord | null): string {
  if (!stage) return '未知'
  const name = optionalText(stage.name)
  const code = optionalText(stage.code)
  if (name) return name
  return name || code || '未知'
}

function tagLabel(item: AnyRecord): string {
  return optionalText(item.name)
    || optionalText(item.status_name)
    || optionalText(item.action_name)
    || optionalText(item.field_name)
    || CallAnalysisMappingModel.codeLabel(item.code, '')
    || '未命名'
}

function tagSubLabel(item: AnyRecord): string {
  const parts = [
    CallAnalysisMappingModel.codeLabel(item.code, ''),
    item.severity !== undefined ? CallAnalysisMappingModel.riskLevelLabel(item.severity, '') : '',
    confidenceText(item.confidence),
    typeof item.deduction === 'number' ? `扣 ${item.deduction}` : '',
    optionalText(item.handling_quality),
    optionalText(item.owner),
    optionalText(item.deadline),
  ].filter(Boolean)
  return Array.from(new Set(parts)).join(' · ')
}

function ScoreRing({ score, size = 86 }: { score: number | null; size?: number }) {
  const strokeWidth = 7
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.min(100, Math.max(0, score ?? 0))
  const offset = circumference - (percent / 100) * circumference
  const tone = scoreTone(score)
  const color = toneStyle[tone].fg

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--semi-color-fill-1)"
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
        <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
          {score === null ? '-' : Math.round(score)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--semi-color-text-2)' }}>/100</span>
      </div>
    </div>
  )
}

function EmptyText({ children = '暂无数据' }: { children?: string }) {
  return (
    <p style={{ margin: 0, fontSize: 13, color: 'var(--semi-color-text-2)', lineHeight: 1.6 }}>
      {children}
    </p>
  )
}

function Section({
  title,
  icon,
  children,
  right,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {icon}
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
            {title}
          </h4>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

function ToneTag({ tone, children }: { tone: Tone; children: ReactNode }) {
  const style = toneStyle[tone]
  return (
    <Tag
      size="small"
      style={{
        color: style.fg,
        background: style.bg,
        borderColor: style.border,
        fontWeight: 500,
      }}
    >
      {children}
    </Tag>
  )
}

function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: Tone
}) {
  const style = toneStyle[tone]
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 8,
        border: `1px solid ${style.border}`,
        background: style.bg,
        padding: '10px 12px',
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: style.fg, lineHeight: 1.4 }}>{label}</p>
      <div
        style={{
          marginTop: 4,
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--semi-color-text-0)',
          lineHeight: 1.35,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
      {detail && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--semi-color-text-2)', lineHeight: 1.5 }}>
          {detail}
        </p>
      )}
    </div>
  )
}

function KeyValueGrid({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: unknown; tone?: Tone }>
  columns?: 1 | 2
}) {
  const visibleItems = items.filter((item) => textValue(item.value, '') !== '')
  if (!visibleItems.length) return <EmptyText />

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns === 1 ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 8,
      }}
    >
      {visibleItems.map((item) => {
        const tone = item.tone || 'neutral'
        const style = toneStyle[tone]
        return (
          <div
            key={item.label}
            style={{
              borderRadius: 6,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-fill-0)',
              padding: '8px 10px',
              minWidth: 0,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: 'var(--semi-color-text-2)', lineHeight: 1.4 }}>
              {item.label}
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                fontWeight: 500,
                color: tone === 'neutral' ? 'var(--semi-color-text-0)' : style.fg,
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}
            >
              {textValue(item.value)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function EvidenceList({
  items,
  empty = '暂无证据',
}: {
  items: unknown
  empty?: string
}) {
  const list = asArray(items)
  if (!list.length) return <EmptyText>{empty}</EmptyText>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((item, index) => {
        const record = asRecord(item)
        const text = record
          ? optionalText(record.evidence) || optionalText(record.quote) || optionalText(record.claim) || textValue(record)
          : textValue(item)
        const meta = record
          ? [optionalText(record.time_range), optionalText(record.speaker), optionalText(record.code)].filter(Boolean).join(' · ')
          : ''
        return (
          <div
            key={index}
            style={{
              borderLeft: '3px solid var(--semi-color-primary-light-default)',
              background: 'var(--semi-color-fill-0)',
              borderRadius: 6,
              padding: '8px 10px',
            }}
          >
            {meta && (
              <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                {meta}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--semi-color-text-1)' }}>
              {text}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function ScoreDimensions({ dimensions }: { dimensions: unknown }) {
  const items = recordArray(dimensions)
  if (!items.length) return <EmptyText>暂无维度评分</EmptyText>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, index) => {
        const score = numberValue(item.score)
        const weight = numberValue(item.weight) ?? 100
        const percent = score === null || weight <= 0 ? 0 : Math.round((score / weight) * 100)
        const color = toneStyle[scoreTone(percent)].fg
        return (
          <div
            key={`${textValue(item.dimension, 'dimension')}-${index}`}
            style={{
              borderRadius: 8,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-fill-0)',
              padding: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
                  {textValue(item.name, textValue(item.dimension))}
                </p>
                {item.reason !== undefined && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.55, color: 'var(--semi-color-text-2)' }}>
                    {textValue(item.reason)}
                  </p>
                )}
              </div>
              <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color }}>
                {score ?? '-'}/{weight}
              </span>
            </div>
            <div style={{ marginTop: 8, height: 6, overflow: 'hidden', borderRadius: 999, background: 'var(--semi-color-fill-1)' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, percent))}%`, borderRadius: 999, background: color }} />
            </div>
            {asArray(item.evidence).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <EvidenceList items={item.evidence} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StructuredTagList({
  title,
  items,
  empty = '暂无标签',
}: {
  title: string
  items: unknown
  empty?: string
}) {
  const list = recordArray(items)
  if (!list.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{title}</p>
        <EmptyText>{empty}</EmptyText>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((item, index) => {
          const severity = typeof item.severity === 'string' ? item.severity : ''
          const tone = severity ? riskTone(severity) : statusTone(item.status_code ?? item.code)
          const handled = booleanValue(item.handled)
          return (
            <div
              key={`${tagLabel(item)}-${index}`}
              style={{
                borderRadius: 8,
                border: '1px solid var(--semi-color-border)',
                borderLeft: `3px solid ${toneStyle[tone].fg}`,
                background: 'var(--semi-color-fill-0)',
                padding: 10,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <ToneTag tone={tone}>{tagLabel(item)}</ToneTag>
                {tagSubLabel(item) && <Tag size="small" color="grey">{tagSubLabel(item)}</Tag>}
                {handled !== null && <ToneTag tone={handled ? 'success' : 'warning'}>{handled ? '已处理' : '未处理'}</ToneTag>}
              </div>
              {item.evidence !== undefined && (
                <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-1)' }}>
                  证据：{textValue(item.evidence)}
                </p>
              )}
              {(item.explanation !== undefined || item.better_response !== undefined || item.suggested_rewrite !== undefined) && (
                <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-2)' }}>
                  {optionalText(item.explanation) || optionalText(item.better_response) || optionalText(item.suggested_rewrite)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BetterScriptList({ items }: { items: unknown }) {
  const list = recordArray(items)
    .map((item, index) => {
      const scenario = optionalText(item.scenario) || optionalText(item.name) || optionalText(item.title)
      const originalIssue = optionalText(item.original_issue) || optionalText(item.issue)
      const betterScript = optionalText(item.better_script)
        || optionalText(item.suggested_script)
        || optionalText(item.better_response)
        || optionalText(item.suggested_rewrite)
      const evidence = optionalText(item.evidence)

      return { scenario, originalIssue, betterScript, evidence, index }
    })
    .filter((item) => item.scenario || item.originalIssue || item.betterScript || item.evidence)

  if (!list.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>更好话术</p>
        <EmptyText>暂无话术建议</EmptyText>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>更好话术</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((item) => (
          <div
            key={`${item.scenario || item.originalIssue || 'better-script'}-${item.index}`}
            style={{
              borderRadius: 8,
              border: '1px solid var(--semi-color-border)',
              borderLeft: '3px solid var(--semi-color-primary)',
              background: 'var(--semi-color-fill-0)',
              padding: 10,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <ToneTag tone="info">{item.scenario || `话术建议 ${item.index + 1}`}</ToneTag>
            </div>
            {item.originalIssue && (
              <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-2)' }}>
                原问题：{item.originalIssue}
              </p>
            )}
            {item.evidence && (
              <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-2)' }}>
                证据：{item.evidence}
              </p>
            )}
            {item.betterScript && (
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 6,
                  background: 'var(--semi-color-bg-0)',
                  border: '1px solid var(--semi-color-primary-light-active)',
                  padding: '8px 10px',
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: 'var(--semi-color-text-0)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {item.betterScript}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RequiredActionList({ items }: { items: unknown }) {
  const list = recordArray(items)
  if (!list.length) return <EmptyText>暂无动作审计</EmptyText>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((item, index) => {
        const completed = booleanValue(item.completed) === true
        const requiredLevel = String(item.required_level ?? 'SHOULD').toUpperCase()
        const isMust = requiredLevel === 'MUST'
        return (
          <div
            key={`${textValue(item.action_code, 'action')}-${index}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '20px minmax(0,1fr)',
              gap: 8,
              borderRadius: 8,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-fill-0)',
              padding: 10,
            }}
          >
            {completed ? (
              <CheckCircle2 style={{ marginTop: 2, width: 16, height: 16, color: 'var(--semi-color-success)' }} />
            ) : (
              <XCircle style={{ marginTop: 2, width: 16, height: 16, color: isMust ? 'var(--semi-color-danger)' : 'var(--semi-color-warning)' }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--semi-color-text-0)' }}>
                  {textValue(item.action_name, textValue(item.action_code))}
                </p>
                <ToneTag tone={isMust ? 'danger' : 'neutral'}>
                  {CallAnalysisMappingModel.requiredLevelLabel(requiredLevel)}
                </ToneTag>
                {confidenceText(item.confidence) && <Tag size="small" color="grey">{confidenceText(item.confidence)}</Tag>}
              </div>
              {(item.evidence !== undefined || item.reason_if_missing !== undefined) && (
                <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-1)' }}>
                  {completed ? `证据：${textValue(item.evidence)}` : `缺失原因：${textValue(item.reason_if_missing)}`}
                </p>
              )}
              {item.impact_if_missing !== undefined && !completed && (
                <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-2)' }}>
                  影响：{textValue(item.impact_if_missing)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MissingActions({ items }: { items: unknown }) {
  const list = recordArray(items)
  if (!list.length) return <EmptyText>没有明显缺失动作</EmptyText>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((item, index) => {
        const severity = optionalText(item.severity).toUpperCase()
        const tone = severity === 'HIGH' ? 'danger' : severity === 'MEDIUM' ? 'warning' : 'neutral'
        return (
          <div
            key={`${textValue(item.action_code, 'missing')}-${index}`}
            style={{
              borderRadius: 8,
              border: '1px solid var(--semi-color-border)',
              borderLeft: `3px solid ${toneStyle[tone].fg}`,
              background: 'var(--semi-color-fill-0)',
              padding: 10,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <ToneTag tone={tone}>{textValue(item.action_name, textValue(item.action_code))}</ToneTag>
              <Tag size="small" color="grey">
                {CallAnalysisMappingModel.requiredLevelLabel(item.required_level, '必做')}
              </Tag>
            </div>
            {item.why_important !== undefined && (
              <p style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.6 }}>
                {textValue(item.why_important)}
              </p>
            )}
            {item.suggested_script !== undefined && (
              <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.6, color: 'var(--semi-color-text-2)' }}>
                建议话术：{textValue(item.suggested_script)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CrmFieldAudit({ fields, missingFields }: { fields: unknown; missingFields: unknown }) {
  const fieldList = recordArray(fields)
  const missingList = recordArray(missingFields)
  if (!fieldList.length && !missingList.length) return <EmptyText>暂无 CRM 字段审计</EmptyText>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {fieldList.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 8,
          }}
        >
          {fieldList.map((field, index) => {
            const captured = booleanValue(field.captured) === true
            return (
              <div
                key={`${textValue(field.field_name, 'field')}-${index}`}
                style={{
                  borderRadius: 6,
                  border: '1px solid var(--semi-color-border)',
                  background: 'var(--semi-color-fill-0)',
                  padding: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--semi-color-text-2)' }}>{textValue(field.field_name)}</p>
                  <ToneTag tone={captured ? 'success' : 'warning'}>{captured ? '已沉淀' : '缺失'}</ToneTag>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5 }}>
                  {textValue(field.field_value, captured ? '未知' : '未捕获')}
                </p>
                {field.evidence !== undefined && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--semi-color-text-2)', lineHeight: 1.5 }}>
                    {textValue(field.evidence)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {missingList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>缺失 CRM 字段</p>
          {missingList.map((field, index) => (
            <div
              key={`${textValue(field.field_name, 'missing-field')}-${index}`}
              style={{
                borderRadius: 6,
                border: '1px solid var(--semi-color-warning-light-active)',
                background: 'var(--semi-color-warning-light-default)',
                padding: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{textValue(field.field_name)}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--semi-color-text-2)' }}>
                {textValue(field.why_important)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LegacyEvidenceRefs({ supportIds, supportMap }: { supportIds: string[]; supportMap: Map<string, AIAnalysisSupport> }) {
  if (!supportIds.length) return null

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {supportIds.map((id) => {
        const support = supportMap.get(id)
        return (
          <div
            key={id}
            style={{
              borderRadius: 6,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-fill-0)',
              padding: 8,
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              #{id}{support?.time_range ? ` · ${support.time_range}` : ''}{support?.speaker ? ` · ${support.speaker}` : ''}
            </p>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{support?.quote || '未找到对应证据片段'}</p>
          </div>
        )
      })}
    </div>
  )
}

function StructuredOverview({ analysis, structured }: { analysis: AIAnalysisResult; structured: AnyRecord }) {
  const scores = getRecord(structured, 'scores')
  const stage = getRecord(getRecord(structured, 'stage'), 'primary_stage')
  const dealStatus = getRecord(structured, 'deal_status')
  const intent = getRecord(structured, 'intent')
  const riskSummary = getRecord(structured, 'risk_summary')
  const actionAudit = getRecord(structured, 'stage_action_audit')
  const stagePass = getRecord(actionAudit, 'stage_pass')
  const coaching = getRecord(structured, 'coaching')
  const score = numberValue(scores?.total_score) ?? numberValue(analysis.quality_score)
  const riskLevel = riskSummary?.overall_risk_level ?? 'NONE'
  const completionRate = actionAudit ? percentText(actionAudit.stage_completion_rate) : '未知'
  const pass = booleanValue(stagePass?.passed)
  const intentLevel = textValue(intent?.intent_level, analysis.customer_intent)
  const analysisVersion = optionalText(structured.analysis_version)
  const promptLabel = [
    analysis.prompt_name,
    analysis.prompt_version ? `v${analysis.prompt_version}` : '',
    analysis.model_config,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          borderRadius: 10,
          border: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-0)',
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <ScoreRing score={score} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <ToneTag tone={scoreTone(score)}>{textValue(scores?.score_level, score === null ? '未评分' : '评分')}</ToneTag>
              <ToneTag tone={riskTone(riskLevel)}>
                风险 {CallAnalysisMappingModel.riskLevelLabel(riskLevel)}
              </ToneTag>
              {scores?.manual_review_required === true && <ToneTag tone="danger">需人工复核</ToneTag>}
              {promptLabel && <Tag size="small" color="grey">{promptLabel}</Tag>}
              {analysisVersion && <Tag size="small" color="grey">{analysisVersion}</Tag>}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7, color: 'var(--semi-color-text-1)' }}>
              {optionalText(coaching?.one_sentence_summary)
                || optionalText(analysis.summary)
                || optionalText(stage?.reason)
                || '暂无摘要'}
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 8,
        }}
      >
        <MetricCard label="电话阶段" value={stageName(stage)} detail={stage?.reason ? textValue(stage.reason) : undefined} tone="info" />
        <MetricCard label="客户意向" value={intentLabelMap[intentLevel] || intentLevel} detail={intent?.reason ? textValue(intent.reason) : undefined} tone={statusTone(intentLevel)} />
        <MetricCard label="成交状态" value={textValue(dealStatus?.status_name, textValue(dealStatus?.status_code))} detail={dealStatus?.reason ? textValue(dealStatus.reason) : undefined} tone={statusTone(dealStatus?.status_code)} />
        <MetricCard label="动作完成率" value={completionRate} detail={`阶段动作分 ${textValue(actionAudit?.stage_action_score, '未知')}/20`} tone={pass === false ? 'danger' : pass === true ? 'success' : 'neutral'} />
        <MetricCard label="阶段是否合格" value={pass === null ? '未知' : pass ? '合格' : '不合格'} detail={stagePass?.reason ? textValue(stagePass.reason) : undefined} tone={pass === false ? 'danger' : pass === true ? 'success' : 'neutral'} />
        <MetricCard label="风险扣分" value={textValue(scores?.risk_deduction, '0')} detail={scores?.score_cap_applied ? `分数上限 ${textValue(scores.score_cap_applied)}` : '无上限'} tone={(numberValue(scores?.risk_deduction) ?? 0) > 0 ? 'warning' : 'success'} />
      </div>

      <Section title="阶段判断证据" icon={<Target style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <EvidenceList items={stage?.evidence} empty="暂无阶段证据" />
      </Section>

      <Section title="评分维度" icon={<Award style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <ScoreDimensions dimensions={scores?.dimensions} />
      </Section>
    </div>
  )
}

function ActionAuditView({ structured }: { structured: AnyRecord }) {
  const audit = getRecord(structured, 'stage_action_audit')
  if (!audit) return <EmptyText>当前结果没有阶段动作审计数据</EmptyText>

  const stagePass = getRecord(audit, 'stage_pass')
  const nextStepQuality = getRecord(audit, 'next_step_quality')
  const nextBestAction = getRecord(audit, 'next_best_action')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section
        title="阶段目标"
        icon={<Route style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}
        right={<ToneTag tone={booleanValue(stagePass?.passed) === false ? 'danger' : booleanValue(stagePass?.passed) === true ? 'success' : 'neutral'}>{booleanValue(stagePass?.passed) === false ? '不合格' : booleanValue(stagePass?.passed) === true ? '合格' : '未知'}</ToneTag>}
      >
        <KeyValueGrid
          items={[
            { label: '阶段目标', value: audit.stage_goal },
            { label: '完成率', value: percentText(audit.stage_completion_rate) },
            { label: '动作分', value: `${textValue(audit.stage_action_score, '-')}/20` },
            { label: '合格判断', value: stagePass?.reason },
          ]}
        />
      </Section>

      <Section title="MUST / SHOULD 动作完成情况" icon={<ListChecks style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <RequiredActionList items={audit.required_actions} />
      </Section>

      <Section title="缺失关键动作" icon={<AlertTriangle style={{ width: 16, height: 16, color: 'var(--semi-color-warning)' }} />}>
        <MissingActions items={audit.missing_actions} />
      </Section>

      <Section title="下一步质量与建议动作" icon={<Target style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <KeyValueGrid
          items={[
            {
              label: '下一步质量',
              value: CallAnalysisMappingModel.nextStepQualityLabel(nextStepQuality?.level),
              tone: statusTone(nextStepQuality?.level),
            },
            { label: '有具体动作', value: nextStepQuality?.has_specific_action },
            { label: '有具体时间', value: nextStepQuality?.has_specific_time },
            { label: '客户确认', value: nextStepQuality?.customer_confirmed },
            { label: '改进建议', value: nextStepQuality?.improvement },
            { label: '最佳动作', value: textValue(nextBestAction?.action_name, textValue(nextBestAction?.action_code)) },
            { label: '负责人', value: nextBestAction?.owner },
            { label: '期限', value: nextBestAction?.deadline },
            { label: '原因', value: nextBestAction?.reason },
          ]}
        />
        {nextBestAction?.suggested_script !== undefined && (
          <div style={{ marginTop: 8 }}>
            <EvidenceList items={[`建议话术：${textValue(nextBestAction.suggested_script)}`]} />
          </div>
        )}
      </Section>

      <Section title="CRM 字段沉淀审计" icon={<ClipboardList style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <CrmFieldAudit fields={audit.required_crm_fields} missingFields={audit.missing_crm_fields} />
      </Section>
    </div>
  )
}

function BoundaryAndBonusView({ structured }: { structured: AnyRecord }) {
  const boundary = getRecord(structured, 'followup_boundary_analysis')
  const scores = getRecord(structured, 'scores')
  const bonus = getRecord(scores, 'responsible_persistence_bonus')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="跟进边界判断" icon={<ShieldCheck style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <KeyValueGrid
          items={[
            {
              label: '拒绝类型',
              value: CallAnalysisMappingModel.refusalTypeLabel(boundary?.customer_refusal_type),
              tone: statusTone(boundary?.customer_refusal_type),
            },
            { label: '明确勿扰', value: boundary?.explicit_do_not_contact, tone: boundary?.explicit_do_not_contact === true ? 'danger' : 'success' },
            { label: '软拒绝', value: boundary?.soft_refusal_detected },
            { label: '强拒绝', value: boundary?.strong_refusal_detected },
            { label: '允许后续联系', value: boundary?.customer_allowed_future_contact },
            { label: '跟进是否尊重边界', value: boundary?.followup_was_respectful, tone: boundary?.followup_was_respectful === false ? 'danger' : 'success' },
            { label: '拒绝后继续推进', value: boundary?.consultant_persisted_after_refusal },
            { label: '推进质量', value: boundary?.persistence_quality, tone: statusTone(boundary?.persistence_quality) },
            { label: '风险/加分判断', value: boundary?.risk_or_bonus_judgment, tone: statusTone(boundary?.risk_or_bonus_judgment) },
          ]}
        />
        {boundary?.evidence !== undefined && (
          <div style={{ marginTop: 8 }}>
            <EvidenceList items={[boundary.evidence]} />
          </div>
        )}
        {boundary?.notes !== undefined && (
          <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--semi-color-text-2)' }}>
            {textValue(boundary.notes)}
          </p>
        )}
      </Section>

      <Section title="销售韧性加分" icon={<Award style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <KeyValueGrid
          items={[
            { label: '加分', value: `${textValue(bonus?.bonus_score, '0')}/${textValue(bonus?.max_bonus, '6')}`, tone: (numberValue(bonus?.bonus_score) ?? 0) > 0 ? 'success' : 'neutral' },
            { label: '是否符合加分条件', value: bonus?.eligible },
            { label: '加分原因', value: bonus?.reason },
            { label: '证据', value: bonus?.evidence },
          ]}
          columns={1}
        />
        <div style={{ marginTop: 10 }}>
          <StructuredTagList title="加分项" items={bonus?.bonus_items} empty="没有销售韧性加分项" />
        </div>
      </Section>
    </div>
  )
}

function RiskAndTagsView({ structured }: { structured: AnyRecord }) {
  const tagging = getRecord(structured, 'tagging')
  const riskSummary = getRecord(structured, 'risk_summary')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="风险摘要" icon={<ShieldAlert style={{ width: 16, height: 16, color: 'var(--semi-color-danger)' }} />}>
        <KeyValueGrid
          items={[
            { label: '整体风险', value: CallAnalysisMappingModel.riskLevelLabel(riskSummary?.overall_risk_level), tone: riskTone(riskSummary?.overall_risk_level) },
            { label: '风险数量', value: riskSummary?.risk_count },
            { label: '严重风险', value: riskSummary?.critical_count, tone: (numberValue(riskSummary?.critical_count) ?? 0) > 0 ? 'danger' : 'neutral' },
            { label: '高风险', value: riskSummary?.high_count, tone: (numberValue(riskSummary?.high_count) ?? 0) > 0 ? 'danger' : 'neutral' },
            { label: '中风险', value: riskSummary?.medium_count, tone: (numberValue(riskSummary?.medium_count) ?? 0) > 0 ? 'warning' : 'neutral' },
            { label: '低风险', value: riskSummary?.low_count },
            { label: '复核原因', value: riskSummary?.manual_review_reason },
          ]}
        />
      </Section>

      <Section title="风险明细" icon={<AlertTriangle style={{ width: 16, height: 16, color: 'var(--semi-color-warning)' }} />}>
        <StructuredTagList title="risk_tags" items={tagging?.risk_tags} empty="暂无风险标签" />
      </Section>

      <Section title="业务标签" icon={<Tags style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <StructuredTagList title="通话目的" items={tagging?.purpose_tags} />
          <StructuredTagList title="客户画像" items={tagging?.customer_tags} />
          <StructuredTagList title="科目标签" items={tagging?.subject_tags} />
          <StructuredTagList title="客户异议" items={tagging?.objection_tags} />
          <StructuredTagList title="转化标签" items={tagging?.conversion_tags} />
          <StructuredTagList title="下一步动作" items={tagging?.next_action_tags} />
        </div>
      </Section>
    </div>
  )
}

function CrmAndCoachingView({ structured }: { structured: AnyRecord }) {
  const customerProfile = getRecord(structured, 'customer_profile')
  const conversion = getRecord(structured, 'conversion_analysis')
  const crmOutput = getRecord(structured, 'crm_output')
  const communication = getRecord(structured, 'communication_analysis')
  const coaching = getRecord(structured, 'coaching')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="客户画像" icon={<UserRound style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <KeyValueGrid
          items={[
            { label: '接听人身份', value: customerProfile?.role_of_answerer },
            { label: '是否直接联系未成年人', value: customerProfile?.is_minor_directly_contacted, tone: customerProfile?.is_minor_directly_contacted === true ? 'danger' : 'neutral' },
            { label: '学生年级', value: customerProfile?.student_grade },
            { label: '学段', value: customerProfile?.school_stage },
            { label: '学校', value: customerProfile?.school_name },
            { label: '提及科目', value: customerProfile?.subjects_mentioned },
            { label: '成绩/考试', value: customerProfile?.scores_or_exam_info },
            { label: '主要痛点', value: customerProfile?.main_pain_points },
            { label: '学习习惯', value: customerProfile?.learning_habits },
            { label: '家长顾虑', value: customerProfile?.parent_concerns },
            { label: '孩子态度', value: customerProfile?.child_attitude },
            { label: '已有补习', value: customerProfile?.existing_training },
            { label: '决策人', value: customerProfile?.decision_makers },
            { label: '预算敏感度', value: customerProfile?.budget_or_price_sensitivity },
            { label: '时间可用性', value: customerProfile?.time_availability },
          ]}
        />
      </Section>

      <Section title="转化与 CRM 输出" icon={<FileText style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <KeyValueGrid
          items={[
            { label: '是否存在下一步', value: conversion?.next_action_exists },
            { label: '下一步动作', value: conversion?.next_action },
            { label: '下一步时间', value: conversion?.next_action_time },
            { label: '负责人', value: conversion?.next_action_owner },
            { label: '预约时间', value: conversion?.appointment_time },
            { label: '预约地点', value: conversion?.appointment_location },
            { label: '付款金额', value: conversion?.payment_amount },
            { label: '付款截止', value: conversion?.payment_deadline },
            { label: '微信跟进', value: conversion?.wechat_follow_up },
            { label: '待发送资料', value: conversion?.materials_to_send },
            { label: '主要阻碍', value: conversion?.main_blockers },
            { label: '推荐下一步', value: conversion?.recommended_next_step },
            { label: '线索温度', value: crmOutput?.lead_temperature, tone: statusTone(crmOutput?.lead_temperature) },
            { label: '通话结果', value: crmOutput?.call_result },
            { label: '跟进优先级', value: crmOutput?.follow_up_priority, tone: statusTone(crmOutput?.follow_up_priority) },
            { label: '跟进期限', value: crmOutput?.follow_up_deadline },
            { label: '建议分配部门', value: crmOutput?.assigned_department_suggestion },
          ]}
        />
        <div style={{ marginTop: 10 }}>
          <KeyValueGrid
            columns={1}
            items={[
              { label: 'CRM 备注', value: crmOutput?.crm_note },
              { label: 'CRM 任务标题', value: crmOutput?.crm_task_title },
              { label: 'CRM 任务描述', value: crmOutput?.crm_task_description },
            ]}
          />
        </div>
      </Section>

      <Section title="沟通质量" icon={<MessageSquare style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <KeyValueGrid
          items={[
            { label: '顾问话量占比', value: communication?.consultant_talk_ratio_estimate === null ? '未知' : percentText(communication?.consultant_talk_ratio_estimate) },
            { label: '打断/压制', value: communication?.interruption_or_over_talking },
            { label: '倾听质量', value: communication?.listening_quality, tone: statusTone(communication?.listening_quality) },
            {
              label: '情绪压力',
              value: CallAnalysisMappingModel.pressureLevelLabel(communication?.emotional_pressure_level),
              tone: statusTone(communication?.emotional_pressure_level),
            },
            { label: '客户情绪', value: communication?.customer_emotion, tone: statusTone(communication?.customer_emotion) },
            { label: '备注', value: communication?.notes },
          ]}
        />
      </Section>

      <Section title="教练建议" icon={<Lightbulb style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <KeyValueGrid
          columns={1}
          items={[
            { label: '一句话总结', value: coaching?.one_sentence_summary },
            { label: '优势', value: coaching?.strengths },
            { label: '改进点', value: coaching?.improvement_points },
            { label: '训练主题', value: coaching?.best_next_training_topic },
          ]}
        />
        <div style={{ marginTop: 10 }}>
          <BetterScriptList items={coaching?.suggested_better_script} />
        </div>
      </Section>
    </div>
  )
}

function EvidenceView({ analysis, structured }: { analysis: AIAnalysisResult; structured: AnyRecord }) {
  const evidenceSummary = getRecord(structured, 'evidence_summary')
  const supports = analysis.supports || []
  const evidence = analysis.evidence || []
  const supportMap = new Map(supports.map((item) => [item.id, item]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="关键原话" icon={<MessageSquareQuote style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <EvidenceList items={evidenceSummary?.key_quotes} empty="暂无关键原话" />
      </Section>

      <Section title="不确定信息" icon={<FileSearch style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
        <EvidenceList items={evidenceSummary?.uncertain_points} empty="暂无不确定项" />
      </Section>

      {(evidence.length > 0 || supports.length > 0) && (
        <Section title="旧版证据引用" icon={<FileSearch style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evidence.map((item, index) => (
              <div key={index} style={{ borderRadius: 8, border: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)', padding: 10 }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{item.claim}</p>
                <LegacyEvidenceRefs supportIds={item.support_ids || []} supportMap={supportMap} />
              </div>
            ))}
            {supports.map((item) => (
              <div key={item.id} style={{ borderRadius: 8, border: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)', padding: 10 }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  #{item.id}{item.time_range ? ` · ${item.time_range}` : ''}{item.speaker ? ` · ${item.speaker}` : ''}
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{item.quote || '无摘录'}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function StructuredAnalysisContent({ analysis, structured }: { analysis: AIAnalysisResult; structured: AnyRecord }) {
  const riskSummary = getRecord(structured, 'risk_summary')
  const riskCount = numberValue(riskSummary?.risk_count) ?? 0
  const defaultTab = riskCount > 0 ? 'risk-tags' : 'overview'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 18 }}>
      <Tabs defaultActiveKey={defaultTab} size="small" lazyRender>
        <TabPane tab="总览" itemKey="overview">
          <div style={{ paddingTop: 6 }}>
            <StructuredOverview analysis={analysis} structured={structured} />
          </div>
        </TabPane>
        <TabPane tab="动作审计" itemKey="actions">
          <div style={{ paddingTop: 6 }}>
            <ActionAuditView structured={structured} />
          </div>
        </TabPane>
        <TabPane tab="边界/韧性" itemKey="boundary">
          <div style={{ paddingTop: 6 }}>
            <BoundaryAndBonusView structured={structured} />
          </div>
        </TabPane>
        <TabPane tab="标签/风险" itemKey="risk-tags">
          <div style={{ paddingTop: 6 }}>
            <RiskAndTagsView structured={structured} />
          </div>
        </TabPane>
        <TabPane tab="CRM/教练" itemKey="crm">
          <div style={{ paddingTop: 6 }}>
            <CrmAndCoachingView structured={structured} />
          </div>
        </TabPane>
        <TabPane tab="证据" itemKey="evidence">
          <div style={{ paddingTop: 6 }}>
            <EvidenceView analysis={analysis} structured={structured} />
          </div>
        </TabPane>
      </Tabs>
    </div>
  )
}

function LegacyAnalysisContent({ analysis }: { analysis: AIAnalysisResult }) {
  const intentLabel = intentLabelMap[analysis.customer_intent] || '未知意向'
  const supports = analysis.supports || []
  const supportMap = new Map(supports.map((item) => [item.id, item]))
  const riskFlags = analysis.risk_flags || []
  const keyInfo = analysis.key_info || {
    customer_needs: [],
    objections: [],
    follow_up_times: [],
    competitors_mentioned: [],
    decision_makers: [],
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 18 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', borderRadius: 10, border: '1px solid var(--semi-color-border)', padding: 14 }}>
        <ScoreRing score={numberValue(analysis.quality_score)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <ToneTag tone={scoreTone(numberValue(analysis.quality_score))}>旧版结果</ToneTag>
            <ToneTag tone={statusTone(analysis.customer_intent)}>{intentLabel}</ToneTag>
            {analysis.prompt_name && <Tag size="small" color="grey">{analysis.prompt_name}{analysis.prompt_version ? ` v${analysis.prompt_version}` : ''}</Tag>}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.7 }}>
            {analysis.summary || '暂无摘要'}
          </p>
        </div>
      </div>

      <Tabs defaultActiveKey={riskFlags.length > 0 ? 'risk' : 'overview'} size="small">
        <TabPane tab="洞察" itemKey="overview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
            <Section title="质量反馈" icon={<Lightbulb style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
                {analysis.quality_feedback || '暂无质量反馈'}
              </p>
            </Section>
            <Section title="关键信息" icon={<Tags style={{ width: 16, height: 16, color: 'var(--semi-color-primary)' }} />}>
              <KeyValueGrid
                items={[
                  { label: '客户需求', value: keyInfo.customer_needs },
                  { label: '客户异议', value: keyInfo.objections },
                  { label: '跟进时间', value: keyInfo.follow_up_times },
                  { label: '提及竞品', value: keyInfo.competitors_mentioned },
                  { label: '决策人', value: keyInfo.decision_makers },
                ]}
              />
            </Section>
          </div>
        </TabPane>

        <TabPane tab="风险" itemKey="risk">
          <div style={{ paddingTop: 6 }}>
            {riskFlags.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {riskFlags.map((risk, index) => (
                  <div key={index} style={{ borderRadius: 8, border: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)', padding: 10 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <ToneTag tone={riskTone(risk.severity)}>
                        {CallAnalysisMappingModel.riskLevelLabel(risk.severity)}
                      </ToneTag>
                      <Tag size="small">{CallAnalysisMappingModel.codeLabel(risk.type)}</Tag>
                      {typeof risk.deduction === 'number' && <Tag size="small" color="grey">扣 {risk.deduction}</Tag>}
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6 }}>{risk.detail}</p>
                    <LegacyEvidenceRefs supportIds={risk.support_ids || []} supportMap={supportMap} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>暂无风险信息</EmptyText>
            )}
          </div>
        </TabPane>

        <TabPane tab="证据" itemKey="evidence">
          <div style={{ paddingTop: 6 }}>
            {supports.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {supports.map((item) => (
                  <div key={item.id} style={{ borderRadius: 8, border: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)', padding: 10 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                      #{item.id}{item.time_range ? ` · ${item.time_range}` : ''}{item.speaker ? ` · ${item.speaker}` : ''}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{item.quote || '无摘录'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>暂无证据片段</EmptyText>
            )}
          </div>
        </TabPane>
      </Tabs>
    </div>
  )
}

function AnalysisContent({ analysis }: { analysis: AIAnalysisResult }) {
  const structured = getStructuredAnalysis(analysis)
  if (structured) {
    return <StructuredAnalysisContent analysis={analysis} structured={structured} />
  }
  return <LegacyAnalysisContent analysis={analysis} />
}

export function AIAnalysisPanel({ record, isAnalyzing, onAnalyze }: AIAnalysisPanelProps) {
  const { ai_analysis, ai_analysis_status } = record

  if (ai_analysis && ai_analysis_status === 'completed') {
    return (
      <div style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        <AnalysisContent analysis={ai_analysis} />
      </div>
    )
  }

  if (ai_analysis_status === 'processing' || isAnalyzing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--semi-color-text-2)' }}>
        <Spin size="large" />
        <p style={{ fontSize: 14, margin: 0 }}>AI 正在分析中，页面会自动刷新结果...</p>
      </div>
    )
  }

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
