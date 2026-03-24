/**
 * 到访预约 Tab（参数化组件）
 * mode='promised' → 诺到列表（status=scheduled）
 * mode='visited'  → 到访列表（status=visited）
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
  IconCreditCard,
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
import { formatDateWithWeekday, approvalStatusColorMap } from '../utils'

// ==================== 类型定义 ====================

type VisitAction =
  | { type: 'updateStatus'; id: string; status: 'visited' | 'noshow' | 'cancelled'; successMessage: string }
  | { type: 'confirmApproval'; id: string }
  | { type: 'withdrawApproval'; id: string }
  | { type: 'approve'; id: string; action: 'approve' | 'reject' }
  | { type: 'batchImport'; recordIds: string[] }
  | { type: 'batchCancelImport'; recordIds: string[] }

interface VisitScheduleTabProps {
  mode: 'promised' | 'visited'
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

// ==================== 模式配置 ====================

const modeConfig = {
  promised: {
    queryStatus: 'scheduled' as const,
    title: '诺到列表',
    createLabel: '新建诺到',
    defaultDialogStatus: 'scheduled' as const,
    emptyText: '暂无诺到记录',
  },
  visited: {
    queryStatus: 'visited' as const,
    title: '到访列表',
    createLabel: '新建到访',
    defaultDialogStatus: 'visited' as const,
    emptyText: '暂无到访记录',
  },
} as const

// ==================== 组件 ====================

export function VisitScheduleTab({ mode, dateFrom, dateTo, creatorCampusId }: VisitScheduleTabProps) {
  const config = modeConfig[mode]
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
      status: config.queryStatus,
    }
    if (dateFrom) params.visit_date_from = dateFrom
    if (dateTo) params.visit_date_to = dateTo
    if (creatorCampusId) params.creator_campus_id = creatorCampusId
    return params
  }, [config.queryStatus, creatorCampusId, dateFrom, dateTo, page, pageSize])

  const listQuery = useQuery({
    queryKey: dailyControlQueryKeys.visitScheduleList(queryParams),
    queryFn: () => getVisitSchedules(queryParams),
  })

  const items = listQuery.data?.items
  const data = useMemo(() => items ?? [], [items])
  const total = listQuery.data?.total ?? 0
  const isLoading = listQuery.isLoading || listQuery.isFetching

  // 批量操作权限（仅诺到模式需要）
  const canBatchOperate = useMemo(() => {
    if (mode !== 'promised') return false
    if (isSuperUser) return true
    return data.some((item) => item.can_approve)
  }, [mode, data, isSuperUser])

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
            successMessage: `成功通过并导入 ${result?.success_count ?? 0} 条记录`,
            warningMessage: (result?.failed_records?.length ?? 0) > 0 ? `${result!.failed_records.length} 条记录导入失败` : undefined,
          }
        }
        case 'batchCancelImport': {
          const result = await batchCancelImportVisitSchedules(action.recordIds)
          return {
            successMessage: `成功取消导入 ${result?.success_count ?? 0} 条记录`,
            warningMessage: (result?.failed_records?.length ?? 0) > 0 ? `${result!.failed_records.length} 条记录取消失败` : undefined,
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

  // ==================== 列定义 ====================

  const baseColumns: ColumnProps<VisitScheduleItem>[] = [
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
      title: mode === 'promised' ? '预约日期' : '到访日期', dataIndex: 'visit_date', width: 140,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return <span>{formatDateWithWeekday(record.visit_date)}</span>
      },
    },
  ]

  // 到访模式多一列"到访时间"
  const timeColumn: ColumnProps<VisitScheduleItem> = {
    title: '到访时间', dataIndex: 'visit_time', width: 80,
    render: (_text, record) => {
      if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
      return <span>{record.visit_time?.substring(0, 5) || '-'}</span>
    },
  }

  // 诺到模式多一列"创建日期"
  const createdAtColumn: ColumnProps<VisitScheduleItem> = {
    title: '创建日期', dataIndex: 'created_at', width: 140,
    render: (_text, record) => {
      if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
      if (!record.created_at) return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
      const datePart = record.created_at.split('T')[0]
      return <span>{formatDateWithWeekday(datePart)}</span>
    },
  }

  // 诺到模式多一列"创建人"
  const createdByColumn: ColumnProps<VisitScheduleItem> = {
    title: '创建人', dataIndex: 'created_by_name', width: 80,
    render: (_text, record) => {
      if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
      return <span>{record.created_by_name || '-'}</span>
    },
  }

  const sharedColumns: ColumnProps<VisitScheduleItem>[] = [
    {
      title: mode === 'promised' ? '邀约咨询' : '接待顾问', dataIndex: 'advisor_name', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.advisor_name || '-'}</span>
      },
    },
    {
      title: '来源渠道', dataIndex: 'source_channel_name', width: 100,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 70 }} />
        return record.source_channel_name
          ? <Tag size="small" color="cyan">{record.source_channel_name}</Tag>
          : <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
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
        const approvalStatus = (record.approval_status || 'draft') as ApprovalStatus
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
  ]

  // 操作列 — 根据 mode 不同渲染不同的操作菜单
  const actionColumn: ColumnProps<VisitScheduleItem> = {
    title: '操作', dataIndex: 'actions', width: mode === 'promised' ? 120 : 140, fixed: 'right' as const,
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

              {/* 诺到模式：状态变更操作 */}
              {mode === 'promised' && (
                <>
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
                </>
              )}

              {/* 到访模式：登记缴费 */}
              {mode === 'visited' && (
                <Dropdown.Item
                  icon={<IconCreditCard style={{ color: 'var(--semi-color-text-2)' }} />}
                  disabled
                >
                  登记缴费（待开发）
                </Dropdown.Item>
              )}

              {/* 审批操作（两种模式通用） */}
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
  }

  // 组装列：根据 mode 插入不同的列
  const columns: ColumnProps<VisitScheduleItem>[] = [
    ...baseColumns,
    ...(mode === 'visited' ? [timeColumn] : [createdAtColumn, createdByColumn]),
    ...sharedColumns,
    actionColumn,
  ]

  // ==================== 渲染 ====================

  return (
    <Card
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 16px 0' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{config.title}</span>
            {mode === 'promised' && visibleSelectedRowKeys.length > 0 && (
              <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>已选择 {visibleSelectedRowKeys.length} 条</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 批量操作按钮 — 仅诺到模式 */}
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
            <Button icon={<IconPlus />} theme="solid" onClick={handleCreate}>{config.createLabel}</Button>
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
          if (mode === 'promised') setSelectedRowKeys([])
          setPage(nextPage)
        }}
        onPageSizeChange={(size) => {
          if (mode === 'promised') setSelectedRowKeys([])
          setPageSize(size)
          setPage(1)
        }}
        rowSelection={mode === 'promised' ? {
          selectedRowKeys: visibleSelectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        } : undefined}
        rowClassName={(record) => record?.is_counted ? 'semi-row-imported' : ''}
        emptyText={config.emptyText}
      />
      <VisitScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus={config.defaultDialogStatus}
        onSuccess={() => { void queryClient.invalidateQueries({ queryKey: dailyControlQueryKeys.all }) }}
        editData={editData}
      />
    </Card>
  )
}
