import { useMemo, useState, type ReactNode } from 'react'
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  SideSheet,
  Tag,
  TextArea,
  Typography,
} from '@douyinfe/semi-ui-19'
import { ClipboardCheck, Link2, NotebookPen } from 'lucide-react'
import { formatDurationShort } from '../utils/advisor-call-stats'
import type {
  AdvisorTaskCandidate,
  AdvisorTaskDetailData,
  AdvisorTaskManualEntryPayload,
  AdvisorTaskManualReviewPayload,
  AdvisorTaskRow,
} from '../api/advisor-task-api'

const { Text, Title } = Typography

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function getFinalStatusText(status?: string) {
  switch (status) {
    case 'auto_pass':
      return '自动达标'
    case 'manual_pass':
      return '人工达标'
    case 'failed':
      return '未达标'
    default:
      return '待主管确认'
  }
}

function getReviewStatusText(status?: string) {
  switch (status) {
    case 'approved':
      return '已审核'
    case 'rejected':
      return '已驳回'
    default:
      return '待审核'
  }
}

function getCandidateStatusMeta(status: AdvisorTaskCandidate['status']) {
  switch (status) {
    case 'approved':
      return { label: '已通过', color: '#15803d', background: '#dcfce7' }
    case 'rejected':
      return { label: '已驳回', color: '#dc2626', background: '#fee2e2' }
    case 'pending_review':
      return { label: '待确认', color: '#d97706', background: '#fff7ed' }
    default:
      return { label: '未生效', color: '#64748b', background: '#f8fafc' }
  }
}

export function AdvisorTaskReviewDrawer({
  open,
  selectedRow,
  detail,
  loading,
  actionsReady,
  onClose,
  onSubmitManualEntry,
  onSubmitReview,
  manualEntryLoading,
  manualReviewLoading,
}: {
  open: boolean
  selectedRow: AdvisorTaskRow | null
  detail: AdvisorTaskDetailData | null
  loading?: boolean
  actionsReady?: boolean
  onClose: () => void
  onSubmitManualEntry: (payload: AdvisorTaskManualEntryPayload) => void
  onSubmitReview: (payload: AdvisorTaskManualReviewPayload) => void
  manualEntryLoading?: boolean
  manualReviewLoading?: boolean
}) {
  const row = detail?.row ?? selectedRow ?? null

  return (
    <SideSheet
      title="主管确认"
      visible={open}
      onCancel={onClose}
      width={620}
      bodyStyle={{ background: '#f8fafc', padding: 18 }}
    >
      {loading && !detail ? (
        <Card bodyStyle={{ padding: 20 }}>
          <Text type="tertiary">正在加载顾问任务明细...</Text>
        </Card>
      ) : !row ? (
        <Empty
          image={<ClipboardCheck size={44} style={{ color: '#94a3b8' }} />}
          title="暂无任务明细"
          description="请从任务考核表中选择顾问查看详情。"
        />
      ) : (
        <ReviewDrawerContent
          key={[
            row.advisorId,
            row.recordId ?? row.rangeStart,
            row.rangeEnd,
            detail?.manualEntry?.evidenceUrl ?? row.evidenceUrl ?? '',
            detail?.manualEntry?.note ?? row.reviewNote ?? '',
            detail?.manualEntry?.wechatAddedVerifiedCount ?? 0,
            detail?.manualEntry?.momentsDays ?? 0,
            detail?.manualEntry?.visitReceptionMinutesDeduction ?? 0,
            detail?.manualEntry?.wechatDeductionCount ?? 0,
            detail?.manualEntry?.trialPaymentExemption ? '1' : '0',
            detail?.manualEntry?.weeklyPromisedExemption ? '1' : '0',
            detail?.manualEntry?.promiseScreenshotProvided ? '1' : '0',
          ].join('|')}
          row={row}
          detail={detail}
          actionsReady={actionsReady}
          onClose={onClose}
          onSubmitManualEntry={onSubmitManualEntry}
          onSubmitReview={onSubmitReview}
          manualEntryLoading={manualEntryLoading}
          manualReviewLoading={manualReviewLoading}
        />
      )}
    </SideSheet>
  )
}

