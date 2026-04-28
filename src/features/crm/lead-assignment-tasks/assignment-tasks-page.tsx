import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { IconSearch } from '@douyinfe/semi-icons'
import {
  Button,
  Card,
  Input,
  Select,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  ClipboardList,
  PlayCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { FollowupResultBadge } from '@/features/crm/leads/components/status-badges'
import { followupResultLabels } from '@/features/crm/leads/types'
import { leadAssignmentTasksApi } from './api'
import {
  taskStatusLabels,
  type LeadAssignmentTask,
  type LeadAssignmentTaskStatus,
} from './types'

const { Text } = Typography

const taskStatusColors: Record<
  LeadAssignmentTaskStatus,
  'blue' | 'green' | 'grey'
> = {
  active: 'blue',
  completed: 'green',
  cancelled: 'grey',
}

const taskStatusBarColors: Record<LeadAssignmentTaskStatus, string> = {
  active: '#1677ff',
  completed: '#52c41a',
  cancelled: '#bfbfbf',
}

const followupResultBarColors: Record<string, string> = {
  not_connected: '#9ca3af',
  hung_up: '#ef4444',
  no_need: '#f87171',
  wrong_number: '#dc2626',
  yunke_risk_control: '#f59e0b',
  no_child: '#a1a1aa',
  age_mismatch: '#a3a3a3',
  temporarily_unavailable: '#fbbf24',
  can_continue: '#3b82f6',
  appointment_scheduled: '#10b981',
  wechat_added: '#06b6d4',
  other: '#94a3b8',
}

function formatTaskDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '-'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}天 ${hours}小时`
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分钟`
  }
  return `${seconds}秒`
}

interface StatCardProps {
  label: string
  count: number | undefined
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  active: boolean
  onClick: () => void
}

