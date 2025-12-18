/**
 * Leads数据表格组件
 * 使用TanStack Table + TanStack Virtual实现高性能虚拟滚动
 * Mira风格: 密集型设计、紧凑间距、小字号
 */

import { useRef, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTime } from '@/lib/utils/time'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import type { LeadListItem, LeadStatus, IntentionLevel } from '../types'
import { leadStatusLabels, intentionLevelLabels, gradeLabels } from '../types'

interface LeadsTableProps {
  data: LeadListItem[]
  total: number
  page: number
  pageSize: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (lead: LeadListItem) => void
  onSelectionChange?: (selectedRows: LeadListItem[]) => void
}

/**
 * 获取状态Badge的variant
 */
function getStatusVariant(status: LeadStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default' // 绿色
    case 'invalid':
    case 'closed':
      return 'destructive' // 红色
    case 'pending_assign':
    case 'pending_followup':
      return 'outline' // 灰色
    default:
      return 'secondary' // 蓝色
  }
}

/**
 * 获取意向等级Badge的variant
 */
function getIntentionVariant(level?: IntentionLevel): 'default' | 'secondary' | 'outline' {
  switch (level) {
    case 'high':
      return 'default' // 绿色
    case 'medium':
      return 'secondary' // 黄色
    case 'low':
      return 'outline' // 灰色
    default:
      return 'outline'
  }
}

export function LeadsTable({
  data,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSelectionChange
}: LeadsTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // 定义表格列
  const columns = useMemo<ColumnDef<LeadListItem>[]>(
    () => [
      // 选择列
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="全选"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="选择行"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        size: 50,
        enableSorting: false,
        enableHiding: false
      },
      // 儿童姓名
      {
        accessorKey: 'child_name',
        header: '儿童姓名',
        cell: ({ row }) => (
          <div className="font-medium text-xs">{row.original.child_name || '-'}</div>
        ),
        size: 120
      },
      // 年龄
      {
        accessorKey: 'age',
        header: '年龄',
        cell: ({ row }) => (
          <div className="text-xs">{row.original.age || '-'}</div>
        ),
        size: 60
      },
      // 家长姓名
      {
        accessorKey: 'parent_name',
        header: '家长姓名',
        cell: ({ row }) => (
          <div>{row.original.parent_name || '-'}</div>
        ),
        size: 120
      },
      // 年级
      {
        accessorKey: 'grade',
        header: '年级',
        cell: ({ row }) => (
          <div className="text-xs">
            {row.original.grade ? gradeLabels[row.original.grade] : '-'}
          </div>
        ),
        size: 100
      },
      // 来源渠道
      {
        accessorKey: 'source_channel_name',
        header: '来源渠道',
        cell: ({ row }) => (
          <div className="text-xs">{row.original.source_channel_name || '-'}</div>
        ),
        size: 120
      },
      // 状态
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => (
          <Badge variant={getStatusVariant(row.original.status)} className="text-xs h-5 px-1.5">
            {leadStatusLabels[row.original.status]}
          </Badge>
        ),
        size: 100
      },
      // 意向等级
      {
        accessorKey: 'intention_level',
        header: '意向等级',
        cell: ({ row }) => {
          const level = row.original.intention_level
          if (!level) return <span className="text-xs text-muted-foreground">-</span>
          return (
            <Badge variant={getIntentionVariant(level)} className="text-xs h-5 px-1.5">
              {intentionLevelLabels[level]}
            </Badge>
          )
        },
        size: 100
      },
      // 顾问
      {
        accessorKey: 'advisor_name',
        header: '顾问',
        cell: ({ row }) => (
          <div className="text-xs">{row.original.advisor_name || '-'}</div>
        ),
        size: 100
      },
      // 校区
      {
        accessorKey: 'owner_campus_name',
        header: '校区',
        cell: ({ row }) => (
          <div className="text-xs">{row.original.owner_campus_name}</div>
        ),
        size: 120
      },
      // 创建人
      {
        accessorKey: 'created_by_name',
        header: '创建人',
        cell: ({ row }) => (
          <div className="text-xs">{row.original.created_by_name || '-'}</div>
        ),
        size: 100
      },
      // 创建时间
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => (
          <div className="text-xs">{formatTime(row.original.created_at)}</div>
        ),
        size: 150
      }
    ],
    []
  )

  // 初始化表格
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
    onRowSelectionChange: (updater) => {
      // 更新选中状态
      if (typeof updater === 'function') {
        const newSelection = updater(table.getState().rowSelection)
        // 通知父组件选中状态变化
        const selectedRowIndices = Object.keys(newSelection).filter(
          (key) => newSelection[key]
        )
        const selectedRows = selectedRowIndices.map((index) => data[parseInt(index)])
        onSelectionChange?.(selectedRows)
      }
    },
    state: {
      rowSelection: {}
    }
  })

  // 虚拟滚动配置
  const { rows } = table.getRowModel()
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 44, // Mira风格：更紧凑的行高
    overscan: 10
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0)
      : 0

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xs text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 表格容器 */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto rounded-sm border"
        style={{ height: 'calc(100vh - 280px)' }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-xs font-semibold h-9"
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
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="py-1.5 px-2 text-xs"
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

      {/* 分页器 - Mira风格 */}
      <SimplePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        selectedCount={table.getSelectedRowModel().rows.length}
        className="mt-3"
      />
    </div>
  )
}
