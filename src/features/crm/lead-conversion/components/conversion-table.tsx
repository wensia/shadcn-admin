/**
 * 转化记录表格组件
 * 显示诺到、到访、缴费记录
 */

import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils/time'
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { ConversionType, Payment, VisitSchedule } from '../types'
import { paymentMethodLabels, paymentTypeLabels, paymentStatusLabels, visitStatusLabels, PaymentStatus, VisitStatus } from '../types'

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
  payment: '缴费'
}

// 类型标签颜色
const typeVariants: Record<ConversionType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  scheduled: 'outline',
  visited: 'secondary',
  payment: 'default'
}

// 状态标签颜色
function getStatusVariant(type: ConversionType, status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (type === 'payment') {
    switch (status) {
      case PaymentStatus.CONFIRMED:
        return 'default'
      case PaymentStatus.PENDING:
        return 'outline'
      case PaymentStatus.REFUNDED:
      case PaymentStatus.CANCELLED:
        return 'secondary'
      default:
        return 'outline'
    }
  } else {
    switch (status) {
      case VisitStatus.VISITED:
        return 'default'
      case VisitStatus.SCHEDULED:
        return 'outline'
      case VisitStatus.NOSHOW:
        return 'destructive'
      case VisitStatus.CANCELLED:
        return 'secondary'
      default:
        return 'outline'
    }
  }
}

// 骨架屏占位数据
const SKELETON_ID_PREFIX = '__skeleton__'

function createSkeletonData(count: number): ConversionRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    type: 'payment' as ConversionType,
    lead_id: '',
    child_name: '',
    parent_phone: '',
    record_time: '',
    status: '',
    status_display: '',
    created_at: '',
    original: {} as Payment
  }))
}

function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
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
  onDelete
}: ConversionTableProps) {
  // 决定显示的数据
  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData(pageSize) : data
  }, [isLoading, data, pageSize])

  // 定义表格列
  const columns = useMemo<ColumnDef<ConversionRecord>[]>(
    () => [
      // 类型
      {
        accessorKey: 'type',
        header: '类型',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-5 w-12" />
          }
          return (
            <Badge variant={typeVariants[row.original.type]}>
              {typeLabels[row.original.type]}
            </Badge>
          )
        },
        size: 80
      },
      // 学生姓名
      {
        accessorKey: 'child_name',
        header: '学生姓名',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return (
            <span className="font-medium">{row.original.child_name || '-'}</span>
          )
        },
        size: 100
      },
      // 手机号
      {
        accessorKey: 'parent_phone',
        header: '联系电话',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return row.original.parent_phone || '-'
        },
        size: 120
      },
      // 时间
      {
        accessorKey: 'record_time',
        header: '时间',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-32" />
          }
          return formatTime(row.original.record_time, 'YYYY-MM-DD HH:mm')
        },
        size: 150
      },
      // 状态
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-5 w-16" />
          }
          return (
            <Badge variant={getStatusVariant(row.original.type, row.original.status)}>
              {row.original.status_display}
            </Badge>
          )
        },
        size: 100
      },
      // 金额（仅缴费显示）
      {
        accessorKey: 'amount',
        header: '金额',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          if (row.original.type !== 'payment' || row.original.amount === undefined) {
            return '-'
          }
          return (
            <span className="font-medium text-green-600">
              ¥{row.original.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          )
        },
        size: 120
      },
      // 支付方式
      {
        accessorKey: 'payment_method_display',
        header: '支付方式',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return row.original.payment_method_display || '-'
        },
        size: 100
      },
      // 校区
      {
        accessorKey: 'campus_name',
        header: '校区',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          return row.original.campus_name || '-'
        },
        size: 100
      },
      // 创建人
      {
        accessorKey: 'created_by_name',
        header: '创建人',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return row.original.created_by_name || '-'
        },
        size: 80
      },
      // 操作
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-8 w-8" />
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(row.original)}>
                  <Eye className="mr-2 h-4 w-4" />
                  查看
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(row.original)}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(row.original)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 60
      }
    ],
    [onView, onEdit, onDelete]
  )

  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize)
  })

  return (
    <div className="flex flex-col gap-4">
      {/* 表格 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-xs"
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'text-xs',
                    !isSkeletonRow(row.original.id) && 'cursor-pointer hover:bg-muted/50'
                  )}
                  onClick={() => !isSkeletonRow(row.original.id) && onView?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <SimplePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}

export type { ConversionRecord }