function StatCard({
  label,
  count,
  icon,
  iconBg,
  iconColor,
  active,
  onClick,
}: StatCardProps) {
  return (
    <Card
      shadows='hover'
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        borderColor: active ? iconColor : 'var(--semi-color-border)',
        boxShadow: active ? `0 0 0 1px ${iconColor}` : undefined,
        transition: 'all 0.15s ease',
      }}
      bodyStyle={{ padding: 0 }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: iconBg,
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text type='tertiary' style={{ fontSize: 12 }}>
            {label}
          </Text>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <Text strong style={{ fontSize: 20, color: active ? iconColor : undefined }}>
              {count ?? '—'}
            </Text>
            <Text type='tertiary' style={{ fontSize: 12 }}>
              个
            </Text>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function AssignmentTasksPage() {
  useDocumentTitle('分配任务')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [pagination, setPagination] = useState({ page: 1, size: 20 })
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<LeadAssignmentTaskStatus | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['lead-assignment-tasks', pagination, keyword, status],
    queryFn: async () => {
      const response = await leadAssignmentTasksApi.getTasks({
        page: pagination.page,
        size: pagination.size,
        keyword: keyword || undefined,
        status,
      })
      return response.data
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['lead-assignment-tasks-stats', keyword],
    queryFn: async () => {
      const baseParams = { page: 1, size: 1, keyword: keyword || undefined }
      const [all, active, completed, cancelled] = await Promise.all([
        leadAssignmentTasksApi.getTasks(baseParams),
        leadAssignmentTasksApi.getTasks({ ...baseParams, status: 'active' }),
        leadAssignmentTasksApi.getTasks({ ...baseParams, status: 'completed' }),
        leadAssignmentTasksApi.getTasks({ ...baseParams, status: 'cancelled' }),
      ])
      return {
        all: all.data?.total ?? 0,
        active: active.data?.total ?? 0,
        completed: completed.data?.total ?? 0,
        cancelled: cancelled.data?.total ?? 0,
      }
    },
  })

  const handleStatusFilter = (next?: LeadAssignmentTaskStatus) => {
    setStatus((prev) => (prev === next ? undefined : next))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const columns = useMemo<ColumnProps<LeadAssignmentTask>[]>(
    () => [
      {
        title: '任务名称',
        dataIndex: 'name',
        width: 300,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width='80%' />
          const barColor = taskStatusBarColors[record.status]
          return (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
              <div
                style={{
                  width: 3,
                  borderRadius: 2,
                  background: barColor,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${barColor}1a`,
                  color: barColor,
                  flexShrink: 0,
                }}
              >
                <ClipboardList size={16} />
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <Text strong style={{ fontSize: 13 }} ellipsis={{ showTooltip: true }}>
                  {record.name}
                </Text>
                <Text type='tertiary' size='small'>
                  创建于 {formatTime(record.created_at)}
                </Text>
              </div>
            </div>
          )
        },
      },
      {
        title: '负责人',
        dataIndex: 'advisor',
        width: 120,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return <Text>{record.advisor.name}</Text>
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Tag
              color={taskStatusColors[value as LeadAssignmentTaskStatus]}
              shape='circle'
            >
              {taskStatusLabels[value as LeadAssignmentTaskStatus]}
            </Tag>
          )
        },
      },
      {
        title: '总线索',
        dataIndex: 'total_leads',
        width: 80,
        align: 'center',
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
          return <Text>{value as number}</Text>
        },
      },
      {
        title: '已回访',
        dataIndex: 'completed_count',
        width: 80,
        align: 'center',
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
          return (
            <Text style={{ color: 'var(--semi-color-success)' }}>
              {value as number}
            </Text>
          )
        },
      },
      {
        title: '未回访',
        dataIndex: 'pending_count',
        width: 80,
        align: 'center',
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
          return <Text>{value as number}</Text>
        },
      },
      {
        title: '回访率',
        dataIndex: 'completion_rate',
        width: 130,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text>{Number(value).toFixed(2)}%</Text>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: 'var(--semi-color-fill-0)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(Number(value), 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #1677ff, #36cfc9)',
                  }}
                />
              </div>
            </div>
          )
        },
      },
      {
        title: '最近回访',
        dataIndex: 'latest_followup_at',
        width: 160,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return value ? formatTime(value as string) : '-'
        },
      },
      {
        title: '完成耗时',
        dataIndex: 'completed_duration_seconds',
        width: 130,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={88} />
          const duration = value as number | null | undefined
          if (duration == null) {
            return <Text type='tertiary'>-</Text>
          }
          return <Text>{formatTaskDuration(duration)}</Text>
        },
      },
      {
        title: '分配后跟进结果',
        dataIndex: 'followup_result_stats',
        width: 220,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width='90%' />

          const stats =
            (value as LeadAssignmentTask['followup_result_stats']) ?? []
          if (stats.length === 0) {
            return <Text type='tertiary'>-</Text>
          }

          const total = stats.reduce((sum, item) => sum + item.count, 0)
          if (total === 0) {
            return <Text type='tertiary'>-</Text>
          }

          const tooltipContent = (
            <div style={{ minWidth: 180 }}>
              {stats.map((item) => (
                <div
                  key={item.result}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '3px 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background:
                          followupResultBarColors[item.result] ?? '#94a3b8',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: 12 }}>
                      {followupResultLabels[item.result] || item.result}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )

          return (
            <Tooltip content={tooltipContent} position='top'>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  cursor: 'help',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    height: 8,
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: 'var(--semi-color-fill-0)',
                  }}
                >
                  {stats.map((item) => (
                    <div
                      key={item.result}
                      style={{
                        flex: item.count,
                        background:
                          followupResultBarColors[item.result] ?? '#94a3b8',
                      }}
                    />
                  ))}
                </div>
                <Text type='tertiary' size='small'>
                  {stats.length} 类 · 共 {total} 条
                </Text>
              </div>
            </Tooltip>
          )
        },
      },
      {
        title: '创建人',
        dataIndex: 'created_by',
        width: 120,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return <Text>{record.created_by.name}</Text>
        },
      },
    ],
    []
  )

  const tasks = data?.items ?? []
  const total = data?.total ?? 0

  return (
    <DataTableLayout
      title='分配任务'
      total={total}
      onRefresh={() => {
        queryClient.invalidateQueries({ queryKey: ['lead-assignment-tasks'] })
        queryClient.invalidateQueries({
          queryKey: ['lead-assignment-tasks-stats'],
        })
      }}
      isRefreshing={isLoading}
      topContent={
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <StatCard
            label='全部任务'
            count={stats?.all}
            icon={<ClipboardList size={16} />}
            iconBg='var(--semi-color-primary-light-default)'
            iconColor='var(--semi-color-primary)'
            active={status === undefined}
            onClick={() => handleStatusFilter(undefined)}
          />
          <StatCard
            label='进行中'
            count={stats?.active}
            icon={<PlayCircle size={16} />}
            iconBg='rgba(22, 119, 255, 0.12)'
            iconColor='#1677ff'
            active={status === 'active'}
            onClick={() => handleStatusFilter('active')}
          />
          <StatCard
            label='已完成'
            count={stats?.completed}
            icon={<CheckCircle2 size={16} />}
            iconBg='var(--semi-color-success-light-default)'
            iconColor='var(--semi-color-success)'
            active={status === 'completed'}
            onClick={() => handleStatusFilter('completed')}
          />
          <StatCard
            label='已取消'
            count={stats?.cancelled}
            icon={<XCircle size={16} />}
            iconBg='var(--semi-color-fill-0)'
            iconColor='var(--semi-color-text-2)'
            active={status === 'cancelled'}
            onClick={() => handleStatusFilter('cancelled')}
          />
        </div>
      }
      toolbar={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Input
              prefix={<IconSearch />}
              placeholder='搜索任务名称'
              value={keywordInput}
              onChange={setKeywordInput}
              onEnterPress={() => {
                setKeyword(keywordInput.trim())
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              showClear
              style={{ width: 260 }}
            />
            <Button
              onClick={() => {
                setKeyword(keywordInput.trim())
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            >
              搜索
            </Button>
            <Select
              value={status}
              placeholder='状态'
              style={{ width: 160 }}
              onChange={(value) => {
                setStatus((value as LeadAssignmentTaskStatus) || undefined)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              showClear
            >
              {Object.entries(taskStatusLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>
      }
    >
      <SemiDataTable<LeadAssignmentTask>
        columns={columns}
        data={tasks}
        total={total}
        page={pagination.page}
        pageSize={pagination.size}
        isLoading={isLoading}
        scrollX={1620}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        onPageSizeChange={(size) => setPagination({ page: 1, size })}
        onRowClick={(record) => {
          navigate({
            to: '/crm/leads/assignment-tasks/$taskId',
            params: { taskId: record.id },
          })
        }}
        emptyText='暂无分配任务'
      />
    </DataTableLayout>
  )
}
