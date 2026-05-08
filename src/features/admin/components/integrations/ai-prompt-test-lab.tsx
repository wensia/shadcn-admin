/**
 * 通话分析 Prompt 测试台
 * 用指定模型配置和通话录音验证 call_analysis Prompt 的结构化输出。
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  ListChecks,
  Play,
  RefreshCw,
  Route,
  ShieldAlert,
  Tags,
  Target,
} from 'lucide-react'
import { Button, Empty, Input, InputNumber, Select, Spin, TabPane, Tabs, Tag, Typography } from '@douyinfe/semi-ui-19'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { aiConfigApi } from '../../api'
import type {
  AIConfigItem,
  AIPromptItem,
  CallAnalysisPromptTestJob,
  CallAnalysisPromptTestResult,
  CallAnalysisTestRecordItem,
} from '../../types'

const { Text } = Typography

type AnyRecord = Record<string, unknown>

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
}

function asArray(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as AnyRecord[] : []
}

function textValue(value: unknown, fallback = '未知'): string {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '无'
    return value
      .map((item) => (item && typeof item === 'object' ? JSON.stringify(item, null, 2) : textValue(item, '')))
      .filter(Boolean)
      .join('、')
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return textValue(value)
}

function formatDateTime(value: string | null): string {
  if (!value) return '未知时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0秒'
  const total = Math.max(0, Math.round(seconds))
  const minute = Math.floor(total / 60)
  const second = total % 60
  return minute > 0 ? `${minute}分${String(second).padStart(2, '0')}秒` : `${second}秒`
}

function confidenceText(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return `${Math.round(value * 100)}%`
}

function percentText(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '未知'
  const normalized = value <= 1 ? value * 100 : value
  return `${Math.round(normalized)}%`
}

function getResults(result: CallAnalysisPromptTestResult | null): AnyRecord[] {
  const parsed = asRecord(result?.parsed)
  return asArray(parsed.results)
}

function formatRecordOption(record: CallAnalysisTestRecordItem): string {
  const staff = record.staff_name || '未知顾问'
  const customer = record.customer_name || record.callee || record.caller || '未知客户'
  return `${formatDateTime(record.call_time)} | ${staff} -> ${customer} | ${formatDuration(record.duration)}`
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      style={{
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        background: 'var(--semi-color-bg-0)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon}
        <Text strong>{title}</Text>
      </div>
      {children}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: ReactNode; tone?: 'red' | 'green' | 'amber' }) {
  const color =
    tone === 'red' ? 'var(--semi-color-danger)' :
    tone === 'green' ? 'var(--semi-color-success)' :
    tone === 'amber' ? 'var(--semi-color-warning)' :
    'var(--semi-color-text-0)'

  return (
    <div
      style={{
        minHeight: 76,
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        padding: '12px 14px',
        background: 'var(--semi-color-bg-1)',
      }}
    >
      <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>
        {label}
      </Text>
      <div style={{ color, fontSize: 20, fontWeight: 650, lineHeight: 1.25 }}>{value}</div>
    </div>
  )
}

function KeyValueGrid({ data }: { data: AnyRecord }) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined)
  if (entries.length === 0) {
    return <Text type="tertiary">暂无数据</Text>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
      {entries.map(([key, value]) => (
        <div key={key} style={{ borderBottom: '1px solid var(--semi-color-border)', paddingBottom: 8 }}>
          <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 4 }}>
            {key}
          </Text>
          <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{displayValue(value)}</Text>
        </div>
      ))}
    </div>
  )
}

function EvidenceList({ items }: { items: unknown }) {
  const values = Array.isArray(items) ? items.map((item) => textValue(item, '')).filter(Boolean) : []
  if (values.length === 0) return <Text type="tertiary">暂无证据</Text>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {values.map((item, index) => (
        <Text key={`${item}-${index}`} size="small" style={{ lineHeight: 1.6 }}>
          {index + 1}. {item}
        </Text>
      ))}
    </div>
  )
}

function StatusTag({
  active,
  activeText = '是',
  inactiveText = '否',
}: {
  active: unknown
  activeText?: string
  inactiveText?: string
}) {
  const value = Boolean(active)
  return <Tag color={value ? 'green' : 'orange'} size="small">{value ? activeText : inactiveText}</Tag>
}

function TagList({ items, emptyText = '暂无标签' }: { items: unknown; emptyText?: string }) {
  const list = asArray(items)
  if (list.length === 0) return <Text type="tertiary">{emptyText}</Text>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map((item, index) => {
        const confidence = confidenceText(item.confidence)
        const code = textValue(item.code, '')
        return (
          <div
            key={`${code}-${index}`}
            style={{
              border: '1px solid var(--semi-color-border)',
              borderRadius: 8,
              padding: 12,
              background: 'var(--semi-color-bg-1)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Tag color="blue" size="small">{code || 'UNKNOWN'}</Tag>
              <Text strong>{textValue(item.name, code || '未知标签')}</Text>
              {confidence && <Text type="tertiary" size="small">置信度 {confidence}</Text>}
              {'severity' in item && <Tag color="red" size="small">{textValue(item.severity)}</Tag>}
              {'deduction' in item && <Tag color="orange" size="small">扣 {textValue(item.deduction)} 分</Tag>}
              {'handled' in item && <Tag color={item.handled ? 'green' : 'orange'} size="small">{item.handled ? '已处理' : '未处理'}</Tag>}
            </div>
            {item.evidence ? (
              <Text size="small" type="secondary" style={{ display: 'block', marginTop: 8, lineHeight: 1.6 }}>
                证据：{textValue(item.evidence)}
              </Text>
            ) : null}
            {item.explanation ? (
              <Text size="small" type="secondary" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
                说明：{textValue(item.explanation)}
              </Text>
            ) : null}
            {item.better_response || item.suggested_rewrite ? (
              <Text size="small" type="tertiary" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
                建议：{textValue(item.better_response || item.suggested_rewrite)}
              </Text>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function ActionAuditList({ items }: { items: unknown }) {
  const list = asArray(items)
  if (list.length === 0) return <Text type="tertiary">暂无动作审计</Text>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
      {list.map((item, index) => {
        const completed = item.completed === true
        const code = textValue(item.action_code, `ACTION_${index + 1}`)
        return (
          <div
            key={`${code}-${index}`}
            style={{
              border: '1px solid var(--semi-color-border)',
              borderRadius: 8,
              padding: 12,
              background: 'var(--semi-color-bg-1)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Tag color={item.required_level === 'MUST' ? 'red' : 'blue'} size="small">
                {textValue(item.required_level)}
              </Tag>
              <StatusTag active={completed} activeText="已完成" inactiveText="缺失" />
              <Text strong>{textValue(item.action_name, code)}</Text>
            </div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>
              {code}
            </Text>
            {item.evidence ? (
              <Text size="small" type="secondary" style={{ display: 'block', lineHeight: 1.6 }}>
                证据：{textValue(item.evidence)}
              </Text>
            ) : null}
            {!completed && item.reason_if_missing ? (
              <Text size="small" type="warning" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
                缺失：{textValue(item.reason_if_missing)}
              </Text>
            ) : null}
            {!completed && item.impact_if_missing ? (
              <Text size="small" type="tertiary" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
                影响：{textValue(item.impact_if_missing)}
              </Text>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function MissingActionList({ items }: { items: unknown }) {
  const list = asArray(items)
  if (list.length === 0) return <Text type="tertiary">暂无关键缺失动作</Text>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map((item, index) => (
        <div
          key={`${textValue(item.action_code, 'missing')}-${index}`}
          style={{
            border: '1px solid var(--semi-color-border)',
            borderRadius: 8,
            padding: 12,
            background: 'var(--semi-color-bg-1)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <Tag color={item.severity === 'HIGH' ? 'red' : 'orange'} size="small">{textValue(item.severity)}</Tag>
            <Tag color={item.required_level === 'MUST' ? 'red' : 'blue'} size="small">{textValue(item.required_level)}</Tag>
            <Text strong>{textValue(item.action_name, textValue(item.action_code))}</Text>
          </div>
          {item.why_important ? (
            <Text size="small" type="secondary" style={{ display: 'block', marginTop: 8, lineHeight: 1.6 }}>
              重要性：{textValue(item.why_important)}
            </Text>
          ) : null}
          {item.suggested_script ? (
            <Text size="small" type="tertiary" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
              建议话术：{textValue(item.suggested_script)}
            </Text>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function CrmFieldAuditList({ fields, missingFields }: { fields: unknown; missingFields: unknown }) {
  const fieldList = asArray(fields)
  const missingList = asArray(missingFields)
  if (fieldList.length === 0 && missingList.length === 0) return <Text type="tertiary">暂无 CRM 字段审计</Text>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
      {fieldList.map((item, index) => (
        <div
          key={`${textValue(item.field_name, 'field')}-${index}`}
          style={{
            border: '1px solid var(--semi-color-border)',
            borderRadius: 8,
            padding: 12,
            background: 'var(--semi-color-bg-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <StatusTag active={item.captured === true} activeText="已沉淀" inactiveText="未沉淀" />
            <Text strong>{textValue(item.field_name)}</Text>
          </div>
          <Text size="small" style={{ display: 'block', lineHeight: 1.6 }}>
            {textValue(item.field_value)}
          </Text>
          {item.evidence ? (
            <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
              证据：{textValue(item.evidence)}
            </Text>
          ) : null}
        </div>
      ))}
      {missingList.map((item, index) => (
        <div
          key={`${textValue(item.field_name, 'missing-field')}-${index}`}
          style={{
            border: '1px solid var(--semi-color-danger-light-default)',
            borderRadius: 8,
            padding: 12,
            background: 'var(--semi-color-danger-light-default)',
          }}
        >
          <Tag color="red" size="small" style={{ marginBottom: 6 }}>缺失字段</Tag>
          <Text strong style={{ display: 'block' }}>{textValue(item.field_name)}</Text>
          {item.why_important ? (
            <Text size="small" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
              {textValue(item.why_important)}
            </Text>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function ScoreDimensions({ dimensions }: { dimensions: unknown }) {
  const list = asArray(dimensions)
  if (list.length === 0) return <Text type="tertiary">暂无评分维度</Text>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
      {list.map((item, index) => (
        <div
          key={`${textValue(item.dimension, 'dimension')}-${index}`}
          style={{
            border: '1px solid var(--semi-color-border)',
            borderRadius: 8,
            padding: 12,
            background: 'var(--semi-color-bg-1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <Text strong>{textValue(item.name)}</Text>
            <Text strong>{textValue(item.score, '0')}/{textValue(item.weight, '0')}</Text>
          </div>
          <Text type="secondary" size="small" style={{ lineHeight: 1.6 }}>{textValue(item.reason)}</Text>
        </div>
      ))}
    </div>
  )
}

function ResultOverview({ first }: { first: AnyRecord }) {
  const stage = asRecord(asRecord(first.stage).primary_stage)
  const dealStatus = asRecord(first.deal_status)
  const intent = asRecord(first.intent)
  const scores = asRecord(first.scores)
  const riskSummary = asRecord(first.risk_summary)
  const validity = asRecord(first.validity)
  const actionAudit = asRecord(first.stage_action_audit)
  const pass = asRecord(actionAudit.stage_pass)
  const bonus = asRecord(scores.responsible_persistence_bonus)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <Metric label="主阶段" value={textValue(stage.name || stage.code)} />
        <Metric label="客户意向" value={textValue(intent.intent_level)} />
        <Metric label="成交状态" value={textValue(dealStatus.status_name || dealStatus.status_code)} />
        <Metric label="总分" value={textValue(scores.total_score, '不评分')} tone={Number(scores.total_score) >= 80 ? 'green' : Number(scores.total_score) < 60 ? 'red' : 'amber'} />
        <Metric label="动作完成率" value={percentText(actionAudit.stage_completion_rate)} tone={Number(actionAudit.stage_completion_rate) >= 0.8 ? 'green' : Number(actionAudit.stage_completion_rate) < 0.6 ? 'red' : 'amber'} />
        <Metric label="韧性加分" value={`${textValue(bonus.bonus_score, '0')}/${textValue(bonus.max_bonus, '6')}`} tone={Number(bonus.bonus_score) > 0 ? 'green' : undefined} />
        <Metric label="风险等级" value={textValue(riskSummary.overall_risk_level, 'NONE')} tone={riskSummary.overall_risk_level === 'NONE' ? 'green' : 'red'} />
        <Metric label="阶段合格" value={pass.passed === false ? '未通过' : '通过'} tone={pass.passed === false ? 'red' : 'green'} />
        <Metric label="有效性" value={validity.is_valid_call === false ? '无效通话' : '有效通话'} tone={validity.is_valid_call === false ? 'red' : 'green'} />
      </div>

      <Section title="阶段与意向依据" icon={<ClipboardList size={16} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(220px, 1fr)', gap: 16 }}>
          <div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>阶段原因</Text>
            <Text style={{ lineHeight: 1.7 }}>{textValue(stage.reason)}</Text>
            <div style={{ marginTop: 10 }}>
              <EvidenceList items={stage.evidence} />
            </div>
          </div>
          <div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>意向判断</Text>
            <Text style={{ lineHeight: 1.7 }}>{textValue(intent.reason)}</Text>
            <div style={{ marginTop: 10 }}>
              <EvidenceList items={asRecord(first.evidence_summary).key_quotes} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="评分维度" icon={<CheckCircle2 size={16} />}>
        <ScoreDimensions dimensions={scores.dimensions} />
      </Section>
    </div>
  )
}

function ResultTags({ first }: { first: AnyRecord }) {
  const tagging = asRecord(first.tagging)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      <Section title="通话目的" icon={<Tags size={16} />}><TagList items={tagging.purpose_tags} /></Section>
      <Section title="客户画像标签"><TagList items={tagging.customer_tags} /></Section>
      <Section title="科目标签"><TagList items={tagging.subject_tags} /></Section>
      <Section title="异议标签"><TagList items={tagging.objection_tags} /></Section>
      <Section title="转化标签"><TagList items={tagging.conversion_tags} /></Section>
      <Section title="下一步动作"><TagList items={tagging.next_action_tags} /></Section>
    </div>
  )
}

function ResultActionAudit({ first }: { first: AnyRecord }) {
  const audit = asRecord(first.stage_action_audit)
  const pass = asRecord(audit.stage_pass)
  const nextStepQuality = asRecord(audit.next_step_quality)
  const nextBestAction = asRecord(audit.next_best_action)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="阶段动作完成情况" icon={<ListChecks size={16} />}>
        {audit.stage_goal ? (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, lineHeight: 1.7 }}>
            阶段目标：{textValue(audit.stage_goal)}
          </Text>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
          <Metric label="完成率" value={percentText(audit.stage_completion_rate)} tone={Number(audit.stage_completion_rate) >= 0.8 ? 'green' : Number(audit.stage_completion_rate) < 0.6 ? 'red' : 'amber'} />
          <Metric label="动作分" value={textValue(audit.stage_action_score, '0')} tone={Number(audit.stage_action_score) >= 16 ? 'green' : Number(audit.stage_action_score) < 12 ? 'red' : 'amber'} />
          <Metric label="阶段是否合格" value={pass.passed === false ? '未通过' : '通过'} tone={pass.passed === false ? 'red' : 'green'} />
        </div>
        {pass.reason ? (
          <Text type={pass.passed === false ? 'warning' : 'secondary'} style={{ display: 'block', marginBottom: 12, lineHeight: 1.6 }}>
            {textValue(pass.reason)}
          </Text>
        ) : null}
        <ActionAuditList items={audit.required_actions} />
      </Section>

      <Section title="关键缺失动作" icon={<AlertTriangle size={16} />}>
        <MissingActionList items={audit.missing_actions} />
      </Section>

      <Section title="CRM 字段沉淀" icon={<ClipboardList size={16} />}>
        <CrmFieldAuditList fields={audit.required_crm_fields} missingFields={audit.missing_crm_fields} />
      </Section>

      <Section title="下一步动作质量" icon={<Route size={16} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(240px, 1fr)', gap: 16 }}>
          <KeyValueGrid
            data={{
              质量等级: nextStepQuality.level,
              具体动作: nextStepQuality.has_specific_action,
              具体时间: nextStepQuality.has_specific_time,
              负责人: nextStepQuality.has_owner,
              客户确认: nextStepQuality.customer_confirmed,
              证据: nextStepQuality.evidence,
              改进建议: nextStepQuality.improvement,
            }}
          />
          <KeyValueGrid
            data={{
              最佳动作: textValue(nextBestAction.action_name, textValue(nextBestAction.action_code)),
              负责人: nextBestAction.owner,
              截止时间: nextBestAction.deadline,
              原因: nextBestAction.reason,
              建议话术: nextBestAction.suggested_script,
            }}
          />
        </div>
      </Section>
    </div>
  )
}

function ResultBoundaryAndBonus({ first }: { first: AnyRecord }) {
  const boundary = asRecord(first.followup_boundary_analysis)
  const scores = asRecord(first.scores)
  const bonus = asRecord(scores.responsible_persistence_bonus)
  const bonusItems = asArray(bonus.bonus_items)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Section title="跟进边界判断" icon={<ShieldAlert size={16} />}>
        <KeyValueGrid
          data={{
            拒绝类型: boundary.customer_refusal_type,
            明确勿扰: boundary.explicit_do_not_contact,
            软拒绝: boundary.soft_refusal_detected,
            强拒绝: boundary.strong_refusal_detected,
            允许后续联系: boundary.customer_allowed_future_contact,
            跟进是否尊重边界: boundary.followup_was_respectful,
            拒绝后是否继续推进: boundary.consultant_persisted_after_refusal,
            推进质量: boundary.persistence_quality,
            风险或加分判断: boundary.risk_or_bonus_judgment,
            证据: boundary.evidence,
            备注: boundary.notes,
          }}
        />
      </Section>

      <Section title="销售韧性加分" icon={<Target size={16} />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
          <Metric label="加分" value={`${textValue(bonus.bonus_score, '0')}/${textValue(bonus.max_bonus, '6')}`} tone={Number(bonus.bonus_score) > 0 ? 'green' : undefined} />
          <Metric label="是否符合加分条件" value={bonus.eligible === false ? '否' : '是'} tone={bonus.eligible === false ? 'amber' : 'green'} />
          <Metric label="原始总分" value={textValue(scores.raw_total_score, '未知')} />
          <Metric label="分数上限" value={textValue(scores.score_cap_applied, '无')} tone={scores.score_cap_applied ? 'red' : undefined} />
        </div>
        {bonus.reason ? (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12, lineHeight: 1.6 }}>
            {textValue(bonus.reason)}
          </Text>
        ) : null}
        {bonus.evidence ? (
          <Text type="tertiary" style={{ display: 'block', marginBottom: 12, lineHeight: 1.6 }}>
            证据：{textValue(bonus.evidence)}
          </Text>
        ) : null}
        {bonusItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bonusItems.map((item, index) => (
              <div
                key={`${textValue(item.bonus_type, 'bonus')}-${index}`}
                style={{
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'var(--semi-color-bg-1)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Tag color="green" size="small">+{textValue(item.bonus_score, '0')}</Tag>
                  <Text strong>{textValue(item.bonus_type)}</Text>
                </div>
                <Text size="small" type="secondary" style={{ display: 'block', lineHeight: 1.6 }}>
                  {textValue(item.explanation)}
                </Text>
                {item.evidence ? (
                  <Text size="small" type="tertiary" style={{ display: 'block', marginTop: 6, lineHeight: 1.6 }}>
                    证据：{textValue(item.evidence)}
                  </Text>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Text type="tertiary">暂无韧性加分明细</Text>
        )}
      </Section>
    </div>
  )
}

function RawJsonView({ result }: { result: CallAnalysisPromptTestResult }) {
  const content = result.parsed ? JSON.stringify(result.parsed, null, 2) : result.raw_content
  return (
    <pre
      style={{
        margin: 0,
        maxHeight: 640,
        overflow: 'auto',
        border: '1px solid var(--semi-color-border)',
        borderRadius: 8,
        padding: 14,
        background: 'var(--semi-color-bg-1)',
        fontSize: 12,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {content}
    </pre>
  )
}

export function AIPromptTestLab() {
  const [selectedConfigId, setSelectedConfigId] = useState('')
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [recordSearchInput, setRecordSearchInput] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const [temperature, setTemperature] = useState(0.2)
  const [latestResult, setLatestResult] = useState<CallAnalysisPromptTestResult | null>(null)
  const [activeJobId, setActiveJobId] = useState('')
  const [settledJobId, setSettledJobId] = useState('')

  const configsQuery = useQuery({
    queryKey: ['admin-ai-configs-test-lab'],
    queryFn: () => aiConfigApi.list({ is_active: true, limit: 100 }),
  })

  const promptsQuery = useQuery({
    queryKey: ['admin-ai-prompts-call-analysis-test-lab'],
    queryFn: () => aiConfigApi.listPrompts({ scene_key: 'call_analysis', limit: 100 }),
  })

  const recordsQuery = useQuery({
    queryKey: ['admin-ai-call-analysis-test-records', recordSearch],
    queryFn: () => aiConfigApi.listCallAnalysisTestRecords({ search: recordSearch || undefined, page: 1, size: 30 }),
  })

  const configs = useMemo(() => configsQuery.data?.items || [], [configsQuery.data?.items])
  const prompts = useMemo(() => promptsQuery.data?.items || [], [promptsQuery.data?.items])
  const records = useMemo(() => recordsQuery.data?.items || [], [recordsQuery.data?.items])

  useEffect(() => {
    if (selectedConfigId || configs.length === 0) return
    setSelectedConfigId((configs.find((item) => item.is_default) || configs[0]).id)
  }, [configs, selectedConfigId])

  useEffect(() => {
    if (selectedPromptId || prompts.length === 0) return
    const preferred =
      prompts.find((item) => item.content.includes('k12_crm_call_quality_v4')) ||
      prompts.find((item) => item.name.includes('K12') || item.content.includes('k12_crm_call_quality_v2')) ||
      prompts.find((item) => item.is_active) ||
      prompts[0]
    setSelectedPromptId(preferred.id)
  }, [prompts, selectedPromptId])

  useEffect(() => {
    if (selectedRecordId || records.length === 0) return
    setSelectedRecordId(records[0].id)
  }, [records, selectedRecordId])

  const selectedConfig = configs.find((item) => item.id === selectedConfigId)
  const selectedPrompt = prompts.find((item) => item.id === selectedPromptId)
  const selectedRecord = records.find((item) => item.id === selectedRecordId)

  const startMutation = useMutation({
    mutationFn: () => aiConfigApi.startCallAnalysisPromptTest({
      config_id: selectedConfigId,
      prompt_id: selectedPromptId,
      call_record_id: selectedRecordId,
      temperature,
    }),
    onSuccess: (job) => {
      setLatestResult(null)
      setSettledJobId('')
      setActiveJobId(job.job_id)
      toast.success('测试任务已提交，正在轮询结果')
    },
    onError: (error: Error) => showApiErrorToast(error, '提交测试任务失败'),
  })

  const jobQuery = useQuery({
    queryKey: ['admin-ai-call-analysis-test-job', activeJobId],
    queryFn: () => aiConfigApi.getCallAnalysisPromptTestJob(activeJobId),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const job = query.state.data as CallAnalysisPromptTestJob | undefined
      if (job?.status === 'completed' || job?.status === 'failed') return false
      return 2000
    },
  })

  useEffect(() => {
    const job = jobQuery.data
    if (!job || job.job_id === settledJobId) return

    if (job.status === 'completed' && job.result) {
      setLatestResult(job.result)
      setSettledJobId(job.job_id)
      setActiveJobId('')
      if (job.result.parse_error) {
        toast.warning('模型已返回结果，但 JSON 解析失败')
      } else if (job.result.schema_warning) {
        toast.warning(job.result.schema_warning)
      } else {
        toast.success('Prompt 测试完成')
      }
    } else if (job.status === 'failed') {
      setSettledJobId(job.job_id)
      setActiveJobId('')
      toast.error(job.error_message || 'Prompt 测试失败')
    }
  }, [jobQuery.data, settledJobId])

  const firstResult = getResults(latestResult)[0] || null
  const currentJob = jobQuery.data
  const isJobRunning = Boolean(activeJobId) && (!currentJob || currentJob.status === 'queued' || currentJob.status === 'running')
  const canRun = Boolean(selectedConfigId && selectedPromptId && selectedRecordId) && !startMutation.isPending && !isJobRunning

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px 20px 24px', background: 'var(--semi-color-bg-0)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <section
          style={{
            position: 'sticky',
            top: 0,
            border: '1px solid var(--semi-color-border)',
            borderRadius: 8,
            padding: 16,
            background: 'var(--semi-color-bg-0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FlaskConical size={18} />
            <Text strong>通话分析 Prompt 测试</Text>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>模型配置</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedConfigId || undefined}
                loading={configsQuery.isLoading}
                placeholder="选择启用中的模型配置"
                onChange={(value) => setSelectedConfigId(String(value || ''))}
                optionList={configs.map((item: AIConfigItem) => ({
                  value: item.id,
                  label: `${item.name}${item.is_default ? '（默认）' : ''} | ${item.provider} | ${item.default_model || item.endpoint_id || '未配置模型'}`,
                }))}
              />
            </div>

            <div>
              <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>Prompt 版本</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedPromptId || undefined}
                loading={promptsQuery.isLoading}
                placeholder="选择 call_analysis Prompt"
                onChange={(value) => setSelectedPromptId(String(value || ''))}
                optionList={prompts.map((item: AIPromptItem) => ({
                  value: item.id,
                  label: `${item.name} v${item.version}${item.is_active ? '（激活中）' : ''}`,
                }))}
              />
              {selectedPrompt && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Tag color={selectedPrompt.is_active ? 'green' : 'grey'} size="small">
                    {selectedPrompt.is_active ? '正式激活' : '未激活测试'}
                  </Tag>
                  {selectedPrompt.content.includes('k12_crm_call_quality_v4') && <Tag color="blue" size="small">K12 v4</Tag>}
                  {!selectedPrompt.content.includes('k12_crm_call_quality_v4') && selectedPrompt.content.includes('k12_crm_call_quality_v2') && <Tag color="blue" size="small">K12 v2</Tag>}
                </div>
              )}
            </div>

            <div>
              <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>通话录音</Text>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input
                  value={recordSearchInput}
                  placeholder="搜索顾问、客户、手机号、部门"
                  onChange={(value) => setRecordSearchInput(value)}
                  onEnterPress={() => {
                    setSelectedRecordId('')
                    setRecordSearch(recordSearchInput.trim())
                  }}
                />
                <Button
                  icon={<RefreshCw size={14} />}
                  onClick={() => {
                    setSelectedRecordId('')
                    setRecordSearch(recordSearchInput.trim())
                  }}
                  loading={recordsQuery.isFetching}
                />
              </div>
              <Select
                style={{ width: '100%' }}
                value={selectedRecordId || undefined}
                loading={recordsQuery.isLoading || recordsQuery.isFetching}
                placeholder="选择已完成转写的通话"
                onChange={(value) => setSelectedRecordId(String(value || ''))}
                optionList={records.map((item) => ({
                  value: item.id,
                  label: formatRecordOption(item),
                }))}
              />
              <Text type="tertiary" size="small" style={{ display: 'block', marginTop: 8 }}>
                已加载 {records.length} 条，匹配总数 {recordsQuery.data?.total ?? 0} 条
              </Text>
            </div>

            <div>
              <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>Temperature</Text>
              <InputNumber
                style={{ width: '100%' }}
                value={temperature}
                min={0}
                max={1}
                step={0.1}
                onChange={(value) => setTemperature(Number(value) || 0)}
              />
            </div>

            {selectedRecord && (
              <div
                style={{
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 8,
                  padding: 12,
                  background: 'var(--semi-color-bg-1)',
                }}
              >
                <Text strong style={{ display: 'block', marginBottom: 8 }}>当前通话</Text>
                <Text size="small" style={{ display: 'block', lineHeight: 1.7 }}>
                  顾问：{selectedRecord.staff_name || '未知'}<br />
                  客户：{selectedRecord.customer_name || selectedRecord.callee || '未知'}<br />
                  部门：{selectedRecord.department || '未知'}<br />
                  时间：{formatDateTime(selectedRecord.call_time)}<br />
                  时长：{formatDuration(selectedRecord.duration)}
                </Text>
              </div>
            )}

            <Button
              type="primary"
              theme="solid"
              icon={<Play size={15} />}
              loading={startMutation.isPending || isJobRunning}
              disabled={!canRun}
              onClick={() => startMutation.mutate()}
              style={{ width: '100%' }}
            >
              {isJobRunning ? '分析中，正在轮询结果' : '提交测试任务（会调用模型）'}
            </Button>

            <Text type="tertiary" size="small" style={{ lineHeight: 1.6 }}>
              测试任务会后台调用模型，页面每 2 秒轮询一次状态；结果只在本页展示并写入调用日志，不会覆盖通话记录的正式 AI 分析结果。
            </Text>
          </div>
        </section>

        <main style={{ minWidth: 0 }}>
          {startMutation.isPending || isJobRunning ? (
            <Section title="正在测试" icon={<FlaskConical size={16} />}>
              <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin
                  size="large"
                  tip={
                    currentJob
                      ? `任务状态：${currentJob.status}，正在轮询结果...`
                      : '正在提交测试任务...'
                  }
                />
              </div>
            </Section>
          ) : !latestResult ? (
            <Section title="测试结果" icon={<ClipboardList size={16} />}>
              <Empty description="选择模型配置、Prompt 和通话录音后运行测试" />
            </Section>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(latestResult.parse_error || latestResult.schema_warning) && (
                <Section title="结构提示" icon={<AlertTriangle size={16} />}>
                  {latestResult.parse_error && (
                    <Text type="danger" style={{ display: 'block', lineHeight: 1.7 }}>
                      JSON 解析失败：{latestResult.parse_error}
                    </Text>
                  )}
                  {latestResult.schema_warning && (
                    <Text type="warning" style={{ display: 'block', lineHeight: 1.7 }}>
                      {latestResult.schema_warning}
                    </Text>
                  )}
                </Section>
              )}

              <Section title="本次调用" icon={<FlaskConical size={16} />}>
                <KeyValueGrid
                  data={{
                    模型配置: `${latestResult.config.name} / ${latestResult.config.provider}`,
                    模型: latestResult.model,
                    Prompt: `${latestResult.prompt.name} v${latestResult.prompt.version}`,
                    通话: formatRecordOption(latestResult.record),
                    耗时: `${latestResult.duration_ms} ms`,
                  }}
                />
              </Section>

              {firstResult ? (
                <Tabs type="line" defaultActiveKey="overview">
                  <TabPane tab="总览" itemKey="overview">
                    <ResultOverview first={firstResult} />
                  </TabPane>
                  <TabPane tab="动作审计" itemKey="actions">
                    <ResultActionAudit first={firstResult} />
                  </TabPane>
                  <TabPane tab="边界/韧性" itemKey="boundary">
                    <ResultBoundaryAndBonus first={firstResult} />
                  </TabPane>
                  <TabPane tab="标签" itemKey="tags">
                    <ResultTags first={firstResult} />
                  </TabPane>
                  <TabPane tab="风险" itemKey="risks">
                    <Section title="风险识别" icon={<ShieldAlert size={16} />}>
                      <TagList items={asRecord(firstResult.tagging).risk_tags} emptyText="未识别到风险标签" />
                    </Section>
                  </TabPane>
                  <TabPane tab="CRM 输出" itemKey="crm">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <Section title="客户画像"><KeyValueGrid data={asRecord(firstResult.customer_profile)} /></Section>
                      <Section title="转化分析"><KeyValueGrid data={asRecord(firstResult.conversion_analysis)} /></Section>
                      <Section title="CRM 写入建议"><KeyValueGrid data={asRecord(firstResult.crm_output)} /></Section>
                    </div>
                  </TabPane>
                  <TabPane tab="教练建议" itemKey="coaching">
                    <Section title="顾问改进建议">
                      <KeyValueGrid data={asRecord(firstResult.coaching)} />
                    </Section>
                  </TabPane>
                  <TabPane tab="原始 JSON" itemKey="raw">
                    <RawJsonView result={latestResult} />
                  </TabPane>
                </Tabs>
              ) : (
                <RawJsonView result={latestResult} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