function ReviewDrawerContent({
  row,
  detail,
  actionsReady,
  onClose,
  onSubmitManualEntry,
  onSubmitReview,
  manualEntryLoading,
  manualReviewLoading,
}: {
  row: AdvisorTaskRow
  detail: AdvisorTaskDetailData | null
  actionsReady?: boolean
  onClose: () => void
  onSubmitManualEntry: (payload: AdvisorTaskManualEntryPayload) => void
  onSubmitReview: (payload: AdvisorTaskManualReviewPayload) => void
  manualEntryLoading?: boolean
  manualReviewLoading?: boolean
}) {
  const manualEntry = detail?.manualEntry

  const [evidenceUrl, setEvidenceUrl] = useState(() => manualEntry?.evidenceUrl || row.evidenceUrl || '')
  const [note, setNote] = useState(() => manualEntry?.note || row.reviewNote || '')
  const [wechatAddedVerifiedCount, setWechatAddedVerifiedCount] = useState(() => manualEntry?.wechatAddedVerifiedCount || 0)
  const [momentsDays, setMomentsDays] = useState(() => manualEntry?.momentsDays || 0)
  const [visitReceptionMinutesDeduction, setVisitReceptionMinutesDeduction] = useState(() => manualEntry?.visitReceptionMinutesDeduction || 0)
  const [wechatDeductionCount, setWechatDeductionCount] = useState(() => manualEntry?.wechatDeductionCount || 0)
  const [trialPaymentExemption, setTrialPaymentExemption] = useState(() => manualEntry?.trialPaymentExemption || false)
  const [weeklyPromisedExemption, setWeeklyPromisedExemption] = useState(() => manualEntry?.weeklyPromisedExemption || false)
  const [promiseScreenshotProvided, setPromiseScreenshotProvided] = useState(() => manualEntry?.promiseScreenshotProvided || false)
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<string[]>(() =>
    row.manualCandidates
      .filter((candidate) => candidate.status === 'pending_review')
      .map((candidate) => candidate.key),
  )

  const pendingCandidates = useMemo(
    () => row.manualCandidates.filter((candidate) => candidate.status === 'pending_review'),
    [row.manualCandidates],
  )

  const processedCandidates = useMemo(
    () => row.manualCandidates.filter((candidate) => candidate.status === 'approved' || candidate.status === 'rejected'),
    [row.manualCandidates],
  )

  const approvedKeys = useMemo(
    () => row.manualCandidates.filter((candidate) => candidate.status === 'approved').map((candidate) => candidate.key),
    [row.manualCandidates],
  )

  const rejectedKeys = useMemo(
    () => row.manualCandidates.filter((candidate) => candidate.status === 'rejected').map((candidate) => candidate.key),
    [row.manualCandidates],
  )

  const submitReady = Boolean(actionsReady && row.editable)
  const reviewDisabled = !submitReady
  const saveDisabled = !submitReady

  const handleManualEntrySubmit = () => {
    onSubmitManualEntry({
      note: note || undefined,
      evidence_url: evidenceUrl || undefined,
      wechat_added_verified_count: wechatAddedVerifiedCount || undefined,
      moments_days: momentsDays || undefined,
      visit_reception_minutes_deduction: visitReceptionMinutesDeduction || undefined,
      wechat_deduction_count: wechatDeductionCount || undefined,
      trial_payment_exemption: trialPaymentExemption,
      weekly_promised_exemption: weeklyPromisedExemption,
      promise_screenshot_provided: promiseScreenshotProvided,
    })
  }

  const handleReviewSubmit = (action: 'approve' | 'reject') => {
    const nextApprovedCandidateKeys = action === 'approve'
      ? Array.from(new Set([...approvedKeys, ...selectedCandidateKeys]))
      : approvedKeys

    const nextRejectedCandidateKeys = action === 'reject'
      ? Array.from(new Set([...rejectedKeys, ...selectedCandidateKeys]))
      : rejectedKeys

    onSubmitReview({
      action,
      review_note: note || undefined,
      evidence_url: evidenceUrl || undefined,
      approved_candidate_keys: nextApprovedCandidateKeys,
      rejected_candidate_keys: nextRejectedCandidateKeys,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!row.editable && (
        <Banner
          type="warning"
          bordered
          title="当前是日期区间汇总"
          description="此场景只提供只读查看。补录与主管审核需要切回指定单日后进行。"
        />
      )}

      {row.editable && !submitReady && (
        <Banner
          type="info"
          bordered
          title="正在同步最新记录"
          description="抽屉已打开，系统正在拉取该顾问当前筛选口径下的最新任务记录。待详情加载完成后，才可提交补录与主管审核。"
        />
      )}

      <Card
        style={{
          borderRadius: 16,
          border: '1px solid #dbe3ef',
          background: '#ffffff',
        }}
        bodyStyle={{ padding: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Title heading={6} style={{ margin: 0, color: '#0f172a' }}>
              {row.advisorName}
            </Title>
            <Text type="tertiary" size="small">
              {row.campusName || '未分配校区'}
            </Text>
            <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
              统计范围：{row.rangeStart === row.rangeEnd ? row.rangeStart : `${row.rangeStart} 至 ${row.rangeEnd}`}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <Tag
              size="small"
              style={{
                borderRadius: 999,
                border: '1px solid #dbe3ef',
                background: '#f8fafc',
                color: '#334155',
              }}
            >
              {getFinalStatusText(row.finalStatus)}
            </Tag>
            <Tag
              size="small"
              style={{
                borderRadius: 999,
                border: '1px solid #dbe3ef',
                background: '#f8fafc',
                color: '#475569',
              }}
            >
              审核状态：{getReviewStatusText(row.reviewStatus)}
            </Tag>
          </div>
        </div>
      </Card>

      <Card
        style={{ borderRadius: 16, border: '1px solid #dbe3ef', background: '#ffffff' }}
        bodyStyle={{ padding: 18 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <MetricCell label="呼出量" value={formatCount(row.outboundCallCount)} />
          <MetricCell label="接通量" value={formatCount(row.connectedCount)} />
          <MetricCell label="通时" value={formatDurationShort(row.callDurationSeconds)} />
          <MetricCell label="40秒以上" value={formatCount(row.longCall40Count)} />
          <MetricCell label="60秒以上" value={formatCount(row.longCall60Count)} />
          <MetricCell label="诺到数" value={formatCount(row.promisedCount)} />
          <MetricCell label="到访数" value={formatCount(row.visitedCount)} />
          <MetricCell label="试听缴费" value={formatCount(row.trialPaymentCandidateCount)} />
          <MetricCell label="缴费笔数" value={formatCount(row.paymentCount)} />
          <MetricCell label="缴费金额" value={`¥${formatCount(row.paymentAmount)}`} />
          <MetricCell label="微信候选数" value={formatCount(row.wechatCandidateCount)} />
          <MetricCell label="本周实到 / 诺到" value={`${formatCount(row.weeklyVisitedCount)} / ${formatCount(row.weeklyPromisedCount)}`} />
        </div>
      </Card>

      <Card
        style={{ borderRadius: 16, border: '1px solid #dbe3ef', background: '#ffffff' }}
        bodyStyle={{ padding: 18 }}
      >
        <SectionTitle icon={<ClipboardCheck size={15} />} title="自动规则命中" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {row.autoRuleHits.length ? row.autoRuleHits.map((rule) => (
            <Tag
              key={rule.key}
              size="small"
              style={{ borderRadius: 999, background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}
            >
              {rule.label}
            </Tag>
          )) : <Text type="tertiary">当前没有自动命中规则</Text>}
        </div>
      </Card>

      <Card
        style={{ borderRadius: 16, border: '1px solid #dbe3ef', background: '#ffffff' }}
        bodyStyle={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <SectionTitle icon={<NotebookPen size={15} />} title="手工候选项与主管处理" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendingCandidates.length ? pendingCandidates.map((candidate) => {
            const checked = selectedCandidateKeys.includes(candidate.key)
            return (
              <div
                key={candidate.key}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: checked ? '#eff6ff' : '#f8fafc',
                }}
              >
                <Checkbox
                  checked={checked}
                  disabled={reviewDisabled}
                  onChange={(event) => {
                    const nextChecked = Boolean(event?.target?.checked)
                    setSelectedCandidateKeys((current) => {
                      if (nextChecked) {
                        return Array.from(new Set([...current, candidate.key]))
                      }
                      return current.filter((key) => key !== candidate.key)
                    })
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{candidate.label}</span>
                </Checkbox>
                {candidate.description && (
                  <Text type="tertiary" size="small" style={{ marginTop: 6, display: 'block' }}>
                    {candidate.description}
                  </Text>
                )}
                {candidate.evidenceRequired && (
                  <Text size="small" style={{ marginTop: 6, display: 'block', color: '#1d4ed8' }}>
                    该候选项要求补充截图或证明链接。
                  </Text>
                )}
              </div>
            )
          }) : (
            <Text type="tertiary">当前没有待主管确认的候选项。</Text>
          )}
        </div>

        {processedCandidates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Text strong style={{ color: '#334155' }}>已处理项</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {processedCandidates.map((candidate) => {
                const meta = getCandidateStatusMeta(candidate.status)
                return (
                  <Tag
                    key={candidate.key}
                    size="small"
                    style={{
                      borderRadius: 999,
                      background: meta.background,
                      color: meta.color,
                      border: '1px solid #dbe3ef',
                    }}
                  >
                    {candidate.label} · {meta.label}
                  </Tag>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <FieldBlock label="截图链接" icon={<Link2 size={14} />}>
            <Input
              value={evidenceUrl}
              disabled={saveDisabled}
              onChange={(value) => setEvidenceUrl(value)}
              placeholder="填写微信截图或证明链接"
            />
          </FieldBlock>

          <FieldBlock label="人工确认新增微信数">
            <InputNumber
              value={wechatAddedVerifiedCount}
              min={0}
              disabled={saveDisabled}
              style={{ width: '100%' }}
              onChange={(value) => setWechatAddedVerifiedCount(Number(value) || 0)}
            />
          </FieldBlock>

          <FieldBlock label="朋友圈完成天数">
            <InputNumber
              value={momentsDays}
              min={0}
              max={7}
              disabled={saveDisabled}
              style={{ width: '100%' }}
              onChange={(value) => setMomentsDays(Number(value) || 0)}
            />
          </FieldBlock>

          <FieldBlock label="到访接待减免(分钟)">
            <InputNumber
              value={visitReceptionMinutesDeduction}
              min={0}
              disabled={saveDisabled}
              style={{ width: '100%' }}
              onChange={(value) => setVisitReceptionMinutesDeduction(Number(value) || 0)}
            />
          </FieldBlock>

          <FieldBlock label="微信折抵数量">
            <InputNumber
              value={wechatDeductionCount}
              min={0}
              disabled={saveDisabled}
              style={{ width: '100%' }}
              onChange={(value) => setWechatDeductionCount(Number(value) || 0)}
            />
          </FieldBlock>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <Text strong style={{ color: '#334155' }}>豁免项勾选</Text>
            <Checkbox checked={trialPaymentExemption} disabled={saveDisabled} onChange={(event) => setTrialPaymentExemption(Boolean(event?.target?.checked))}>
              满足两个试听费用豁免
            </Checkbox>
            <Checkbox checked={weeklyPromisedExemption} disabled={saveDisabled} onChange={(event) => setWeeklyPromisedExemption(Boolean(event?.target?.checked))}>
              满足当周诺到豁免
            </Checkbox>
            <Checkbox checked={promiseScreenshotProvided} disabled={saveDisabled} onChange={(event) => setPromiseScreenshotProvided(Boolean(event?.target?.checked))}>
              已补充诺到截图
            </Checkbox>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <FieldBlock label="主管备注">
              <TextArea
                value={note}
                disabled={saveDisabled}
                onChange={(value) => setNote(value)}
                placeholder="填写截图说明、豁免理由或驳回说明"
                rows={4}
                maxCount={500}
              />
            </FieldBlock>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <Button onClick={onClose}>关闭</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              theme="light"
              type="primary"
              disabled={saveDisabled}
              loading={manualEntryLoading}
              onClick={handleManualEntrySubmit}
            >
              保存补录
            </Button>
            <Button
              theme="light"
              type="warning"
              disabled={reviewDisabled || selectedCandidateKeys.length === 0}
              loading={manualReviewLoading}
              onClick={() => handleReviewSubmit('reject')}
            >
              驳回所选
            </Button>
            <Button
              theme="solid"
              type="primary"
              disabled={reviewDisabled || selectedCandidateKeys.length === 0}
              loading={manualReviewLoading}
              onClick={() => handleReviewSubmit('approve')}
            >
              通过所选
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ color: '#2563eb', display: 'flex', alignItems: 'center' }}>{icon}</div>
      <Text strong style={{ color: '#0f172a' }}>{title}</Text>
    </div>
  )
}

function FieldBlock({
  label,
  children,
  icon,
}: {
  label: string
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {icon}
        <Text strong style={{ color: '#334155' }}>{label}</Text>
      </div>
      {children}
    </div>
  )
}
