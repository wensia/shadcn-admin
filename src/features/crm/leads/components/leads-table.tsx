/**
 * Leads数据表格组件
 * 使用TanStack Table + TanStack Virtual实现高性能虚拟滚动
 * 支持 Mira/Lyra 风格切换
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatTime } from '@/lib/utils/time'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { cn } from '@/lib/utils'
import { useStyle } from '@/context/style-provider'
import { useStyleClasses } from '@/lib/style-utils'
import type { LeadListItem } from '../types'
import { gradeLabels } from '../types'
import { LeadStatusBadge, IntentionLevelBadge } from './status-badges'

// 骨架屏占位数据标识
const SKELETON_ID_PREFIX = '__skeleton__'

// 生成骨架屏占位数据
function createSkeletonData(count: number): LeadListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    child_name: '',
    parent_name: '',
    grade: undefined,
    source_channel_id: '',
    source_channel_name: '',
    status: 'pending_assign' as LeadStatus,
    intention_level: undefined,
    advisor_name: '',
    owner_campus_name: '',
    created_by_name: '',
    created_at: '',
    next_followup_at: '',
    age: 0,
    tag: '',
    is_starred: false,
    last_followup_at: '',
    last_followup_result: undefined,
    followup_count: 0,
    import_batch_id: '',
    batch_remark: null,
    batch_name: null,
  }))
}

// 判断是否是骨架屏数据
function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

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
  const columns = useMemo<ColumnDef<LeadListItem>[]>(
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
      // 儿童姓名
      {
        accessorKey: 'child_name',
        header: '儿童姓名',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-[80%]" />
          }
          return (
            <div className={cn('font-medium', s.text.xs)}>{row.original.child_name || '-'}</div>
          )
        },
        size: getColumnSize(120)
      },
      // 年龄
      {
        accessorKey: 'age',
        header: '年龄',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-8" />
          }
          return (
            <div className={s.text.xs}>{row.original.age || '-'}</div>
          )
        },
        size: getColumnSize(60)
      },
      // 家长姓名
      {
        accessorKey: 'parent_name',
        header: '家长姓名',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className={s.text.xs}>{row.original.parent_name || '-'}</div>
          )
        },
        size: getColumnSize(120)
      },
      // 年级
      {
        accessorKey: 'grade',
        header: '年级',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return (
            <div className={s.text.xs}>
              {row.original.grade ? gradeLabels[row.original.grade] : '-'}
            </div>
          )
        },
        size: getColumnSize(100)
      },
      // 来源渠道
      {
        accessorKey: 'source_channel_name',
        header: '来源渠道',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className={s.text.xs}>{row.original.source_channel_name || '-'}</div>
          )
        },
        size: getColumnSize(120)
      },
      // 状态
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className={cn("h-5 w-16", s.rounded)} />
          }
          return <LeadStatusBadge status={row.original.status} className={cn(s.text.xs, s.height.badge, s.roundedBadge)} />
        },
        size: getColumnSize(100)
      },
      // 意向等级
      {
        accessorKey: 'intention_level',
        header: '意向等级',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className={cn("h-5 w-16", s.rounded)} />
          }
          const level = row.original.intention_level
          if (!level) return <span className={cn(s.text.xs, 'text-muted-foreground')}>-</span>
          return <IntentionLevelBadge level={level} className={cn(s.text.xs, s.height.badge, s.roundedBadge)} />
        },
        size: getColumnSize(100)
      },
      // 顾问
      {
        accessorKey: 'advisor_name',
        header: '顾问',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          return (
            <div className={s.text.xs}>{row.original.advisor_name || '-'}</div>
          )
        },
        size: getColumnSize(100)
      },
      // 校区
      {
        accessorKey: 'owner_campus_name',
        header: '校区',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <div className={s.text.xs}>{row.original.owner_campus_name}</div>
          )
        },
        size: getColumnSize(120)
      },
      // 创建人
      {
        accessorKey: 'created_by_name',
        header: '创建人',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          return (
            <div className={s.text.xs}>{row.original.created_by_name || '-'}</div>
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
            return <Skeleton className="h-4 w-32" />
          }
          return (
            <div className={s.text.xs}>{formatTime(row.original.created_at)}</div>
          )
        },
        size: getColumnSize(150)
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
