/**
 * 缴费 Tab - Semi Design 版
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Card, Skeleton, Dropdown, Tag, Toast } from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh, IconMore, IconEdit, IconTickCircle, IconDelete, IconUpload } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { useAuthStore } from '@/stores/auth-store'
import {
  getPayments,
  updatePaymentStatus,
  deletePayment,
  batchImportPayments,
  batchCancelImportPayments,
  type PaymentItem,
  paymentStatusLabels,
  paymentMethodLabels,
  paymentTypeLabels,
} from '../api'
import { PaymentDialog } from '@/features/crm/lead-conversion/components/payment-dialog'
import { CopyableCell } from './copyable-cell'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow } from '@/lib/table-utils'

// 星期映射
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function formatDateWithWeekday(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  try {
    const datePart = dateStr.split('T')[0]
    const date = new Date(datePart)
    const weekday = weekDays[date.getDay()]
    return `${datePart} ${weekday}`
  } catch {
    return dateStr
  }
}

// 状态颜色
const paymentStatusColor: Record<string, 'orange' | 'green' | 'red' | 'grey'> = {
  pending: 'orange', confirmed: 'green', rejected: 'red', refunded: 'grey',
}

interface PaymentTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

export function PaymentTab({ dateFrom, dateTo, creatorCampusId }: PaymentTabProps) {
  const [data, setData] = useState<PaymentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editData, setEditData] = useState<PaymentItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const user = useAuthStore((state) => state.user)
  const isSuperUser = user?.is_superuser ?? false

  const canBatchOperate = useMemo(() => {
    if (isSuperUser) return true
    return data.some(item => item.can_approve)
  }, [isSuperUser, data])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setSelectedRowKeys([])
    try {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (creatorCampusId) params.creator_campus_id = creatorCampusId
      const result = await getPayments(params)
      if (result) {
        setData(result.items || [])
        setTotal(result.total || 0)
      }
    } catch {
      Toast.error('获取缴费列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, dateFrom, dateTo, creatorCampusId])

  useEffect(() => { fetchData() }, [fetchData])

  const selectedNotImportedIds = useMemo(() => {
    return data.filter(item => selectedRowKeys.includes(item.id) && !item.is_counted).map(item => item.id)
  }, [selectedRowKeys, data])

  const selectedImportedIds = useMemo(() => {
    return data.filter(item => selectedRowKeys.includes(item.id) && item.is_counted).map(item => item.id)
  }, [selectedRowKeys, data])

  const handleBatchImport = async () => {
    if (selectedNotImportedIds.length === 0) { Toast.warning('请选择未导入的记录'); return }
    setIsImporting(true)
    try {
      const result = await batchImportPayments(selectedNotImportedIds)
      if (result.success_count > 0) Toast.success(`成功导入 ${result.success_count} 条记录`)
      if (result.failed_records.length > 0) Toast.warning(`${result.failed_records.length} 条记录导入失败`)
      fetchData()
    } catch { Toast.error('批量导入失败') } finally { setIsImporting(false) }
  }

  const handleBatchCancelImport = async () => {
    if (selectedImportedIds.length === 0) { Toast.warning('请选择已导入的记录'); return }
    setIsImporting(true)
    try {
      const result = await batchCancelImportPayments(selectedImportedIds)
      if (result.success_count > 0) Toast.success(`成功取消导入 ${result.success_count} 条记录`)
      if (result.failed_records.length > 0) Toast.warning(`${result.failed_records.length} 条记录取消失败`)
      fetchData()
    } catch { Toast.error('批量取消导入失败') } finally { setIsImporting(false) }
  }

  const handleConfirm = async (item: PaymentItem) => {
    try { await updatePaymentStatus(item.id, 'confirmed'); Toast.success('已确认缴费'); fetchData() }
    catch { Toast.error('操作失败') }
  }

  const handleEdit = (item: PaymentItem) => { setEditData(item); setDialogOpen(true) }
  const handleCreate = () => { setEditData(null); setDialogOpen(true) }

  const handleDelete = async (item: PaymentItem) => {
    if (item.is_counted) { Toast.error('已导入日控表的记录不可删除，请先取消导入'); return }
    if (!confirm(`确定要删除 ${item.child_name || '该学生'} 的缴费记录吗？`)) return
    try { await deletePayment(item.id); Toast.success('删除成功'); fetchData() }
    catch { Toast.error('删除失败') }
  }

  const columns: ColumnProps<PaymentItem>[] = [
    {
      title: '学生姓名', dataIndex: 'child_name', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 500 }}>{record.child_name || '-'}</span>
            {record.lead_deleted && <Tag size="small" color="red">线索已删</Tag>}
          </div>
        )
      },
    },
    {
      title: '联系电话', dataIndex: 'parent_phone', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return <span>{record.parent_phone || '-'}</span>
      },
    },
    {
      title: '缴费金额', dataIndex: 'amount', width: 100,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        return <span style={{ fontWeight: 500, color: 'var(--semi-color-success)' }}>¥{record.amount?.toLocaleString() || 0}</span>
      },
    },
    {
      title: '支付方式', dataIndex: 'payment_method', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.payment_method_display || paymentMethodLabels[record.payment_method] || '-'}</span>
      },
    },
    {
      title: '缴费类型', dataIndex: 'payment_type', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.payment_type_display || paymentTypeLabels[record.payment_type] || '-'}</span>
      },
    },
    {
      title: '缴费日期', dataIndex: 'payment_at', width: 120,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
        return <span>{formatDateWithWeekday(record.payment_at)}</span>
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 50 }} />
        return <Tag size="small" color={paymentStatusColor[record.status] || 'grey'}>{record.status_display || paymentStatusLabels[record.status]}</Tag>
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
      title: '收款人', dataIndex: 'collector_name', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
        return <span>{record.collector_name || '-'}</span>
      },
    },
    {
      title: '课程', dataIndex: 'course_name', width: 100,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        return record.course_name ? <CopyableCell content={record.course_name} maxWidthClass="max-w-[100px]" /> : <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
      },
    },
    {
      title: '备注', dataIndex: 'remark', width: 100,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
        return record.remark ? <CopyableCell content={record.remark} maxWidthClass="max-w-[100px]" /> : <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
      },
    },
    {
      title: '操作', dataIndex: 'actions', width: 60, fixed: 'right' as const,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 32 }} />
        return (
          <Dropdown
            trigger="click"
            clickToHide
            position="bottomRight"
            render={
              <Dropdown.Menu>
                <Dropdown.Item icon={<IconEdit />} onClick={() => handleEdit(record)}>编辑</Dropdown.Item>
                <Dropdown.Divider />
                {record.status === 'pending' && (
                  <Dropdown.Item icon={<IconTickCircle style={{ color: 'var(--semi-color-success)' }} />} onClick={() => handleConfirm(record)}>确认缴费</Dropdown.Item>
                )}
                <Dropdown.Divider />
                <Dropdown.Item type="danger" icon={<IconDelete />} onClick={() => handleDelete(record)}>删除</Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <Button theme="borderless" icon={<IconMore />} size="small" />
          </Dropdown>
        )
      },
    },
  ]

  return (
    <Card
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 16px 16px' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>缴费列表</span>
            {selectedRowKeys.length > 0 && (
              <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>已选择 {selectedRowKeys.length} 条</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canBatchOperate && selectedNotImportedIds.length > 0 && (
              <Button icon={<IconUpload />} theme="solid" style={{ background: 'var(--semi-color-success)' }} onClick={handleBatchImport} disabled={isImporting}>
                导入日控表 ({selectedNotImportedIds.length})
              </Button>
            )}
            {canBatchOperate && selectedImportedIds.length > 0 && (
              <Button icon={<IconDelete />} onClick={handleBatchCancelImport} disabled={isImporting}>
                取消导入 ({selectedImportedIds.length})
              </Button>
            )}
            <Button icon={<IconPlus />} theme="solid" onClick={handleCreate}>新建缴费</Button>
            <Button icon={<IconRefresh spin={isLoading} />} onClick={fetchData} />
          </div>
        </div>
      }
    >
      <SemiDataTable<PaymentItem>
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
        rowClassName={(record) => record?.is_counted ? 'semi-row-imported' : ''}
        emptyText="暂无缴费记录"
      />
      <PaymentDialog
        open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchData}
        payment={editData ? {
          ...editData,
          payment_method_display: editData.payment_method_display || '',
          payment_type_display: editData.payment_type_display || '',
          status_display: editData.status_display || '',
          updated_at: editData.updated_at || editData.created_at,
        } : null}
      />
    </Card>
  )
}
