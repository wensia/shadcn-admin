/**
 * 线索查看统计页面
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import {
  Download,
  Search,
  RefreshCw,
  Pencil,
  Users,
  Eye,
  MousePointer,
  Activity,
} from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { leadAccessStatsApi } from '../api'
import type {
  AdvisorAccessStatistics,
  AccessStatisticsSummary,
  AccessStatsFilters,
  BatchUpdateLimit,
} from '../types'

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '近7天', value: 'last7days' },
  { label: '本周', value: 'thisweek' },
  { label: '近30天', value: 'last30days' },
  { label: '本月', value: 'thismonth' },
]

// 骨架屏数据 - 在组件外部创建，避免每次渲染都创建新数组
const SKELETON_PREFIX = '__skeleton__'
const SKELETON_DATA: AdvisorAccessStatistics[] = Array.from({ length: 10 }, (_, i) => ({
  user_id: `${SKELETON_PREFIX}${i}`,
  user_name: '',
  username: '',
  campus_name: '',
  view_count: 0,
  total_access: 0,
  daily_limit: 0,
  time_range: '',
  start_date: '',
  end_date: '',
}))

export function LeadAccessStatsPage() {
  const queryClient = useQueryClient()

  // 状态
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<AccessStatsFilters>({
    time_range: 'today',
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // 编辑弹窗状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdvisorAccessStatistics | null>(null)
  const [editDailyLimit, setEditDailyLimit] = useState(500)

  // 批量编辑弹窗状态
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false)
  const [batchDailyLimit, setBatchDailyLimit] = useState(500)

  // 导出状态
  const [exportLoading, setExportLoading] = useState(false)

  // 自动刷新定时器
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 获取统计数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lead-access-stats', filters],
    queryFn: () => leadAccessStatsApi.getAdvisorStatistics(filters),
  })

  const statistics = data?.statistics || []
  const summary: AccessStatisticsSummary = data?.summary || {
    total_users: 0,
    active_users: 0,
    total_views: 0,
    total_access: 0,
    time_range: 'today',
  }

  // 计算活跃率
  const activeRate = useMemo(() => {
    if (summary.total_users === 0) return 0
    return Math.round((summary.active_users / summary.total_users) * 100)
  }, [summary.total_users, summary.active_users])

  // 过滤后的数据
  const filteredData = useMemo(() => {
    if (!searchValue) return statistics
    const keyword = searchValue.toLowerCase()
    return statistics.filter(
      (item) =>
        item.user_name.toLowerCase().includes(keyword) ||
        item.username.toLowerCase().includes(keyword)
    )
  }, [statistics, searchValue])

  // 表格数据
  const tableData = isLoading ? SKELETON_DATA : filteredData

  // 批量更新访问限制
  const batchUpdateMutation = useMutation({
    mutationFn: (updates: BatchUpdateLimit[]) =>
      leadAccessStatsApi.batchUpdateAccessLimits(updates),
    onSuccess: (result) => {
      toast.success(`成功更新 ${result.update_count} 条记录`)
      setEditDialogOpen(false)
      setBatchEditDialogOpen(false)
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['lead-access-stats'] })
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })

  // 打开单个编辑弹窗 - 使用 useCallback 缓存
  const handleEditLimit = useCallback((user: AdvisorAccessStatistics) => {
    setEditingUser(user)
    setEditDailyLimit(user.daily_limit)
    setEditDialogOpen(true)
  }, [])

  // 表格列定义 - 依赖 handleEditLimit
  const columns: ColumnDef<AdvisorAccessStatistics>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="全选"
          />
        ),
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
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
        enableSorting: false,
      },
      {
        accessorKey: 'user_name',
        header: '顾问姓名',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-20" />
          }
          return <span className="font-medium">{row.original.user_name}</span>
        },
      },
      {
        accessorKey: 'campus_name',
        header: '所属校区',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-28" />
          }
          return row.original.campus_name
        },
      },
      {
        accessorKey: 'district_name',
        header: '地区',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-20" />
          }
          return row.original.district_name || '-'
        },
      },
      {
        accessorKey: 'view_count',
        header: '查看线索数',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-12" />
          }
          const count = row.original.view_count
          return (
            <span
              className={
                count > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'
              }
            >
              {count}
            </span>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: 'total_access',
        header: '总访问次数',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-12" />
          }
          return row.original.total_access
        },
        enableSorting: true,
      },
      {
        accessorKey: 'daily_limit',
        header: '每日限制',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-16" />
          }
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 gap-1"
              onClick={() => handleEditLimit(row.original)}
            >
              <span>{row.original.daily_limit}</span>
              <Pencil className="h-3 w-3" />
            </Button>
          )
        },
      },
      {
        id: 'usage_rate',
        header: '使用率',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-12" />
          }
          const rate =
            row.original.daily_limit > 0
              ? Math.round(
                  (row.original.total_access / row.original.daily_limit) * 100
                )
              : 0

          let colorClass = 'text-green-600'
          if (rate >= 90) colorClass = 'text-yellow-600'
          if (rate >= 100) colorClass = 'text-red-600'

          return <span className={`font-medium ${colorClass}`}>{rate}%</span>
        },
      },
      {
        id: 'remaining',
        header: '今日剩余',
        cell: ({ row }) => {
          if (row.original.user_id?.startsWith(SKELETON_PREFIX)) {
            return <Skeleton className="h-4 w-12" />
          }
          const remaining = Math.max(
            0,
            row.original.daily_limit - row.original.total_access
          )

          let colorClass = 'text-green-600'
          if (remaining === 0) colorClass = 'text-red-600'
          else if (remaining < 50) colorClass = 'text-yellow-600'

          return <span className={`font-medium ${colorClass}`}>{remaining}</span>
        },
      },
    ],
    [handleEditLimit]
  )

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: (row) =>
      !row.original.user_id?.startsWith(SKELETON_PREFIX),
    getRowId: (row) => row.user_id,
  })

  // 获取选中的行 - 使用 table 的 API
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original)

  // 处理筛选变化
  const handleFilterChange = useCallback((key: keyof AccessStatsFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
    setRowSelection({}) // 清空选择
  }, [])

  // 保存单个限制
  const handleSaveSingleLimit = useCallback(() => {
    if (!editingUser) return
    if (editDailyLimit === editingUser.daily_limit) {
      setEditDialogOpen(false)
      return
    }
    batchUpdateMutation.mutate([
      { user_id: editingUser.user_id, daily_limit: editDailyLimit },
    ])
  }, [editingUser, editDailyLimit, batchUpdateMutation])

  // 打开批量编辑弹窗
  const handleOpenBatchEdit = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择要修改的顾问')
      return
    }
    setBatchDailyLimit(500)
    setBatchEditDialogOpen(true)
  }, [selectedRows.length])

  // 保存批量限制
  const handleSaveBatchLimit = useCallback(() => {
    if (selectedRows.length === 0) return
    const updates: BatchUpdateLimit[] = selectedRows.map((row) => ({
      user_id: row.user_id,
      daily_limit: batchDailyLimit,
    }))
    batchUpdateMutation.mutate(updates)
  }, [selectedRows, batchDailyLimit, batchUpdateMutation])

  // 导出数据
  const handleExport = useCallback(() => {
    if (filteredData.length === 0) {
      toast.warning('暂无数据可导出')
      return
    }

    setExportLoading(true)

    try {
      const headers = [
        '顾问姓名',
        '所属校区',
        '地区',
        '查看线索数',
        '总访问次数',
        '每日限制',
        '使用率',
      ]

      const rows = filteredData.map((item) => [
        item.user_name,
        item.campus_name,
        item.district_name || '-',
        item.view_count.toString(),
        item.total_access.toString(),
        item.daily_limit.toString(),
        `${item.daily_limit > 0 ? Math.round((item.total_access / item.daily_limit) * 100) : 0}%`,
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const now = new Date()
      const filename = `线索访问统计_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.csv`

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('导出成功')
    } catch {
      toast.error('导出失败')
    } finally {
      setExportLoading(false)
    }
  }, [filteredData])

  // 自动刷新
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      refetch()
    }, 30000)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [refetch])

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">线索查看统计</h1>
            <p className="text-sm text-muted-foreground">
              监控和管理顾问访问线索的频次和限制
            </p>
          </div>
          <Button onClick={handleExport} disabled={exportLoading}>
            <Download className="mr-2 h-4 w-4" />
            {exportLoading ? '导出中...' : '导出数据'}
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总顾问数</p>
                  <p className="text-2xl font-bold">{summary.total_users}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">活跃顾问数</p>
                  <p className="text-2xl font-bold">
                    {summary.active_users}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({activeRate}%)
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总查看线索数</p>
                  <p className="text-2xl font-bold">{summary.total_views}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2">
                  <MousePointer className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">总访问次数</p>
                  <p className="text-2xl font-bold">{summary.total_access}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.time_range || 'today'}
            onValueChange={(value) => handleFilterChange('time_range', value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索顾问姓名..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {selectedRows.length > 0 && (
            <Button variant="outline" onClick={handleOpenBatchEdit}>
              批量修改限制 ({selectedRows.length})
            </Button>
          )}
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 单个编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>修改访问限制</DialogTitle>
            <DialogDescription>
              修改顾问每日访问线索的限制次数
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Label className="w-20 text-right">顾问姓名</Label>
              <span>{editingUser?.user_name}</span>
            </div>
            <div className="flex items-center gap-4">
              <Label className="w-20 text-right">当前限制</Label>
              <span>{editingUser?.daily_limit} 次/天</span>
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="daily-limit" className="w-20 text-right">
                新的限制
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="daily-limit"
                  type="number"
                  min={0}
                  max={9999}
                  value={editDailyLimit}
                  onChange={(e) => setEditDailyLimit(parseInt(e.target.value) || 0)}
                  className="w-32"
                />
                <span className="text-muted-foreground">次/天</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveSingleLimit}
              disabled={batchUpdateMutation.isPending}
            >
              {batchUpdateMutation.isPending ? '保存中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量编辑弹窗 */}
      <Dialog open={batchEditDialogOpen} onOpenChange={setBatchEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>批量修改访问限制</DialogTitle>
            <DialogDescription>
              为选中的顾问统一设置每日访问限制
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Label className="w-20 text-right">选中顾问</Label>
              <span>已选择 {selectedRows.length} 名顾问</span>
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="batch-daily-limit" className="w-20 text-right">
                每日限制
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="batch-daily-limit"
                  type="number"
                  min={0}
                  max={9999}
                  value={batchDailyLimit}
                  onChange={(e) =>
                    setBatchDailyLimit(parseInt(e.target.value) || 0)
                  }
                  className="w-32"
                />
                <span className="text-muted-foreground">次/天</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveBatchLimit}
              disabled={batchUpdateMutation.isPending}
            >
              {batchUpdateMutation.isPending ? '保存中...' : '确定修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
