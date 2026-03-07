/**
 * 到访 Tab - Semi Design 版
 * 状态: visited
 */

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Skeleton, Dropdown, Tag, Toast } from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh, IconMore, IconEdit, IconCreditCard } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  approveVisitSchedule,
  approvalStatusLabels,
  confirmVisitSchedule,
  dailyControlQueryKeys,
  getVisitSchedules,
  withdrawVisitSchedule,
  type ApprovalStatus,
  type VisitScheduleItem,
  type VisitScheduleQueryParams,
} from '../api'
import { VisitScheduleDialog } from './visit-schedule-dialog'
import { CopyableCell } from './copyable-cell'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { isSkeletonRow } from '@/lib/table-utils'

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const approvalStatusColorMap: Record<ApprovalStatus, 'grey' | 'yellow' | 'green' | 'red'> = {
  draft: 'grey',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
}

type VisitApprovalAction =
  | { type: 'confirmApproval'; id: string }
  | { type: 'withdrawApproval'; id: string }
  | { type: 'approve'; id: string; action: 'approve' | 'reject' }

function formatDateWithWeekday(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const weekday = weekDays[date.getDay()]
    return `${dateStr} ${weekday}`
  } catch {
    return dateStr
  }
}

interface ActualVisitTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

export function ActualVisitTab({ dateFrom, dateTo, creatorCampusId }: ActualVisitTabProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editData, setEditData] = useState<VisitScheduleItem | null>(null)
  const queryClient = useQueryClient()

  const queryParams = useMemo<VisitScheduleQueryParams>(() => {
    const params: VisitScheduleQueryParams = {
      page,
      size: pageSize,
      status: 'visited',
    }
    if (dateFrom) params.visit_date_from = dateFrom
    if (dateTo) params.visit_date_to = dateTo
    if (creatorCampusId) params.creator_campus_id = creatorCampusId
    return params
  }, [creatorCampusId, dateFrom, dateTo, page, pageSize])

  const listQuery = useQuery({
    queryKey: dailyControlQueryKeys.visitScheduleList(queryParams),
    queryFn: () => getVisitSchedules(queryParams),
  })

  const items = listQuery.data?.items
  const data = useMemo(() => items ?? [], [items])
  const total = listQuery.data?.total ?? 0
  const isLoading = listQuery.isLoading || listQuery.isFetching

  const actionMutation = useMutation({
    mutationFn: async (action: VisitApprovalAction) => {
      switch (action.type) {
        case 'confirmApproval':
          await confirmVisitSchedule(action.id)
          return { successMessage: '已提交审批' }
        case 'withdrawApproval':
          await withdrawVisitSchedule(action.id)
          return { successMessage: '已撤回审批' }
        case 'approve':
          await approveVisitSchedule(action.id, action.action)
          return {
            successMessage: action.action === 'approve' ? '审批已通过' : '已驳回审批',
          }
      }
    },
    onSuccess: async ({ successMessage }) => {
      Toast.success(successMessage)
      await queryClient.invalidateQueries({ queryKey: dailyControlQueryKeys.all })
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '操作失败')
    },
  })

  const handleEdit = (item: VisitScheduleItem) => {
    setEditData(item)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditData(null)
    setDialogOpen(true)
  }

  const columns: ColumnProps<VisitScheduleItem>[] = [
    {
      title: '学生姓名', dataIndex: 'student_name', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 500 }}>{record.student_name || '-'}</span>
            {record.lead_deleted && <Tag size="small" color="red">线索已删</Tag>}
          </div>
        )
      },
    },
    {
      title: '联系电话', dataIndex: 'phone', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return <span>{record.phone || '-'}</span>
      },
    },
    {
      title: '到访日期', dataIndex: 'visit_date', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return <span>{formatDateWithWeekday(record.visit_date)}</span>
      },
    },
    {
      title: '到访时间', dataIndex: 'visit_time', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.visit_time?.substring(0, 5) || '-'}</span>
      },
    },
    {
      title: '接待顾问', dataIndex: 'advisor_name', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.advisor_name || '-'}</span>
      },
    },
    {
      title: '体验课程', dataIndex: 'course_names', width: 150,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 120 }} />
        const content = record.course_names?.join('、')
        return content ? <CopyableCell content={content} maxWidthClass="max-w-[150px]" /> : <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
      },
    },
    {
      title: '备注', dataIndex: 'remark', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 90 }} />
        return record.remark ? <CopyableCell content={record.remark} maxWidthClass="max-w-[120px]" /> : <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
      },
    },
    {
      title: '审批状态', dataIndex: 'approval_status', width: 90,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        const approvalStatus = record.approval_status || 'draft'
        return (
          <Tag size="small" color={approvalStatusColorMap[approvalStatus]}>
            {record.approval_status_display || approvalStatusLabels[approvalStatus]}
          </Tag>
        )
      },
    },
    {
      title: '导入状态', dataIndex: 'is_counted', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 50 }} />
        return <Tag size="small" color={record.is_counted ? 'green' : 'grey'}>{record.is_counted ? '已导入' : '待导入'}</Tag>
      },
    },
    {
      title: '操作', dataIndex: 'actions', width: 140, fixed: 'right' as const,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 32 }} />
        const hasApprovalActions = Boolean(record.can_confirm || record.can_withdraw || record.can_approve)

        return (
          <Dropdown
            trigger="click"
            clickToHide
            position="bottomRight"
            render={
              <Dropdown.Menu>
                <Dropdown.Item icon={<IconEdit />} onClick={() => handleEdit(record)}>编辑</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item
                  icon={<IconCreditCard style={{ color: 'var(--semi-color-text-2)' }} />}
                  disabled
                >
                  登记缴费（待开发）
                </Dropdown.Item>
                {hasApprovalActions && <Dropdown.Divider />}
                {record.can_confirm && (
                  <Dropdown.Item onClick={() => actionMutation.mutate({ type: 'confirmApproval', id: record.id })}>
                    提交审批
                  </Dropdown.Item>
                )}
                {record.can_withdraw && (
                  <Dropdown.Item onClick={() => actionMutation.mutate({ type: 'withdrawApproval', id: record.id })}>
                    撤回审批
                  </Dropdown.Item>
                )}
                {record.can_approve && (
                  <Dropdown.Item onClick={() => actionMutation.mutate({ type: 'approve', id: record.id, action: 'approve' })}>
                    审批通过
                  </Dropdown.Item>
                )}
                {record.can_approve && (
                  <Dropdown.Item type="danger" onClick={() => actionMutation.mutate({ type: 'approve', id: record.id, action: 'reject' })}>
                    审批驳回
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            }
          >
            <span style={{ display: 'inline-flex' }}>
              <Button theme="borderless" icon={<IconMore />} size="small" />
            </span>
          </Dropdown>
        )
      },
    },
  ]

  return (
    <Card
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 16px 0' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>到访列表</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button icon={<IconPlus />} theme="solid" onClick={handleCreate}>新建到访</Button>
            <Button icon={<IconRefresh spin={isLoading} />} onClick={() => void listQuery.refetch()} />
          </div>
        </div>
      }
    >
      <SemiDataTable<VisitScheduleItem>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        rowClassName={(record) => record?.is_counted ? 'semi-row-imported' : ''}
        emptyText="暂无到访记录"
      />
      <VisitScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus="visited"
        onSuccess={() => { void queryClient.invalidateQueries({ queryKey: dailyControlQueryKeys.all }) }}
        editData={editData}
      />
    </Card>
  )
}
