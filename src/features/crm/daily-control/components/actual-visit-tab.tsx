/**
 * 到访 Tab - Semi Design 版
 * 状态: visited
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { Button, Card, Skeleton, Table, Dropdown, Tag, Toast } from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh, IconMore, IconEdit, IconCreditCard } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  getVisitSchedules,
  type VisitScheduleItem,
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
    advisor_name: '', campus_name: '', status: 'visited' as const,
    course_names: [], remark: '', created_at: '',
  }))
}
function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
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

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const params: any = { page, size: pageSize, status: 'visited' }
      if (dateFrom) params.visit_date_from = dateFrom
      if (dateTo) params.visit_date_to = dateTo
      if (creatorCampusId) params.creator_campus_id = creatorCampusId
      const result = await getVisitSchedules(params)
      if (result) {
        setData(result.items || [])
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('获取到访列表失败:', error)
      Toast.error('获取到访列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, pageSize, dateFrom, dateTo, creatorCampusId])

  const handleEdit = (item: VisitScheduleItem) => { setEditData(item); setDialogOpen(true) }
  const handleCreate = () => { setEditData(null); setDialogOpen(true) }
  const handleRegisterPayment = (_item: VisitScheduleItem) => { Toast.info('缴费登记功能开发中') }

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
          pagination={false}
          scroll={{ y: scrollY }}
          style={{ fontSize: 12 }}
          size="middle"
          rowClassName={(record) => record?.is_counted ? 'semi-row-imported' : ''}
          empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无到访记录</div>}
        />
      </div>
      <div style={{ flexShrink: 0, paddingTop: 16 }}>
        <SemiTablePagination
          page={page} pageSize={pageSize} total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        />
      </div>
      <VisitScheduleDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        defaultStatus="visited" onSuccess={fetchData} editData={editData}
      />
    </Card>
  )
}
