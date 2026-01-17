/**
 * 缴费 Tab - 显示缴费记录列表
 */

import { useState, useEffect, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { CheckCircle, MoreHorizontal, RefreshCw, Pencil, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { cn } from '@/lib/utils'

import {
  getPayments,
  updatePaymentStatus,
  deletePayment,
  type PaymentItem,
  paymentStatusLabels,
  paymentStatusColors,
  paymentMethodLabels,
  paymentTypeLabels,
} from '../api'
import { PaymentDialog } from '@/features/crm/lead-conversion/components/payment-dialog'

// 骨架屏占位数据标识
const SKELETON_ID_PREFIX = '__skeleton__'

function createSkeletonData(count: number): PaymentItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    lead_id: '',
    child_name: '',
    parent_phone: '',
    amount: 0,
    payment_method: 'cash' as const,
    payment_type: 'deposit' as const,
    status: 'pending' as const,
    payment_at: '',
    collector_name: '',
    campus_name: '',
    course_name: '',
    remark: '',
    created_at: '',
  }))
}

function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

interface PaymentTabProps {
  dateFrom?: string
  dateTo?: string
}

export function PaymentTab({ dateFrom, dateTo }: PaymentTabProps) {
  const [data, setData] = useState<PaymentItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // 加载数据
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        page,
        size: pageSize,
      }

      if (dateFrom) {
        params.date_from = dateFrom
      }
      if (dateTo) {
        params.date_to = dateTo
      }

      const result = await getPayments(params)
      if (result) {
        setData(result.items || [])
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('获取缴费列表失败:', error)
      toast.error('获取缴费列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, dateFrom, dateTo])

  // 确认缴费
  const handleConfirm = async (item: PaymentItem) => {
    try {
      await updatePaymentStatus(item.id, 'confirmed')
      toast.success('已确认缴费')
      fetchData()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  // 编辑
  const handleEdit = (item: PaymentItem) => {
    // TODO: 打开编辑弹窗
    toast.info('编辑功能开发中')
  }

  // 删除
  const handleDelete = async (item: PaymentItem) => {
    if (!confirm(`确定要删除 ${item.child_name || '该学生'} 的缴费记录吗？`)) {
      return
    }
    try {
      await deletePayment(item.id)
      toast.success('删除成功')
      fetchData()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  // 显示数据
  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData(pageSize) : data
  }, [isLoading, data, pageSize])

  // 表格列定义
  const columns = useMemo<ColumnDef<PaymentItem>[]>(
    () => [
      {
        accessorKey: 'child_name',
        header: '学生姓名',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          return <span className="font-medium">{row.original.child_name || '-'}</span>
        },
        size: 100,
      },
      {
        accessorKey: 'parent_phone',
        header: '联系电话',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-28" />
          }
          return <span>{row.original.parent_phone || '-'}</span>
        },
        size: 120,
      },
      {
        accessorKey: 'amount',
        header: '缴费金额',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          return (
            <span className="font-medium text-green-600">
              ¥{row.original.amount?.toLocaleString() || 0}
            </span>
          )
        },
        size: 100,
      },
      {
        accessorKey: 'payment_method',
        header: '支付方式',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          const method = row.original.payment_method
          return <span>{row.original.payment_method_display || paymentMethodLabels[method] || '-'}</span>
        },
        size: 80,
      },
      {
        accessorKey: 'payment_type',
        header: '缴费类型',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          const type = row.original.payment_type
          return <span>{row.original.payment_type_display || paymentTypeLabels[type] || '-'}</span>
        },
        size: 80,
      },
      {
        accessorKey: 'payment_at',
        header: '缴费日期',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          const date = row.original.payment_at
          return <span>{date?.split('T')[0] || '-'}</span>
        },
        size: 100,
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-5 w-14 rounded-full" />
          }
          const status = row.original.status
          return (
            <Badge variant="outline" className={cn('text-xs', paymentStatusColors[status])}>
              {row.original.status_display || paymentStatusLabels[status]}
            </Badge>
          )
        },
        size: 80,
      },
      {
        accessorKey: 'collector_name',
        header: '收款人',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return <span>{row.original.collector_name || '-'}</span>
        },
        size: 80,
      },
      {
        accessorKey: 'course_name',
        header: '课程',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <span className="truncate max-w-[100px]" title={row.original.course_name}>
              {row.original.course_name || '-'}
            </span>
          )
        },
        size: 100,
      },
      {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          return (
            <span className="truncate max-w-[100px] text-muted-foreground" title={row.original.remark}>
              {row.original.remark || '-'}
            </span>
          )
        },
        size: 100,
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-8 w-8" />
          }
          const item = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(item)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑
                </DropdownMenuItem>
                {item.status === 'pending' && (
                  <DropdownMenuItem onClick={() => handleConfirm(item)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    确认缴费
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 60,
      },
    ],
    [isLoading]
  )

  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  })

  return (
    <Card className="flex flex-1 flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">缴费列表</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            新建缴费
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchData}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        {/* 数据表 */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="text-xs font-semibold"
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
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="py-2 text-xs"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    暂无缴费记录
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
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          className="flex-shrink-0"
          isLoading={isLoading}
        />
      </CardContent>

      {/* 新建缴费弹窗 */}
      <PaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchData}
      />
    </Card>
  )
}
