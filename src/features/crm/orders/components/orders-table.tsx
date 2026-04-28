/**
 * 订单数据表格组件
 * 使用 SemiDataTable 通用组件
 */

import { useMemo, useState, useCallback } from 'react'
import { Tag, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import type { SemiTagColor } from '@/lib/semi-types'
import type { OrderListItem } from '../types'

const { Text } = Typography

// 支付状态颜色映射
const paymentStatusColorMap: Record<string, SemiTagColor> = {
  pending: 'orange',
  paid: 'green',
  partial: 'blue',
  refunded: 'grey',
  cancelled: 'red'
}

// 审批状态颜色映射
const approvalStatusColorMap: Record<string, SemiTagColor> = {
  pending: 'grey',
  leader_pending: 'blue',
  leader_rejected: 'red',
  finance_pending: 'violet',
  finance_rejected: 'red',
  approved: 'green',
  cancelled: 'grey'
}

interface OrdersTableProps {
  data: OrderListItem[]
  total: number
  page: number
  pageSize: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (order: OrderListItem) => void
  onSelectionChange?: (selectedRows: OrderListItem[]) => void
}

export function OrdersTable({
  data,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange
}: OrdersTableProps) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])

  // 选中变化回调
  const handleSelectionChange = useCallback(
    (keys: (string | number)[], rows: OrderListItem[]) => {
      setSelectedRowKeys(keys)
      onSelectionChange?.(rows)
    },
    [onSelectionChange]
  )

  // 定义表格列
  const columns: ColumnProps<OrderListItem>[] = useMemo(
    () => [
      {
        title: '订单编号',
        dataIndex: 'order_no',
        width: 140,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return (
            <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>
              {record.order_no}
            </Text>
          )
        }
      },
      {
        title: '学员姓名',
        dataIndex: 'child_name',
        width: 100,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return <Text strong style={{ fontSize: 13 }}>{record.child_name || '-'}</Text>
        }
      },
      {
        title: '家长电话',
        dataIndex: 'parent_phone',
        width: 120,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return <Text style={{ fontSize: 13 }}>{record.parent_phone || '-'}</Text>
        }
      },
      {
        title: '订单金额',
        dataIndex: 'total_amount',
        width: 100,
        align: 'right' as const,
        render: (_text: number, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <div>
              <Text strong style={{ fontSize: 13 }}>
                ¥{record.total_amount.toLocaleString()}
              </Text>
              {record.discount_amount > 0 && (
                <div style={{ fontSize: 12, color: 'var(--semi-color-warning)' }}>
                  -¥{record.discount_amount}
                </div>
              )}
            </div>
          )
        }
      },
      {
        title: '实付金额',
        dataIndex: 'actual_amount',
        width: 100,
        align: 'right' as const,
        render: (_text: number, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Text strong style={{ fontSize: 13, color: 'var(--semi-color-success)' }}>
              ¥{record.actual_amount.toLocaleString()}
            </Text>
          )
        }
      },
      {
        title: '支付方式',
        dataIndex: 'payment_method_display',
        width: 80,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
          return <Text style={{ fontSize: 13 }}>{record.payment_method_display || '-'}</Text>
        }
      },
      {
        title: '支付状态',
        dataIndex: 'payment_status',
        width: 90,
        render: (status: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
          return (
            <Tag color={paymentStatusColorMap[status] || 'grey'} shape="circle">
              {record.payment_status_display}
            </Tag>
          )
        }
      },
      {
        title: '审批状态',
        dataIndex: 'approval_status',
        width: 100,
        render: (status: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Tag color={approvalStatusColorMap[status] || 'grey'} shape="circle">
              {record.approval_status_display}
            </Tag>
          )
        }
      },
      {
        title: '课程数',
        dataIndex: 'items_count',
        width: 70,
        align: 'center' as const,
        render: (_text: number, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={40} />
          return (
            <Tag>{record.items_count} 门</Tag>
          )
        }
      },
      {
        title: '校区',
        dataIndex: 'campus_name',
        width: 100,
        ellipsis: { showTitle: false },
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return <Text style={{ fontSize: 13 }}>{record.campus_name || '-'}</Text>
        }
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 140,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
          return (
            <Text type="tertiary" style={{ fontSize: 13 }}>
              {formatTime(record.created_at)}
            </Text>
          )
        }
      }
    ],
    []
  )

  return (
    <SemiDataTable<OrderListItem>
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      isLoading={isLoading}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onRowClick={onRowClick}
      rowSelection={{
        selectedRowKeys,
        onChange: handleSelectionChange,
      }}
      emptyText="暂无订单数据"
    />
  )
}
