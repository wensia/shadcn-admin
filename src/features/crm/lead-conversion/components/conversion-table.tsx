/**
 * 转化记录表格组件 (Semi Design)
 * 显示诺到、到访、缴费记录
 */

import { useMemo } from 'react'
import { Tag, Dropdown, Button, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { IconMore } from '@douyinfe/semi-icons'
import { Eye, Edit, Trash2 } from 'lucide-react'
import { formatTime } from '@/lib/utils/time'
import { PaymentStatus, VisitStatus, type ConversionType, type Payment, type VisitSchedule } from '../types'

const { Text } = Typography

// 统一的记录类型
interface ConversionRecord {
  id: string
  type: ConversionType
  lead_id: string
  child_name?: string
  parent_phone?: string
  record_time: string
  status: string
  status_display: string
  amount?: number
  payment_method_display?: string
  payment_type_display?: string
  campus_name?: string
  remark?: string
  created_at: string
  created_by_name?: string
  original: Payment | VisitSchedule
}

interface ConversionTableProps {
  data: ConversionRecord[]
  total: number
  page: number
  pageSize: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onView?: (record: ConversionRecord) => void
  onEdit?: (record: ConversionRecord) => void
  onDelete?: (record: ConversionRecord) => void
}

// 类型标签映射
const typeLabels: Record<ConversionType, string> = {
  scheduled: '诺到',
  visited: '到访',
  payment: '缴费',
}

// 类型标签颜色
const typeTagColors: Record<ConversionType, string> = {
  scheduled: 'blue',
  visited: 'green',
  payment: 'purple',
}

// 状态标签颜色
function getStatusTagColor(type: ConversionType, status: string): string {
  if (type === 'payment') {
    switch (status) {
      case PaymentStatus.CONFIRMED: return 'green'
      case PaymentStatus.PENDING: return 'orange'
      case PaymentStatus.REFUNDED:
      case PaymentStatus.CANCELLED: return 'grey'
      default: return 'blue'
    }
  } else {
    switch (status) {
      case VisitStatus.VISITED: return 'green'
      case VisitStatus.SCHEDULED: return 'blue'
      case VisitStatus.NOSHOW: return 'red'
      case VisitStatus.CANCELLED: return 'grey'
      default: return 'blue'
    }
  }
}

export function ConversionTable({
  data,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
}: ConversionTableProps) {
  const columns = useMemo<ColumnProps<ConversionRecord>[]>(() => [
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (_type: ConversionType, record: ConversionRecord) => (
        <Tag color={typeTagColors[record.type]} type="light">
          {typeLabels[record.type]}
        </Tag>
      ),
    },
    {
      title: '学生姓名',
      dataIndex: 'child_name',
      width: 100,
      render: (_childName: string | undefined, record: ConversionRecord) => (
        <Text strong>{record.child_name || '-'}</Text>
      ),
    },
    {
      title: '联系电话',
      dataIndex: 'parent_phone',
      width: 120,
      render: (_phone: string | undefined, record: ConversionRecord) => record.parent_phone || '-',
    },
    {
      title: '时间',
      dataIndex: 'record_time',
      width: 150,
      render: (_recordTime: string, record: ConversionRecord) => formatTime(record.record_time, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_status: string, record: ConversionRecord) => (
        <Tag color={getStatusTagColor(record.type, record.status)} type="light">
          {record.status_display}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (_amount: number | undefined, record: ConversionRecord) => {
        if (record.type !== 'payment' || record.amount === undefined) return '-'
        return (
          <Text style={{ fontWeight: 500, color: '#16a34a' }}>
            ¥{record.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </Text>
        )
      },
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method_display',
      width: 100,
      render: (_method: string | undefined, record: ConversionRecord) => record.payment_method_display || '-',
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 100,
      render: (_campusName: string | undefined, record: ConversionRecord) => record.campus_name || '-',
    },
    {
      title: '创建人',
      dataIndex: 'created_by_name',
      width: 80,
      render: (_createdByName: string | undefined, record: ConversionRecord) => record.created_by_name || '-',
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 60,
      fixed: 'right' as const,
      render: (_actions: string, record: ConversionRecord) => (
        <Dropdown
          trigger="click"
          clickToHide
          position="bottomRight"
          render={
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => onView?.(record)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Eye style={{ width: 16, height: 16 }} />
                  查看
                </span>
              </Dropdown.Item>
              <Dropdown.Item onClick={() => onEdit?.(record)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Edit style={{ width: 16, height: 16 }} />
                  编辑
                </span>
              </Dropdown.Item>
              <Dropdown.Item type="danger" onClick={() => onDelete?.(record)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trash2 style={{ width: 16, height: 16 }} />
                  删除
                </span>
              </Dropdown.Item>
            </Dropdown.Menu>
          }
        >
          <Button icon={<IconMore />} theme="borderless" type="tertiary" style={{ padding: 4 }} />
        </Dropdown>
      ),
    },
  ], [onView, onEdit, onDelete])

  return (
    <SemiDataTable<ConversionRecord>
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      isLoading={isLoading}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={(record) => onView?.(record)}
      emptyText="暂无数据"
    />
  )
}

export type { ConversionRecord }
