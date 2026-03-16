import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { IconSearch } from '@douyinfe/semi-icons'
import { Button, Input, Select, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { FollowupResultBadge } from '@/features/crm/leads/components/status-badges'
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

  const columns = useMemo<ColumnProps<LeadAssignmentTask>[]>(
    () => [
      {
        title: '任务名称',
        dataIndex: 'name',
        width: 280,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width='80%' />
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Text strong style={{ fontSize: 13 }}>
                {record.name}
              </Text>
              <Text type='tertiary' size='small'>
                创建于 {formatTime(record.created_at)}
              </Text>
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
        width: 110,
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
        width: 90,
        align: 'center',
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
          return <Text>{value as number}</Text>
        },
      },
      {
        title: '已回访',
        dataIndex: 'completed_count',
        width: 90,
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
        width: 90,
        align: 'center',
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
          return <Text>{value as number}</Text>
        },
      },
      {
        title: '回访率',
        dataIndex: 'completion_rate',
        width: 120,
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
        width: 140,
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
        width: 320,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width='90%' />

          const stats = (value as LeadAssignmentTask['followup_result_stats']) ?? []
          if (stats.length === 0) {
            return <Text type='tertiary'>-</Text>
          }

          return (
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {stats.map((item) => (
                  <tr key={item.result}>
                    <td style={{ paddingRight: 12, paddingTop: 2, paddingBottom: 2 }}>
                      <FollowupResultBadge result={item.result} />
                    </td>
                    <td style={{ textAlign: 'right', paddingTop: 2, paddingBottom: 2 }}>
                      <Text size='small' type='secondary'>{item.count}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      onRefresh={() =>
        queryClient.invalidateQueries({ queryKey: ['lead-assignment-tasks'] })
      }
      isRefreshing={isLoading}
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
        scrollX={1640}
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
