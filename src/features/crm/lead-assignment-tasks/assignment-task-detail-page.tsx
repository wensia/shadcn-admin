import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Card,
  Modal,
  Select,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  ArrowLeft,
  CheckCircle2,
  ListTodo,
  TimerReset,
  UserRound,
} from 'lucide-react'
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
  taskStatusLabels,
  type LeadAssignmentTaskItem,
  type TaskCompletionStatus,
} from './types'

const { Text, Title } = Typography

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
} as const satisfies Record<'completed' | 'pending', 'green' | 'orange'>

interface AssignmentTaskDetailPageProps {
  taskId: string
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
          return (
            <Tag
              color={completionStatusColors[value as 'completed' | 'pending']}
              shape='circle'
            >
              {value === 'completed' ? '已回访' : '未回访'}
            </Tag>
          )
        },
      },
      {
        title: '完成时间',
        dataIndex: 'completed_at',
        width: 170,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return value ? formatTime(value as string) : '-'
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
              padding: 16,
              borderBottom: '1px solid var(--semi-color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <SummaryCard
                title='总线索'
                value={task?.total_leads ?? 0}
                helper='本次纳入任务的线索量'
                icon={<ListTodo size={18} />}
              />
              <SummaryCard
                title='已回访'
                value={task?.completed_count ?? 0}
                helper='任务创建后由负责人完成'
                icon={<CheckCircle2 size={18} />}
                accent='var(--semi-color-success)'
              />
              <SummaryCard
                title='未回访'
                value={task?.pending_count ?? 0}
                helper='仍待处理的线索'
                icon={<TimerReset size={18} />}
                accent='var(--semi-color-warning)'
              />
              <SummaryCard
                title='回访率'
                value={`${Number(task?.completion_rate ?? 0).toFixed(2)}%`}
                helper={
                  task?.latest_followup_at
                    ? `最近回访：${formatTime(task.latest_followup_at)}`
                    : '暂无线索完成'
                }
                icon={<UserRound size={18} />}
                accent='var(--semi-color-primary)'
              />
            </div>

            <Card bodyStyle={{ padding: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                }}
              >
                <InfoItem label='状态'>
                  {task?.status ? (
                    <Tag color={taskStatusColors[task.status]} shape='circle'>
                      {taskStatusLabels[task.status]}
                    </Tag>
                  ) : (
                    '-'
                  )}
                </InfoItem>
                <InfoItem label='负责人'>{task?.advisor.name || '-'}</InfoItem>
                <InfoItem label='创建人'>
                  {task?.created_by.name || '-'}
                </InfoItem>
                <InfoItem label='创建时间'>
                  {task?.created_at ? formatTime(task.created_at) : '-'}
                </InfoItem>
                <InfoItem label='完成时间'>
                  {task?.completed_at ? formatTime(task.completed_at) : '-'}
                </InfoItem>
                <InfoItem label='备注'>{task?.remark || '无'}</InfoItem>
              </div>
            </Card>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <SemiDataTable<LeadAssignmentTaskItem>
              columns={columns}
              data={items}
              total={itemsData?.total ?? 0}
              page={pagination.page}
              pageSize={pagination.size}
              isLoading={itemsLoading}
              scrollX={1300}
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

function SummaryCard({
  title,
  value,
  helper,
  icon,
  accent = 'var(--semi-color-text-0)',
}: {
  title: string
  value: string | number
  helper: string
  icon: React.ReactNode
  accent?: string
}) {
  return (
    <Card bodyStyle={{ padding: 16 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Text type='tertiary' size='small'>
            {title}
          </Text>
          <Title heading={3} style={{ margin: 0, color: accent }}>
            {value}
          </Title>
          <Text type='tertiary' size='small'>
            {helper}
          </Text>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--semi-color-fill-0)',
            color: accent,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}

function InfoItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      <div>{children}</div>
    </div>
  )
}
