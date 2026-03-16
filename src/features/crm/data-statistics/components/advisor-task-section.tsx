import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Button, Card, Empty, Typography } from '@douyinfe/semi-ui-19'
import { ClipboardCheck, RefreshCw, ShieldAlert } from 'lucide-react'
import { AdvisorTaskOverviewCards } from './advisor-task-overview-cards'
import { AdvisorTaskReviewDrawer } from './advisor-task-review-drawer'
import { AdvisorTaskTable } from './advisor-task-table'
import { useAdvisorTaskActions, useAdvisorTaskDashboard, useAdvisorTaskDetail } from '../hooks/use-advisor-task-dashboard'
import type {
  AdvisorTaskDateMode,
  AdvisorTaskManualEntryPayload,
  AdvisorTaskManualReviewPayload,
  AdvisorTaskRow,
} from '../api/advisor-task-api'

const { Text } = Typography

function formatGeneratedAt(value?: string) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return format(parsed, 'MM-dd HH:mm')
}

export function AdvisorTaskSection({
  campusId,
  accountId,
  accountLabel,
  accountLoading,
  dateMode,
  dateFrom,
  dateTo,
}: {
  campusId: string
  accountId?: string
  accountLabel?: string
  accountLoading?: boolean
  dateMode: AdvisorTaskDateMode
  dateFrom: string
  dateTo: string
}) {
  const [activeRow, setActiveRow] = useState<AdvisorTaskRow | null>(null)

  const queryParams = useMemo(() => ({
    campusId,
    accountId,
    dateMode,
    dateFrom,
    dateTo,
  }), [accountId, campusId, dateFrom, dateMode, dateTo])

  const dashboardQuery = useAdvisorTaskDashboard(queryParams, true)
  const detailQuery = useAdvisorTaskDetail(activeRow?.advisorId ?? null, queryParams, Boolean(activeRow))
  const actions = useAdvisorTaskActions(queryParams)

  const generatedAtLabel = formatGeneratedAt(dashboardQuery.data.generatedAt)
  const currentRecordId = detailQuery.data?.row.recordId ?? null
  const currentAdvisorId = detailQuery.data?.row.advisorId ?? activeRow?.advisorId ?? null
  const actionsReady = Boolean(
    currentRecordId &&
    currentAdvisorId &&
    detailQuery.isFetched &&
    !detailQuery.isFetching,
  )

  const handleManualEntrySubmit = (payload: AdvisorTaskManualEntryPayload) => {
    if (!actionsReady || !currentRecordId || !currentAdvisorId) return
    actions.manualEntryMutation.mutate({ recordId: currentRecordId, advisorId: currentAdvisorId, payload })
  }

  const handleManualReviewSubmit = (payload: AdvisorTaskManualReviewPayload) => {
    if (!actionsReady || !currentRecordId || !currentAdvisorId) return
    actions.manualReviewMutation.mutate({ recordId: currentRecordId, advisorId: currentAdvisorId, payload })
  }

  return (
    <>
      <Card
        style={{
          borderRadius: 18,
          border: '1px solid #dbe3ef',
          background: '#ffffff',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
        }}
        bodyStyle={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ClipboardCheck size={18} strokeWidth={2.1} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                任务考核
              </div>
              <Text type="tertiary" size="small">
                基于当前筛选范围统一查看顾问每日/区间任务达成情况，主管可在抽屉内补录截图、备注并审核候选项。
              </Text>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {dashboardQuery.data.dateLabel && (
              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                统计口径：{dashboardQuery.data.dateLabel}
              </div>
            )}
            {accountLabel && (
              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                云客账号：{accountLabel}
              </div>
            )}
            {generatedAtLabel && (
              <div
                style={{
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                生成时间：{generatedAtLabel}
              </div>
            )}
            <Button
              theme="light"
              type="primary"
              icon={<RefreshCw size={14} />}
              loading={dashboardQuery.isRefetching}
              onClick={() => void dashboardQuery.refetch()}
              style={{ borderRadius: 12 }}
            >
              刷新考核
            </Button>
          </div>
        </div>

        {!accountId && !accountLoading && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              border: '1px solid #dbe3ef',
              background: '#f8fafc',
            }}
          >
            <Text type="tertiary" size="small">
              当前未显式选择云客账号，系统会尝试使用默认账号统计；如后台未配置可用账号，则任务考核结果会为空。
            </Text>
          </div>
        )}

        {dashboardQuery.serviceUnavailable && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              border: '1px solid #fde68a',
              background: '#fffdf2',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <ShieldAlert size={16} style={{ color: '#d97706', marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                任务考核数据加载失败
              </div>
              <div style={{ fontSize: 12, color: '#a16207', lineHeight: 1.7 }}>
                请先确认后端接口可用，再点击右上角“刷新考核”重试。
              </div>
            </div>
          </div>
        )}

        <Card
          style={{
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
          bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                任务总览
              </div>
              <Text type="tertiary" size="small">
                根据当前筛选范围自动区分达标、待主管确认与未达标人数，快速判断任务执行质量。
              </Text>
            </div>
          </div>

          <AdvisorTaskOverviewCards
            summary={dashboardQuery.data.summary}
            loading={accountLoading || dashboardQuery.isLoading}
          />
        </Card>

        <Card
          style={{
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
          bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                顾问任务矩阵
              </div>
              <Text type="tertiary" size="small">
                每位顾问一行，横向展示 A/B/C/D 自动规则、人工候选项热力状态、最终结果与主管操作入口。
              </Text>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 999,
                background: '#ffffff',
                border: '1px solid #dbe3ef',
                fontSize: 12,
                color: '#475569',
                fontWeight: 600,
              }}
            >
              共 {dashboardQuery.data.rows.length} 位顾问
            </div>
          </div>

          {!accountLoading && !dashboardQuery.isLoading && !dashboardQuery.data.rows.length && !dashboardQuery.serviceUnavailable && (
            <Empty
              image={<ClipboardCheck size={42} style={{ color: '#94a3b8' }} />}
              title="当前筛选下暂无任务考核数据"
              description="调整校区、日期或云客账号后再试。"
            />
          )}

          {(dashboardQuery.isLoading || dashboardQuery.data.rows.length > 0) && (
            <AdvisorTaskTable
              rows={dashboardQuery.data.rows}
              loading={accountLoading || dashboardQuery.isLoading}
              onViewDetail={setActiveRow}
              onOpenReview={setActiveRow}
            />
          )}
        </Card>
      </Card>

      <AdvisorTaskReviewDrawer
        open={Boolean(activeRow)}
        selectedRow={activeRow}
        detail={detailQuery.data}
        loading={detailQuery.isLoading}
        actionsReady={actionsReady}
        onClose={() => setActiveRow(null)}
        manualEntryLoading={actions.manualEntryMutation.isPending}
        manualReviewLoading={actions.manualReviewMutation.isPending}
        onSubmitManualEntry={handleManualEntrySubmit}
        onSubmitReview={handleManualReviewSubmit}
      />
    </>
  )
}
