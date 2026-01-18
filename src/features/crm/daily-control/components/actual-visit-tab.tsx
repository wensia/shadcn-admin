/**
 * 到访 Tab - 显示实际到访的线索列表
 * 状态: visited
 */

import { useState, useEffect, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Wallet, MoreHorizontal, RefreshCw, Plus, Pencil } from 'lucide-react'
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
  getVisitSchedules,
  type VisitScheduleItem,
  visitScheduleStatusLabels,
  visitScheduleStatusColors,
} from '../api'
import { VisitScheduleDialog } from './visit-schedule-dialog'
import { CopyableCell } from './copyable-cell'
import { ColumnToggle } from './column-toggle'

// 星期映射
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 格式化日期带星期
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

// 骨架屏占位数据标识
const SKELETON_ID_PREFIX = '__skeleton__'

function createSkeletonData(count: number): VisitScheduleItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    lead_id: '',
    student_name: '',
    phone: '',
    visit_date: '',
    visit_time: '',
    advisor_name: '',
    campus_name: '',
    status: 'visited' as const,
    course_names: [],
    remark: '',
    created_at: '',
  }))
}

function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

interface ActualVisitTabProps {
  dateFrom?: string
  dateTo?: string
}

export function ActualVisitTab({ dateFrom, dateTo }: ActualVisitTabProps) {
  const [data, setData] = useState<VisitScheduleItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editData, setEditData] = useState<VisitScheduleItem | null>(null)

  // 加载数据
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        page,
        size: pageSize,
        status: 'visited',
      }

      if (dateFrom) {
        params.visit_date_from = dateFrom
      }
      if (dateTo) {
        params.visit_date_to = dateTo
      }

      const result = await getVisitSchedules(params)
      if (result) {
        setData(result.items || [])
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('获取到访列表失败:', error)
      toast.error('获取到访列表失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, dateFrom, dateTo])

  // 编辑
  const handleEdit = (item: VisitScheduleItem) => {
    setEditData(item)
    setDialogOpen(true)
  }

  // 新建
  const handleCreate = () => {
    setEditData(null)
    setDialogOpen(true)
  }

  // 登记缴费
  const handleRegisterPayment = (item: VisitScheduleItem) => {
    // TODO: 打开缴费登记弹窗
    toast.info('缴费登记功能开发中')
  }

  // 显示数据
  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData(pageSize) : data
  }, [isLoading, data, pageSize])

  // 列名映射（用于列可见性控制显示）
  const columnLabels: Record<string, string> = {
    student_name: '学生姓名',
    phone: '联系电话',
    visit_date: '到访日期',
    visit_time: '到访时间',
    advisor_name: '接待顾问',
    course_names: '体验课程',
    status: '状态',
    remark: '备注',
    actions: '操作',
  }

  // 表格列定义
  const columns = useMemo<ColumnDef<VisitScheduleItem>[]>(
    () => [
      {
        accessorKey: 'student_name',
        header: '学生姓名',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          return <span className="font-medium">{row.original.student_name || '-'}</span>
        },
        size: 100,
      },
      {
        accessorKey: 'phone',
        header: '联系电话',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-28" />
          }
          return <span>{row.original.phone || '-'}</span>
        },
        size: 120,
      },
      {
        accessorKey: 'visit_date',
        header: '到访日期',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-28" />
          }
          return <span>{formatDateWithWeekday(row.original.visit_date)}</span>
        },
        size: 120,
      },
      {
        accessorKey: 'visit_time',
        header: '到访时间',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return <span>{row.original.visit_time?.substring(0, 5) || '-'}</span>
        },
        size: 80,
      },
      {
        accessorKey: 'advisor_name',
        header: '接待顾问',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return <span>{row.original.advisor_name || '-'}</span>
        },
        size: 80,
      },
      {
        accessorKey: 'course_names',
        header: '体验课程',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-32" />
          }
          const courses = row.original.course_names
          const content = courses?.join('、')
          return content ? (
            <CopyableCell content={content} maxWidthClass="max-w-[150px]" />
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
        size: 150,
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
            <Badge variant="outline" className={cn('text-xs', visitScheduleStatusColors[status])}>
              {visitScheduleStatusLabels[status]}
            </Badge>
          )
        },
        size: 80,
      },
      {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-24" />
          }
          const remark = row.original.remark
          return remark ? (
            <CopyableCell content={remark} maxWidthClass="max-w-[120px]" className="text-muted-foreground" />
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
        size: 120,
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRegisterPayment(item)}>
                  <Wallet className="mr-2 h-4 w-4 text-green-600" />
                  登记缴费
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
        <CardTitle className="text-base font-medium">到访列表</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            新建到访
          </Button>
          <ColumnToggle table={table} columnLabels={columnLabels} />
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
                  {headerGroup.headers.map((header) => {
                    const isActionsColumn = header.id === 'actions'
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() }}
                        className={cn(
                          "text-xs font-semibold",
                          isActionsColumn && "sticky right-0 z-20 bg-card shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const isActionsColumn = cell.column.id === 'actions'
                      return (
                        <TableCell
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className={cn(
                            "py-2 text-xs",
                            isActionsColumn && "sticky right-0 bg-card shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    暂无到访记录
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

      {/* 新建/编辑到访弹窗 */}
      <VisitScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus="visited"
        onSuccess={fetchData}
        editData={editData}
      />
    </Card>
  )
}
