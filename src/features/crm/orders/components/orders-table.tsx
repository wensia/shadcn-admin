/**
 * 订单数据表格组件
 * 使用TanStack Table + TanStack Virtual实现高性能虚拟滚动
 * 复用 leads-table 的布局结构
 */

import { useRef, useMemo, useEffect, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTime } from '@/lib/utils/time'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { cn } from '@/lib/utils'
import { useStyle } from '@/context/style-provider'
import { useStyleClasses } from '@/lib/style-utils'
import type { OrderListItem } from '../types'

// 骨架屏占位数据标识
const SKELETON_ID_PREFIX = '__skeleton__'

// 支付状态颜色映射
const paymentStatusColorMap: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  refunded: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

// 审批状态颜色映射
const approvalStatusColorMap: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  leader_pending: 'bg-blue-100 text-blue-800',
  leader_rejected: 'bg-red-100 text-red-800',
  finance_pending: 'bg-purple-100 text-purple-800',
  finance_rejected: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600'
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
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const { style } = useStyle()
  const s = useStyleClasses()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Lyra 风格需要更宽的列(等宽字体)
  const getColumnSize = (baseSize: number) => {
    return style === 'lyra' ? Math.ceil(baseSize * 1.1) : baseSize
  }

  // 决定显示的数据：加载时使用骨架屏数据
  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData(pageSize) : data
  }, [isLoading, data, pageSize])

  // 定义表格列
  const columns = useMemo<ColumnDef<OrderListItem>[]>(
    () => [
      // 选择列
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="全选"
              disabled={isLoading}
            />
          </div>
        ),
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <div className="flex items-center justify-center" />
          }
          return (
            <div className="flex items-center justify-center">
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="选择行"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )
        },
        size: 50,
        enableSorting: false,
        enableHiding: false
      },
      // 订单编号
      {
        accessorKey: 'order_no',
        header: '订单编号',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className={cn('font-mono', s.text.xs)}>{row.original.order_no}</div>
          )
        },
        size: getColumnSize(140)
      },
      // 学员姓名
      {
        accessorKey: 'child_name',
        header: '学员姓名',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return (
            <div className={cn('font-medium', s.text.xs)}>{row.original.child_name || '-'}</div>
          )
        },
        size: getColumnSize(100)
      },
      // 家长电话
      {
        accessorKey: 'parent_phone',
        header: '家长电话',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className={s.text.xs}>{row.original.parent_phone || '-'}</div>
          )
        },
        size: getColumnSize(120)
      },
      // 订单金额
      {
        accessorKey: 'total_amount',
        header: () => <div className="text-right">订单金额</div>,
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16 ml-auto" />
          }
          return (
            <div className={cn('text-right', s.text.xs)}>
              <span className="font-medium">¥{row.original.total_amount.toLocaleString()}</span>
              {row.original.discount_amount > 0 && (
                <div className="text-xs text-orange-500">-¥{row.original.discount_amount}</div>
              )}
            </div>
          )
        },
        size: getColumnSize(100)
      },
      // 实付金额
      {
        accessorKey: 'actual_amount',
        header: () => <div className="text-right">实付金额</div>,
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16 ml-auto" />
          }
          return (
            <div className={cn('text-right font-bold text-green-600', s.text.xs)}>
              ¥{row.original.actual_amount.toLocaleString()}
            </div>
          )
        },
        size: getColumnSize(100)
      },
      // 支付方式
      {
        accessorKey: 'payment_method_display',
        header: '支付方式',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-12" />
          }
          return (
            <div className={s.text.xs}>{row.original.payment_method_display || '-'}</div>
          )
        },
        size: getColumnSize(80)
      },
      // 支付状态
      {
        accessorKey: 'payment_status',
        header: '支付状态',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className={cn("h-5 w-14", s.rounded)} />
          }
          return (
            <Badge className={cn('text-xs', paymentStatusColorMap[row.original.payment_status] || 'bg-gray-100', s.roundedBadge)}>
              {row.original.payment_status_display}
            </Badge>
          )
        },
        size: getColumnSize(90)
      },
      // 审批状态
      {
        accessorKey: 'approval_status',
        header: '审批状态',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className={cn("h-5 w-16", s.rounded)} />
          }
          return (
            <Badge className={cn('text-xs', approvalStatusColorMap[row.original.approval_status] || 'bg-gray-100', s.roundedBadge)}>
              {row.original.approval_status_display}
            </Badge>
          )
        },
        size: getColumnSize(100)
      },
      // 课程数
      {
        accessorKey: 'items_count',
        header: '课程数',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-5 w-14" />
          }
          return (
            <Badge variant="outline" className={s.text.xs}>
              {row.original.items_count} 门
            </Badge>
          )
        },
        size: getColumnSize(70)
      },
      // 校区
      {
        accessorKey: 'campus_name',
        header: '校区',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          return (
            <div className={s.text.xs}>{row.original.campus_name || '-'}</div>
          )
        },
        size: getColumnSize(100)
      },
      // 创建时间
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-28" />
          }
          return (
            <div className={cn('text-muted-foreground', s.text.xs)}>{formatTime(row.original.created_at)}</div>
          )
        },
        size: getColumnSize(140)
      }
    ],
    [s, style, isLoading]
  )

  // 初始化表格
  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: !isLoading,
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection: isLoading ? {} : rowSelection
    }
  })

  // 当数据变化时，清空选中状态
  useEffect(() => {
    setRowSelection({})
  }, [data, page, pageSize])

  // 当选中状态变化时，通知父组件
  useEffect(() => {
    if (isLoading) return
    const selectedRowIndices = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    )
    const selectedRows = selectedRowIndices.map((index) => data[parseInt(index)])
    onSelectionChange?.(selectedRows)
  }, [rowSelection, isLoading])

  // 虚拟滚动配置 - 动态行高
  const { rows } = table.getRowModel()
  const estimatedRowSize = style === 'mira' ? 44 : style === 'maia' ? 56 : 48
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => estimatedRowSize,
    overscan: 10
  })

  // 风格切换时重新测量虚拟滚动
  useEffect(() => {
    rowVirtualizer.measure()
  }, [style, rowVirtualizer])

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0)
      : 0

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      {/* 表格容器 - 独立滚动区域 */}
      <div
        ref={tableContainerRef}
        className={cn(
          "min-h-0 flex-1 overflow-auto rounded-md border",
          isLoading && "opacity-60 pointer-events-none transition-opacity duration-200"
        )}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(s.text.xs, 'font-semibold', s.height.control)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]
              const isSkeleton = isSkeletonRow(row.id)
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    !isSkeleton && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => !isSkeleton && onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={cn(s.padding.cell, s.text.xs)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页器 - 固定在底部 */}
      <SimplePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        selectedCount={isLoading ? 0 : table.getSelectedRowModel().rows.length}
        className="mt-auto flex-shrink-0"
        isLoading={isLoading}
      />
    </div>
  )
}
