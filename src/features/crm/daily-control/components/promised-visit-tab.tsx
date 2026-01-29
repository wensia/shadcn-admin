/**
 * 诺到 Tab - 显示承诺到访的线索列表
 * 状态: scheduled
 * 简化版本：移除审批流程，改用批量导入日控表
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'
import { CheckCircle, XCircle, MoreHorizontal, RefreshCw, Plus, Pencil, FileUp, FileX } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useAuthStore } from '@/stores/auth-store'

import {
  getVisitSchedules,
  updateVisitScheduleStatus,
  batchImportVisitSchedules,
  batchCancelImportVisitSchedules,
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
    status: 'scheduled' as const,
    course_names: [],
    remark: '',
    created_at: '',
    created_by_name: '',
    grade_display: '',
  }))
}

function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

interface PromisedVisitTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

export function PromisedVisitTab({ dateFrom, dateTo, creatorCampusId }: PromisedVisitTabProps) {
  const [data, setData] = useState<VisitScheduleItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editData, setEditData] = useState<VisitScheduleItem | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [isImporting, setIsImporting] = useState(false)

  // 获取用户信息
  const user = useAuthStore((state) => state.user)
  const isSuperUser = user?.is_superuser ?? false

  // 判断是否可以显示批量操作按钮（超级管理员或部门经理）
  const canBatchOperate = useMemo(() => {
    if (isSuperUser) return true
    // 如果有任意记录的 can_approve 为 true，则当前用户是部门经理
    return data.some(item => item.can_approve)
  }, [isSuperUser, data])

  // 加载数据
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setRowSelection({}) // 重置选择
    try {
      const params: Record<string, unknown> = {
        page,
        size: pageSize,
        status: 'scheduled',
      }

      if (dateFrom) {
        params.visit_date_from = dateFrom
      }
      if (dateTo) {
        params.visit_date_to = dateTo
      }
      if (creatorCampusId) {
        params.creator_campus_id = creatorCampusId
      }

      const result = await getVisitSchedules(params)
      if (result) {
        setData(result.items || [])
        setTotal(result.total || 0)
      }
    } catch (error) {
      console.error('获取诺到列表失败:', error)
      toast.error('获取诺到列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, dateFrom, dateTo, creatorCampusId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 获取选中的记录ID
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => data[parseInt(index)]?.id)
      .filter(Boolean) as string[]
  }, [rowSelection, data])

  // 获取选中的未导入记录
  const selectedNotImportedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => data[parseInt(index)])
      .filter(item => item && !item.is_counted)
      .map(item => item.id)
  }, [rowSelection, data])

  // 获取选中的已导入记录
  const selectedImportedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => data[parseInt(index)])
      .filter(item => item && item.is_counted)
      .map(item => item.id)
  }, [rowSelection, data])

  // 批量导入
  const handleBatchImport = async () => {
    if (selectedNotImportedIds.length === 0) {
      toast.warning('请选择未导入的记录')
      return
    }

    setIsImporting(true)
    try {
      const result = await batchImportVisitSchedules(selectedNotImportedIds)
      if (result.success_count > 0) {
        toast.success(`成功导入 ${result.success_count} 条记录`)
      }
      if (result.failed_records.length > 0) {
        const reasons = result.failed_records.map(r => r.reason).join('；')
        toast.warning(`${result.failed_records.length} 条记录导入失败：${reasons}`)
      }
      fetchData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      const message = err?.response?.data?.message || '批量导入失败'
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  // 批量取消导入
  const handleBatchCancelImport = async () => {
    if (selectedImportedIds.length === 0) {
      toast.warning('请选择已导入的记录')
      return
    }

    setIsImporting(true)
    try {
      const result = await batchCancelImportVisitSchedules(selectedImportedIds)
      if (result.success_count > 0) {
        toast.success(`成功取消导入 ${result.success_count} 条记录`)
      }
      if (result.failed_records.length > 0) {
        const reasons = result.failed_records.map(r => r.reason).join('；')
        toast.warning(`${result.failed_records.length} 条记录取消失败：${reasons}`)
      }
      fetchData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      const message = err?.response?.data?.message || '批量取消导入失败'
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  // 确认到访
  const handleConfirmVisit = async (item: VisitScheduleItem) => {
    try {
      await updateVisitScheduleStatus(item.id, 'visited')
      toast.success('已确认到访')
      fetchData()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  // 标记未到
  const handleMarkNoShow = async (item: VisitScheduleItem) => {
    try {
      await updateVisitScheduleStatus(item.id, 'noshow')
      toast.success('已标记为未到访')
      fetchData()
    } catch (error) {
      toast.error('操作失败')
    }
  }

  // 取消预约
  const handleCancel = async (item: VisitScheduleItem) => {
    try {
      await updateVisitScheduleStatus(item.id, 'cancelled')
      toast.success('已取消预约')
      fetchData()
    } catch (error) {
      toast.error('操作失败')
    }
  }

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

  // 显示数据
  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData(pageSize) : data
  }, [isLoading, data, pageSize])

  // 列名映射（用于列可见性控制显示）
  const columnLabels: Record<string, string> = {
    select: '选择',
    student_name: '学生姓名',
    phone: '手机号',
    visit_date: '预约日期',
    created_at: '创建日期',
    created_by_name: '创建人',
    advisor_name: '邀约咨询',
    course_names: '体验课程',
    remark: '备注',
    grade_display: '年级',
    status: '状态',
    is_counted: '导入状态',
    actions: '操作',
  }

  // 表格列定义
  const columns = useMemo<ColumnDef<VisitScheduleItem>[]>(
    () => [
      // 复选框列
      {
        id: 'select',
        header: ({ table }) => {
          if (isLoading) return <Skeleton className="h-4 w-4" />
          return (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="全选"
            />
          )
        },
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-4" />
          }
          return (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="选择行"
            />
          )
        },
        size: 40,
        enableHiding: false,
      },
      {
        accessorKey: 'student_name',
        header: '学生姓名',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-20" />
          }
          const item = row.original
          return (
            <div className="flex items-center gap-1">
              <span className="font-medium">{item.student_name || '-'}</span>
              {item.lead_deleted && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-red-50 text-red-600 border-red-200">
                  线索已删
                </Badge>
              )}
            </div>
          )
        },
        size: 120,
      },
      {
        accessorKey: 'phone',
        header: '手机号',
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
        header: '预约日期',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-28" />
          }
          return <span>{formatDateWithWeekday(row.original.visit_date)}</span>
        },
        size: 140,
      },
      {
        accessorKey: 'created_at',
        header: '创建日期',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-28" />
          }
          const createdAt = row.original.created_at
          if (!createdAt) return <span className="text-muted-foreground">-</span>
          // 只显示日期部分
          const datePart = createdAt.split('T')[0]
          return <span>{formatDateWithWeekday(datePart)}</span>
        },
        size: 140,
      },
      {
        accessorKey: 'created_by_name',
        header: '创建人',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return <span>{row.original.created_by_name || '-'}</span>
        },
        size: 80,
      },
      {
        accessorKey: 'advisor_name',
        header: '邀约咨询',
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
        accessorKey: 'grade_display',
        header: '年级',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-4 w-16" />
          }
          return <span>{row.original.grade_display || '-'}</span>
        },
        size: 80,
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
        accessorKey: 'is_counted',
        header: '导入状态',
        cell: ({ row }) => {
          if (isSkeletonRow(row.original.id)) {
            return <Skeleton className="h-5 w-14 rounded-full" />
          }
          const isCounted = row.original.is_counted
          return (
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                isCounted
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              )}
            >
              {isCounted ? '已导入' : '待导入'}
            </Badge>
          )
        },
        size: 80,
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
                {/* 状态变更操作 */}
                <DropdownMenuItem onClick={() => handleConfirmVisit(item)}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  确认到访
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMarkNoShow(item)}>
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  标记未到
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleCancel(item)} className="text-destructive">
                  取消预约
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 60,
        enableHiding: false,
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
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row, index) => String(index),
    initialState: {
      columnVisibility: {
        status: false, // 到访状态列默认隐藏
        is_counted: true, // 导入状态列默认显示
      },
    },
  })

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-shrink-0 flex-row items-center justify-between space-y-0 px-4 py-3">
        <div className="flex items-center gap-4">
          <CardTitle className="text-base font-medium">诺到列表</CardTitle>
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground">
              已选择 {selectedIds.length} 条
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 批量导入按钮 - 仅主管可见 */}
          {canBatchOperate && selectedNotImportedIds.length > 0 && (
            <Button
              size="sm"
              className="h-8 gap-1 bg-green-600 hover:bg-green-700"
              onClick={handleBatchImport}
              disabled={isImporting}
            >
              <FileUp className="h-4 w-4" />
              导入日控表 ({selectedNotImportedIds.length})
            </Button>
          )}
          {/* 批量取消导入按钮 - 仅主管可见 */}
          {canBatchOperate && selectedImportedIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={handleBatchCancelImport}
              disabled={isImporting}
            >
              <FileX className="h-4 w-4" />
              取消导入 ({selectedImportedIds.length})
            </Button>
          )}
          <Button size="sm" className="h-8 gap-1" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            新建诺到
          </Button>
          <ColumnToggle table={table} columnLabels={columnLabels} />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchData}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-0">
        {/* 数据表 */}
        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
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
                table.getRowModel().rows.map((row) => {
                  const isImported = row.original.is_counted
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(isImported && "bg-green-50/50")}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isActionsColumn = cell.column.id === 'actions'
                        return (
                          <TableCell
                            key={cell.id}
                            style={{ width: cell.column.getSize() }}
                            className={cn(
                              "py-2 text-xs",
                              isActionsColumn && "sticky right-0 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                              isActionsColumn && (isImported ? "bg-green-50/50" : "bg-card")
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    暂无诺到记录
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

      {/* 新建/编辑诺到弹窗 */}
      <VisitScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultStatus="scheduled"
        onSuccess={fetchData}
        editData={editData}
      />
    </Card>
  )
}
