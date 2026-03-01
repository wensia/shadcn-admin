/**
 * 订单数据表格组件
 * Semi Design 重构版 - 使用 Semi Table + ResizeObserver 全高模式
 */

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Table, Tag, Typography, Skeleton } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { formatTime } from '@/lib/utils/time'
import type { OrderListItem } from '../types'

const { Text } = Typography

// 骨架屏占位数据标识
const SKELETON_ID_PREFIX = '__skeleton__'

// 支付状态颜色映射
const paymentStatusColorMap: Record<string, string> = {
  pending: 'orange',
  paid: 'green',
  partial: 'blue',
  refunded: 'grey',
  cancelled: 'red'
}

// 审批状态颜色映射
const approvalStatusColorMap: Record<string, string> = {
  pending: 'grey',
  leader_pending: 'blue',
  leader_rejected: 'red',
  finance_pending: 'violet',
  finance_rejected: 'red',
  approved: 'green',
  cancelled: 'grey'
}

// 生成骨架屏占位数据
function createSkeletonData(count: number): OrderListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    order_no: '',
    lead_id: '',
    child_name: '',
    parent_phone: '',
    total_amount: 0,
    discount_amount: 0,
    actual_amount: 0,
    payment_method: '',
    payment_method_display: '',
    payment_status: 'pending',
    payment_status_display: '',
    payment_at: '',
    collector_name: '',
    campus_name: '',
    approval_status: 'pending',
    approval_status_display: '',
    items_count: 0,
    created_at: '',
    created_by_name: ''
  }))
}

// 判断是否是骨架屏数据
function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

// 骨架屏单元格
function SkeletonCell({ width = '70%' }: { width?: string | number }) {
  return (
    <Skeleton.Paragraph
      rows={1}
      style={{ width, height: 16 }}
      loading
    />
  )
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState<number>(400)
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])

  // 动态计算 scroll.y
  const measure = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    const headerH = el.querySelector('.semi-table-thead')?.getBoundingClientRect().height ?? 47
    const available = el.clientHeight - headerH
    if (available > 100) setScrollY(available)
  }, [])

  useEffect(() => {
    measure()
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  // 决定显示的数据
  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData(pageSize) : data
  }, [isLoading, data, pageSize])

  // 数据变化时清空选中
  useEffect(() => {
    setSelectedRowKeys([])
  }, [data, page, pageSize])

  // 选中变化回调
  const handleSelectionChange = useCallback((keys?: (string | number)[], rows?: OrderListItem[]) => {
    const safeKeys = keys ?? []
    setSelectedRowKeys(safeKeys)
    if (!isLoading && rows) {
      onSelectionChange?.(rows)
    }
  }, [isLoading, onSelectionChange])

  // 定义表格列
  const columns: ColumnProps<OrderListItem>[] = useMemo(
    () => [
      {
        title: '订单编号',
        dataIndex: 'order_no',
        width: 140,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={96} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
          return <Text strong style={{ fontSize: 13 }}>{record.child_name || '-'}</Text>
        }
      },
      {
        title: '家长电话',
        dataIndex: 'parent_phone',
        width: 120,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={96} />
          return <Text style={{ fontSize: 13 }}>{record.parent_phone || '-'}</Text>
        }
      },
      {
        title: '订单金额',
        dataIndex: 'total_amount',
        width: 100,
        align: 'right' as const,
        render: (_text: number, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={48} />
          return <Text style={{ fontSize: 13 }}>{record.payment_method_display || '-'}</Text>
        }
      },
      {
        title: '支付状态',
        dataIndex: 'payment_status',
        width: 90,
        render: (status: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={56} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={40} />
          return (
            <Tag>{record.items_count} 门</Tag>
          )
        }
      },
      {
        title: '校区',
        dataIndex: 'campus_name',
        width: 100,
        ellipsis: true,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
          return <Text style={{ fontSize: 13 }}>{record.campus_name || '-'}</Text>
        }
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 140,
        render: (_text: string, record: OrderListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={112} />
          return (
            <Text type="tertiary" style={{ fontSize: 13 }}>
              {formatTime(record.created_at)}
            </Text>
          )
        }
      }
    ],
    [isLoading]
  )

  return (
    <div
      ref={wrapperRef}
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Table
        columns={columns}
        dataSource={displayData}
        rowKey="id"
        pagination={
          total > 0
            ? {
                currentPage: page,
                pageSize,
                total,
                onPageChange,
                onPageSizeChange,
                showSizeChanger: true,
                pageSizeOpts: [10, 20, 50, 100],
                showTotal: true,
                formatPageText: (info: any) =>
                  `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
              }
            : false
        }
        scroll={{ y: scrollY }}
        rowSelection={
          !isLoading
            ? {
                selectedRowKeys,
                onChange: handleSelectionChange,
              }
            : undefined
        }
        onRow={(record) => ({
          style: !isSkeletonRow((record as OrderListItem).id) ? { cursor: 'pointer' } : undefined,
          onClick: () => {
            const r = record as OrderListItem
            if (!isSkeletonRow(r.id)) {
              onRowClick?.(r)
            }
          },
        })}
        loading={false}
        empty={
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
            暂无订单数据
          </div>
        }
        style={isLoading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
      />
    </div>
  )
}
