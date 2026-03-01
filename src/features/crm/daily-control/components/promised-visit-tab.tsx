/**
 * 诺到 Tab - Semi Design 版
 * 状态: scheduled
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button, Card, Skeleton, Checkbox, Table, Dropdown, Tag, Toast } from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh, IconMore, IconEdit, IconTickCircle, IconCrossCircleStroked, IconUpload, IconDelete } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { useAuthStore } from '@/stores/auth-store'
import {
  getVisitSchedules,
  updateVisitScheduleStatus,
  batchImportVisitSchedules,
  batchCancelImportVisitSchedules,
  type VisitScheduleItem,
  visitScheduleStatusLabels,
} from '../api'
import { VisitScheduleDialog } from './visit-schedule-dialog'
import { CopyableCell } from './copyable-cell'
import { SemiTablePagination } from '@/components/semi/table-pagination'

// 星期映射
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

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

// 骨架屏
const SKELETON_ID_PREFIX = '__skeleton__'
function createSkeletonData(count: number): VisitScheduleItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    lead_id: '', student_name: '', phone: '', visit_date: '', visit_time: '',
    advisor_name: '', campus_name: '', status: 'scheduled' as const,
    course_names: [], remark: '', created_at: '', created_by_name: '', grade_display: '',
  }))
}
function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

// 状态颜色映射
const statusTagColor: Record<string, 'orange' | 'green' | 'red' | 'grey'> = {
  scheduled: 'orange', visited: 'green', noshow: 'red', cancelled: 'grey',
}

interface PromisedVisitTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

export function PromisedVisitTab({ dateFrom, dateTo, creatorCampusId }: PromisedVisitTabProps) {
  const [data, setData] = useState<VisitScheduleItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editData, setEditData] = useState<VisitScheduleItem | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState<number>(400)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const headerH = el.querySelector('.semi-table-thead')?.getBoundingClientRect().height ?? 47
      const available = el.clientHeight - headerH
      if (available > 100) setScrollY(available)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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
      const params: Record<string, unknown> = { page, size: pageSize, status: 'scheduled' }
      if (dateFrom) params.visit_date_from = dateFrom
      if (dateTo) params.visit_date_to = dateTo
      if (creatorCampusId) params.creator_campus_id = creatorCampusId
      const result = await getVisitSchedules(params)
      if (result) {
        setData(result.items || [])
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('获取诺到列表失败:', error)
      Toast.error('获取诺到列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, dateFrom, dateTo, creatorCampusId])

  useEffect(() => { fetchData() }, [fetchData])

  // 选中的未导入/已导入记录
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
      const result = await batchImportVisitSchedules(selectedNotImportedIds)
      if (result.success_count > 0) Toast.success(`成功导入 ${result.success_count} 条记录`)
      if (result.failed_records.length > 0) Toast.warning(`${result.failed_records.length} 条记录导入失败`)
      fetchData()
    } catch { Toast.error('批量导入失败') } finally { setIsImporting(false) }
  }

  const handleBatchCancelImport = async () => {
    if (selectedImportedIds.length === 0) { Toast.warning('请选择已导入的记录'); return }
    setIsImporting(true)
    try {
      const result = await batchCancelImportVisitSchedules(selectedImportedIds)
      if (result.success_count > 0) Toast.success(`成功取消导入 ${result.success_count} 条记录`)
      if (result.failed_records.length > 0) Toast.warning(`${result.failed_records.length} 条记录取消失败`)
      fetchData()
    } catch { Toast.error('批量取消导入失败') } finally { setIsImporting(false) }
  }

  const handleConfirmVisit = async (item: VisitScheduleItem) => {
    try { await updateVisitScheduleStatus(item.id, 'visited'); Toast.success('已确认到访'); fetchData() }
    catch { Toast.error('操作失败') }
  }

  const handleMarkNoShow = async (item: VisitScheduleItem) => {
    try { await updateVisitScheduleStatus(item.id, 'noshow'); Toast.success('已标记为未到访'); fetchData() }
    catch { Toast.error('操作失败') }
  }

  const handleCancel = async (item: VisitScheduleItem) => {
    try { await updateVisitScheduleStatus(item.id, 'cancelled'); Toast.success('已取消预约'); fetchData() }
    catch { Toast.error('操作失败') }
  }

  const handleEdit = (item: VisitScheduleItem) => { setEditData(item); setDialogOpen(true) }
  const handleCreate = () => { setEditData(null); setDialogOpen(true) }

  const displayData = useMemo(() => isLoading ? createSkeletonData(pageSize) : data, [isLoading, data, pageSize])

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
      title: '导入状态', dataIndex: 'is_counted', width: 80,
      render: (_text, record) => {
        if (!record || isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 50 }} />
        return <Tag size="small" color={record.is_counted ? 'green' : 'grey'}>{record.is_counted ? '已导入' : '待导入'}</Tag>
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
                <Dropdown.Item icon={<IconTickCircle style={{ color: 'var(--semi-color-success)' }} />} onClick={() => handleConfirmVisit(record)}>确认到访</Dropdown.Item>
                <Dropdown.Item icon={<IconCrossCircleStroked style={{ color: 'var(--semi-color-danger)' }} />} onClick={() => handleMarkNoShow(record)}>标记未到</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item type="danger" onClick={() => handleCancel(record)}>取消预约</Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <Button theme="borderless" icon={<IconMore />} size="small" />
          </Dropdown>
        )
      },
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (_keys: any, rows: VisitScheduleItem[]) => {
      setSelectedRowKeys(rows.map(r => r.id))
    },
    getCheckboxProps: (record: VisitScheduleItem) => ({
      disabled: isSkeletonRow(record?.id || ''),
    }),
  }

  return (
    <Card
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 16px 16px' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>诺到列表</span>
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
            <Button icon={<IconPlus />} theme="solid" onClick={handleCreate}>新建诺到</Button>
            <Button icon={<IconRefresh spin={isLoading} />} onClick={fetchData} />
          </div>
        </div>
      }
    >
      <div ref={wrapperRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={displayData}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={false}
          scroll={{ y: scrollY }}
          style={{ fontSize: 12 }}
          size="middle"
          rowClassName={(record) => record?.is_counted ? 'semi-row-imported' : ''}
          empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无诺到记录</div>}
        />
      </div>
      <div style={{ flexShrink: 0, paddingTop: 16 }}>
        <SemiTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </div>
      <VisitScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus="scheduled"
        onSuccess={fetchData}
        editData={editData}
      />
    </Card>
  )
}
