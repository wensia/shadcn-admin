/**
 * 诺到 Tab - Semi Design 版
 * 状态: scheduled
 */

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Skeleton, Dropdown, Tag, Toast } from '@douyinfe/semi-ui-19'
import {
  IconPlus,
  IconRefresh,
  IconMore,
  IconEdit,
  IconTickCircle,
  IconCrossCircleStroked,
  IconUpload,
  IconDelete,
} from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { useAuthStore } from '@/stores/auth-store'
import {
  approveVisitSchedule,
  approvalStatusLabels,
  batchCancelImportVisitSchedules,
  batchImportVisitSchedules,
  confirmVisitSchedule,
  dailyControlQueryKeys,
  getVisitSchedules,
  updateVisitScheduleStatus,
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

type VisitAction =
  | { type: 'updateStatus'; id: string; status: 'visited' | 'noshow' | 'cancelled'; successMessage: string }
  | { type: 'confirmApproval'; id: string }
  | { type: 'withdrawApproval'; id: string }
  | { type: 'approve'; id: string; action: 'approve' | 'reject' }
  | { type: 'batchImport'; recordIds: string[] }
  | { type: 'batchCancelImport'; recordIds: string[] }

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

interface PromisedVisitTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

export function PromisedVisitTab({ dateFrom, dateTo, creatorCampusId }: PromisedVisitTabProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editData, setEditData] = useState<VisitScheduleItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const queryClient = useQueryClient()

  const user = useAuthStore((state) => state.user)
  const isSuperUser = user?.is_superuser ?? false

  const queryParams = useMemo<VisitScheduleQueryParams>(() => {
    const params: VisitScheduleQueryParams = {
      page,
      size: pageSize,
      status: 'scheduled',
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

  const canBatchOperate = useMemo(() => {
    if (isSuperUser) return true
    return data.some((item) => item.can_approve)
  }, [data, isSuperUser])

  const visibleSelectedRowKeys = useMemo(() => {
    const visibleIds = new Set(data.map((item) => item.id))
    return selectedRowKeys.filter((id) => visibleIds.has(id))
  }, [data, selectedRowKeys])

  const selectedNotImportedIds = useMemo(() => {
    return data.filter((item) => visibleSelectedRowKeys.includes(item.id) && !item.is_counted).map((item) => item.id)
  }, [visibleSelectedRowKeys, data])

  const selectedImportedIds = useMemo(() => {
    return data.filter((item) => visibleSelectedRowKeys.includes(item.id) && item.is_counted).map((item) => item.id)
  }, [visibleSelectedRowKeys, data])

  const actionMutation = useMutation({
    mutationFn: async (action: VisitAction) => {
      switch (action.type) {
        case 'updateStatus':
          await updateVisitScheduleStatus(action.id, action.status)
          return { successMessage: action.successMessage }
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
        case 'batchImport': {
          const result = await batchImportVisitSchedules(action.recordIds)
          return {
            successMessage: `成功通过并导入 ${result.success_count} 条记录`,
            warningMessage: result.failed_records.length > 0 ? `${result.failed_records.length} 条记录导入失败` : undefined,
          }
        }
        case 'batchCancelImport': {
          const result = await batchCancelImportVisitSchedules(action.recordIds)
          return {
            successMessage: `成功取消导入 ${result.success_count} 条记录`,
            warningMessage: result.failed_records.length > 0 ? `${result.failed_records.length} 条记录取消失败` : undefined,
          }
        }
      }
    },
    onSuccess: async ({ successMessage, warningMessage }) => {
      Toast.success(successMessage)
      if (warningMessage) {
        Toast.warning(warningMessage)
      }
      setSelectedRowKeys([])
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
      title: '手机号', dataIndex: 'phone', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return <span>{record.phone || '-'}</span>
      },
    },
    {
      title: '预约日期', dataIndex: 'visit_date', width: 140,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return <span>{formatDateWithWeekday(record.visit_date)}</span>
      },
    },
    {
      title: '创建日期', dataIndex: 'created_at', width: 140,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        if (!record.created_at) return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
        const datePart = record.created_at.split('T')[0]
        return <span>{formatDateWithWeekday(datePart)}</span>
      },
    },
    {
      title: '创建人', dataIndex: 'created_by_name', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.created_by_name || '-'}</span>
      },
    },
    {
      title: '邀约咨询', dataIndex: 'advisor_name', width: 80,
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
      title: '年级', dataIndex: 'grade_display', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.grade_display || '-'}</span>
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
      title: '操作', dataIndex: 'actions', width: 120, fixed: 'right' as const,
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
                  icon={<IconTickCircle style={{ color: 'var(--semi-color-success)' }} />}
                  onClick={() => actionMutation.mutate({ type: 'updateStatus', id: record.id, status: 'visited', successMessage: '已确认到访' })}
                >
                  确认到访
                </Dropdown.Item>
                <Dropdown.Item
                  icon={<IconCrossCircleStroked style={{ color: 'var(--semi-color-danger)' }} />}
                  onClick={() => actionMutation.mutate({ type: 'updateStatus', id: record.id, status: 'noshow', successMessage: '已标记为未到访' })}
                >
                  标记未到
                </Dropdown.Item>
                <Dropdown.Item
                  type="danger"
                  onClick={() => actionMutation.mutate({ type: 'updateStatus', id: record.id, status: 'cancelled', successMessage: '已取消预约' })}
                >
                  取消预约
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>诺到列表</span>
            {visibleSelectedRowKeys.length > 0 && (
              <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>已选择 {visibleSelectedRowKeys.length} 条</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canBatchOperate && selectedNotImportedIds.length > 0 && (
              <Button
                icon={<IconUpload />}
                theme="solid"
                style={{ background: 'var(--semi-color-success)' }}
                onClick={() => actionMutation.mutate({ type: 'batchImport', recordIds: selectedNotImportedIds })}
                disabled={actionMutation.isPending}
              >
                批量通过并导入 ({selectedNotImportedIds.length})
              </Button>
            )}
            {canBatchOperate && selectedImportedIds.length > 0 && (
              <Button
                icon={<IconDelete />}
                onClick={() => actionMutation.mutate({ type: 'batchCancelImport', recordIds: selectedImportedIds })}
                disabled={actionMutation.isPending}
              >
                批量取消导入 ({selectedImportedIds.length})
              </Button>
            )}
            <Button icon={<IconPlus />} theme="solid" onClick={handleCreate}>新建诺到</Button>
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
        onPageChange={(nextPage) => {
          setSelectedRowKeys([])
          setPage(nextPage)
        }}
        onPageSizeChange={(size) => {
          setSelectedRowKeys([])
          setPageSize(size)
          setPage(1)
        }}
        rowSelection={{
          selectedRowKeys: visibleSelectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
        rowClassName={(record) => record?.is_counted ? 'semi-row-imported' : ''}
        emptyText="暂无诺到记录"
      />
      <VisitScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus="scheduled"
        onSuccess={() => { void queryClient.invalidateQueries({ queryKey: dailyControlQueryKeys.all }) }}
        editData={editData}
      />
    </Card>
  )
}
