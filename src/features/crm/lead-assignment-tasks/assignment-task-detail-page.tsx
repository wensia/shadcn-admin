import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Modal,
  Select,
  Table,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { ArrowLeft } from 'lucide-react'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import {
  followupResultLabels,
  leadStatusLabels,
} from '@/features/crm/leads/types'
import { leadAssignmentTasksApi } from './api'
import {
  completionStatusLabels,
  skippedReasonLabels,
  taskStatusLabels,
  type LeadAssignmentTaskFollowupResultStat,
  type LeadAssignmentTaskItem,
  type TaskCompletionStatus,
} from './types'

const { Text } = Typography

const taskStatusColors = {
  active: 'blue',
  completed: 'green',
  cancelled: 'grey',
} as const satisfies Record<
  'active' | 'completed' | 'cancelled',
  'blue' | 'green' | 'grey'
>

const completionStatusColors = {
  completed: 'green',
  pending: 'orange',
  skipped: 'grey',
} as const satisfies Record<Exclude<TaskCompletionStatus, 'all'>, 'green' | 'orange' | 'grey'>

interface AssignmentTaskDetailPageProps {
  taskId: string
}

interface AssignmentSummaryCell {
  key: string
  metric: string
  value: ReactNode
}

interface AssignmentSummaryGridRow {
  key: string
  cell0?: AssignmentSummaryCell
  cell1?: AssignmentSummaryCell
  cell2?: AssignmentSummaryCell
  cell3?: AssignmentSummaryCell
  cell4?: AssignmentSummaryCell
  cell5?: AssignmentSummaryCell
}

type AssignmentSummaryCellKey = 'cell0' | 'cell1' | 'cell2' | 'cell3' | 'cell4' | 'cell5'

const summaryCellKeys: AssignmentSummaryCellKey[] = ['cell0', 'cell1', 'cell2', 'cell3', 'cell4', 'cell5']

function formatPercentValue(value?: number | null) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

function buildSummaryGridRows(items: AssignmentSummaryCell[]): AssignmentSummaryGridRow[] {
  const rows: AssignmentSummaryGridRow[] = []

  for (let start = 0; start < items.length; start += summaryCellKeys.length) {
    const row: AssignmentSummaryGridRow = { key: `row-${start / summaryCellKeys.length}` }
    summaryCellKeys.forEach((cellKey, offset) => {
      row[cellKey] = items[start + offset]
    })
    rows.push(row)
  }

  return rows
}

function buildFollowupResultSummaryItems(
  stats?: LeadAssignmentTaskFollowupResultStat[]
): AssignmentSummaryCell[] {
  if (!stats?.length) {
    return [{ key: 'followup-result-empty', metric: '跟进结果', value: '暂无' }]
  }

  return stats.map((item) => ({
    key: `followup-result-${item.result}`,
    metric: `结果：${followupResultLabels[item.result] || item.result}`,
    value: `${item.count}条`,
  }))
}

function SummaryGridCell({ item }: { item?: AssignmentSummaryCell }) {
  if (!item) {
    return <div style={{ minHeight: 28 }} />
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 28 }}>
      <Text type='tertiary' size='small' style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
        {item.metric}
      </Text>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--semi-color-text-0)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
        {item.value}
      </div>
    </div>
  )
}

