/**
 * 到访 Tab - Semi Design 版
 * 状态: visited
 */

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Skeleton, Dropdown, Tag, Toast } from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh, IconMore, IconEdit, IconCreditCard } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  getVisitSchedules,
  type VisitScheduleItem,
  type VisitScheduleQueryParams,
} from '../api'
import { VisitScheduleDialog } from './visit-schedule-dialog'
import { CopyableCell } from './copyable-cell'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { isSkeletonRow } from '@/lib/table-utils'

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

interface ActualVisitTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

export function ActualVisitTab({ dateFrom, dateTo, creatorCampusId }: ActualVisitTabProps) {
  const [data, setData] = useState<VisitScheduleItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editData, setEditData] = useState<VisitScheduleItem | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: VisitScheduleQueryParams = { page, size: pageSize, status: 'visited' }
      if (dateFrom) params.visit_date_from = dateFrom
      if (dateTo) params.visit_date_to = dateTo
      if (creatorCampusId) params.creator_campus_id = creatorCampusId
      const result = await getVisitSchedules(params)
      setData(result.data?.items ?? [])
      setTotal(result.data?.total ?? 0)
    } catch (error) {
      showApiErrorToast(error, '获取到访列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [creatorCampusId, dateFrom, dateTo, page, pageSize])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleEdit = (item: VisitScheduleItem) => { setEditData(item); setDialogOpen(true) }
  const handleCreate = () => { setEditData(null); setDialogOpen(true) }
  const handleRegisterPayment = (_item: VisitScheduleItem) => { Toast.info('缴费登记功能开发中') }

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
                <Dropdown.Item icon={<IconCreditCard style={{ color: 'var(--semi-color-success)' }} />} onClick={() => handleRegisterPayment(record)}>登记缴费</Dropdown.Item>
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
          <span style={{ fontSize: 16, fontWeight: 500 }}>到访列表</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button icon={<IconPlus />} theme="solid" onClick={handleCreate}>新建到访</Button>
            <Button icon={<IconRefresh spin={isLoading} />} onClick={() => void fetchData()} />
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
        open={dialogOpen} onOpenChange={setDialogOpen}
        defaultStatus="visited" onSuccess={() => void fetchData()} editData={editData}
      />
    </Card>
  )
}