export function AssignmentTaskDetailPage({
  taskId,
}: AssignmentTaskDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [completionStatus, setCompletionStatus] =
    useState<TaskCompletionStatus>('all')
  const [pagination, setPagination] = useState({ page: 1, size: 20 })
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['lead-assignment-task', taskId],
    queryFn: async () => {
      const response = await leadAssignmentTasksApi.getTask(taskId)
      return response.data
    },
  })

  useDocumentTitle(task?.name ? `${task.name} - 分配任务` : '分配任务详情')

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: [
      'lead-assignment-task-items',
      taskId,
      completionStatus,
      pagination,
    ],
    queryFn: async () => {
      const response = await leadAssignmentTasksApi.getTaskItems(taskId, {
        page: pagination.page,
        size: pagination.size,
        completion_status:
          completionStatus === 'all' ? undefined : completionStatus,
      })
      return response.data
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await leadAssignmentTasksApi.cancelTask(taskId)
    },
    onSuccess: async () => {
      Toast.success({ content: '任务单已取消' })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['lead-assignment-task', taskId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['lead-assignment-task-items', taskId],
        }),
        queryClient.invalidateQueries({ queryKey: ['lead-assignment-tasks'] }),
      ])
    },
    onError: (error) => showApiErrorToast(error, '取消任务单失败'),
  })

  const columns = useMemo<ColumnProps<LeadAssignmentTaskItem>[]>(
    () => [
      {
        title: '儿童 / 家长',
        dataIndex: 'child_name',
        width: 180,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width='80%' />
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text strong>{record.child_name || '-'}</Text>
              <Text type='tertiary' size='small'>
                {record.parent_name || '未登记家长'}
              </Text>
            </div>
          )
        },
      },
      {
        title: '手机号',
        dataIndex: 'parent_phone',
        width: 120,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          return value || '-'
        },
      },
      {
        title: '来源渠道',
        dataIndex: 'source_channel_name',
        width: 140,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={90} />
          return value || '-'
        },
      },
      {
        title: '当前线索状态',
        dataIndex: 'status',
        width: 120,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Tag color='blue' shape='circle'>
              {leadStatusLabels[value as keyof typeof leadStatusLabels] ||
                (value as string)}
            </Tag>
          )
        },
      },
      {
        title: '任务内状态',
        dataIndex: 'completion_status',
        width: 120,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          const status = value as Exclude<TaskCompletionStatus, 'all'>
          return (
            <Tag
              color={completionStatusColors[status]}
              shape='circle'
            >
              {completionStatusLabels[status]}
            </Tag>
          )
        },
      },
      {
        title: '跳过原因',
        dataIndex: 'skipped_reason',
        width: 150,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={90} />
          return value ? skippedReasonLabels[value as string] || (value as string) : '-'
        },
      },
      {
        title: '完成/跳过时间',
        dataIndex: 'completed_at',
        width: 170,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          const timeValue = (value as string | undefined) || record.skipped_at
          return timeValue ? formatTime(timeValue) : '-'
        },
      },
      {
        title: '最近跟进结果',
        dataIndex: 'last_followup_result',
        width: 140,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={90} />
          return value
            ? followupResultLabels[
                value as keyof typeof followupResultLabels
              ] || (value as string)
            : '-'
        },
      },
      {
        title: '下次跟进时间',
        dataIndex: 'next_followup_at',
        width: 170,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return value ? formatTime(value as string) : '-'
        },
      },
    ],
    []
  )

  const summaryItems = useMemo<AssignmentSummaryCell[]>(() => [
    { key: 'total-leads', metric: '总线索', value: `${task?.total_leads ?? 0}条` },
    { key: 'completed-count', metric: '已回访', value: `${task?.completed_count ?? 0}条` },
    { key: 'pending-count', metric: '未回访', value: `${task?.pending_count ?? 0}条` },
    { key: 'skipped-count', metric: '已跳过', value: `${task?.skipped_count ?? 0}条` },
    { key: 'completion-rate', metric: '回访率', value: formatPercentValue(task?.completion_rate) },
    { key: 'progress-rate', metric: '任务进度', value: formatPercentValue(task?.task_progress_rate) },
    {
      key: 'status',
      metric: '状态',
      value: task?.status ? (
        <Tag color={taskStatusColors[task.status]} shape='circle'>
          {taskStatusLabels[task.status]}
        </Tag>
      ) : '-',
    },
    { key: 'advisor', metric: '负责人', value: task?.advisor.name || '-' },
    { key: 'created-by', metric: '创建人', value: task?.created_by.name || '-' },
    { key: 'created-at', metric: '创建时间', value: task?.created_at ? formatTime(task.created_at) : '-' },
    { key: 'completed-at', metric: '完成时间', value: task?.completed_at ? formatTime(task.completed_at) : '-' },
    { key: 'remark', metric: '备注', value: task?.remark || '无' },
    ...buildFollowupResultSummaryItems(task?.followup_result_stats),
  ], [task])

  const summaryRows = useMemo(() => buildSummaryGridRows(summaryItems), [summaryItems])

  const summaryColumns = useMemo<ColumnProps<AssignmentSummaryGridRow>[]>(
    () => summaryCellKeys.map((cellKey) => ({
      title: '',
      dataIndex: cellKey,
      width: 160,
      render: (item?: AssignmentSummaryCell) => <SummaryGridCell item={item} />,
      onCell: () => ({
        style: {
          padding: '5px 10px',
        },
      }),
    })),
    []
  )

  const items = itemsData?.items ?? []

  return (
    <>
      <DataTableLayout
        title={task?.name || '分配任务详情'}
        total={task?.total_leads}
        onRefresh={() => {
          queryClient.invalidateQueries({
            queryKey: ['lead-assignment-task', taskId],
          })
          queryClient.invalidateQueries({
            queryKey: ['lead-assignment-task-items', taskId],
          })
        }}
        isRefreshing={taskLoading || itemsLoading}
        headerActions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              icon={<ArrowLeft size={14} />}
              onClick={() => navigate({ to: '/crm/leads/assignment-tasks' })}
            >
              返回列表
            </Button>
            {task?.status === 'active' && (
              <Button
                theme='light'
                type='danger'
                onClick={() => {
                  Modal.warning({
                    title: '确认取消任务单',
                    content:
                      '取消后任务单会保留历史记录，但不再继续追踪完成状态。',
                    okText: '确认取消',
                    cancelText: '返回',
                    okType: 'danger',
                    onOk: () => cancelMutation.mutate(),
                  })
                }}
                loading={cancelMutation.isPending}
              >
                取消任务
              </Button>
            )}
          </div>
        }
        toolbar={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Select
              value={completionStatus}
              style={{ width: 160 }}
              onChange={(value) => {
                setCompletionStatus((value as TaskCompletionStatus) || 'all')
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            >
              {Object.entries(completionStatusLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--semi-color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                border: '1px solid var(--semi-color-border)',
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--semi-color-bg-0)',
              }}
            >
              <Table<AssignmentSummaryGridRow>
                bordered
                columns={summaryColumns}
                dataSource={summaryRows}
                rowKey='key'
                pagination={false}
                showHeader={false}
                size='small'
                loading={taskLoading}
                empty='暂无统计数据'
              />
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SemiDataTable<LeadAssignmentTaskItem>
              columns={columns}
              data={items}
              total={itemsData?.total ?? 0}
              page={pagination.page}
              pageSize={pagination.size}
              isLoading={itemsLoading}
              scrollX={1450}
              onPageChange={(page) =>
                setPagination((prev) => ({ ...prev, page }))
              }
              onPageSizeChange={(size) => setPagination({ page: 1, size })}
              onRowClick={(record) => {
                setSelectedLeadId(record.lead_id)
                setDetailOpen(true)
              }}
              emptyText='当前筛选下暂无线索'
            />
          </div>
        </div>
      </DataTableLayout>

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
