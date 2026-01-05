/**
 * 公海线索页面
 * 从 Vue 项目 LeadsPoolView.vue 迁移
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { toast } from 'sonner'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table'
import { Download, RefreshCw, Search, UserPlus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatTime } from '@/lib/utils/time'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { IntentionLevelBadge } from '../leads/components/status-badges'
import { LeadDetailSheet } from '../leads/components/lead-detail-sheet'
import { leadsPoolApi, type ExportStatusResult } from './api'
import type { LeadPoolItem, LeadPoolListParams } from './types'
import type { IntentionLevel } from '../leads/types'
import { useIsSuperUser } from '@/stores/auth-store'
import { Progress } from '@/components/ui/progress'

// 意向等级选项
const intentionOptions = [
  { value: 'all', label: '全部意向' },
  { value: 'high', label: '高意向' },
  { value: 'medium', label: '中意向' },
  { value: 'low', label: '低意向' }
]

export function LeadsPoolPage() {
  useDocumentTitle('公海线索')
  const queryClient = useQueryClient()
  const s = useStyleClasses()
  const isSuperUser = useIsSuperUser()

  // 分页状态
  const [pagination, setPagination] = useState({ page: 1, size: 20 })

  // 导出相关状态
  const [isExporting, setIsExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportTaskId, setExportTaskId] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<ExportStatusResult | null>(null)

  // 搜索和筛选
  const [searchValue, setSearchValue] = useState('')
  const [intentionFilter, setIntentionFilter] = useState<string>('all')
  const [daysMin, setDaysMin] = useState<string>('')
  const [daysMax, setDaysMax] = useState<string>('')

  // 搜索防抖
  const debouncedSearch = useDebouncedValue(searchValue, 500)

  // 选中的行
  const [selectedRows, setSelectedRows] = useState<LeadPoolItem[]>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // 弹窗状态
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null)

  // 构建查询参数
  const buildParams = (): LeadPoolListParams => {
    const params: LeadPoolListParams = {
      page: pagination.page,
      size: pagination.size
    }
    if (debouncedSearch) params.search = debouncedSearch
    if (intentionFilter !== 'all') params.intention_level = intentionFilter as IntentionLevel
    if (daysMin) params.days_in_pool_min = parseInt(daysMin)
    if (daysMax) params.days_in_pool_max = parseInt(daysMax)
    return params
  }

  // 获取公海线索列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pool-leads', pagination, debouncedSearch, intentionFilter, daysMin, daysMax],
    queryFn: async () => {
      const response = await leadsPoolApi.getPoolLeads(buildParams())
      return response.data
    }
  })

  // 稳定的表格数据引用 - 避免每次渲染创建新数组
  const tableData = useMemo(() => data?.items || [], [data?.items])

  // 批量领取 mutation
  const claimMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      return leadsPoolApi.batchClaimLeads({
        lead_ids: leadIds,
        claim_reason: '批量从公海领取线索'
      })
    },
    onSuccess: () => {
      toast.success(`成功领取 ${selectedRows.length} 条线索`)
      setSelectedRows([])
      setRowSelection({})
      setClaimDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['pool-leads'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '领取失败')
    }
  })

  // 当前页为空但还有数据时，自动跳转到最后一页
  useEffect(() => {
    if (data && !isLoading) {
      const items = data.items || []
      const total = data.total || 0
      // 当前页没有数据，但总数据量大于0，且不在第一页
      if (items.length === 0 && total > 0 && pagination.page > 1) {
        const lastPage = Math.max(1, Math.ceil(total / pagination.size))
        // 只有当 lastPage 与当前页不同时才跳转，防止无限循环
        if (lastPage !== pagination.page) {
          setPagination(prev => ({ ...prev, page: lastPage }))
        }
      }
    }
  }, [data, isLoading, pagination.page, pagination.size])

  // 同步选中状态 - 只在选择变化时更新
  useEffect(() => {
    if (tableData.length > 0) {
      const selected = tableData.filter(item => rowSelection[item.id])
      // 只有当选中的行数变化时才更新，避免不必要的渲染
      setSelectedRows(prev => {
        if (prev.length !== selected.length) return selected
        // 比较 ID 是否相同
        const prevIds = new Set(prev.map(r => r.id))
        const sameSelection = selected.every(r => prevIds.has(r.id))
        return sameSelection ? prev : selected
      })
    } else {
      setSelectedRows([])
    }
  }, [rowSelection, tableData])

  // 表格列定义 - 使用 useMemo 防止每次渲染重新创建
  const columns: ColumnDef<LeadPoolItem>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'child_name',
      header: '孩子姓名',
      size: 100,
      cell: ({ row }) => row.original.child_name || '-'
    },
    {
      accessorKey: 'parent_name',
      header: '家长姓名',
      size: 100,
      cell: ({ row }) => row.original.parent_name || '-'
    },
    {
      accessorKey: 'age',
      header: '年龄',
      size: 60,
      cell: ({ row }) => row.original.age ? `${row.original.age}岁` : '-'
    },
    {
      accessorKey: 'source_channel_name',
      header: '来源渠道',
      size: 120,
      cell: ({ row }) => row.original.source_channel_name || '-'
    },
    {
      accessorKey: 'intention_level',
      header: '意向等级',
      size: 100,
      cell: ({ row }) => {
        const level = row.original.intention_level
        if (!level) return '-'
        return <IntentionLevelBadge level={level} showDot={false} />
      }
    },
    {
      accessorKey: 'pool_info.previous_advisor_name',
      header: '原负责顾问',
      size: 120,
      cell: ({ row }) => row.original.pool_info?.previous_advisor_name || '-'
    },
    {
      accessorKey: 'pool_info.days_in_pool',
      header: '公海天数',
      size: 80,
      cell: ({ row }) => row.original.pool_info?.days_in_pool != null ? `${row.original.pool_info.days_in_pool}天` : '-'
    },
    {
      accessorKey: 'pool_info.pooled_at',
      header: '进入公海时间',
      size: 150,
      cell: ({ row }) => formatTime(row.original.pool_info?.pooled_at)
    }
  ], [])

  // 创建表格实例
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    getRowId: (row) => row.id
  })

  // 分页处理 - 使用 useCallback 防止每次渲染重新创建
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const handlePageSizeChange = useCallback((size: number) => {
    setPagination({ page: 1, size })
  }, [])

  // 行点击处理
  const handleRowClick = (row: LeadPoolItem, event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('[role="checkbox"]') || target.closest('button')) {
      return
    }
    setCurrentLeadId(row.id)
    setDetailSheetOpen(true)
  }

  // 刷新数据
  const handleRefresh = () => {
    refetch()
    toast.success('已刷新')
  }

  // 清除筛选
  const handleClearFilters = () => {
    setSearchValue('')
    setIntentionFilter('all')
    setDaysMin('')
    setDaysMax('')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // 批量领取
  const handleBatchClaim = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    setClaimDialogOpen(true)
  }

  // 确认领取
  const confirmClaim = () => {
    claimMutation.mutate(selectedRows.map(r => r.id))
  }

  // 导出公海线索
  const handleExport = async () => {
    if (isExporting) return

    setIsExporting(true)
    try {
      const params = buildParams()
      // 移除分页参数，导出全部数据
      delete params.page
      delete params.size

      const response = await leadsPoolApi.exportPoolLeads(params)

      if (response instanceof Blob) {
        // 同步导出：直接下载文件
        downloadBlob(response, `公海线索导出_${new Date().toISOString().slice(0, 10)}.xlsx`)
        toast.success('导出成功')
      } else if (response.success && response.data?.task_id) {
        // 异步导出：显示进度对话框
        setExportTaskId(response.data.task_id)
        setExportDialogOpen(true)
        toast.info(response.data.message || '正在后台导出...')
        // 开始轮询任务状态
        pollExportStatus(response.data.task_id)
      } else {
        toast.error(response.message || '导出失败')
      }
    } catch (error) {
      toast.error('导出失败，请稍后重试')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // 下载 Blob 文件
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  // 轮询导出任务状态
  const pollExportStatus = async (taskId: string) => {
    const maxAttempts = 120 // 最多轮询 10 分钟（每 5 秒一次）
    let attempts = 0

    const poll = async () => {
      if (attempts >= maxAttempts) {
        toast.error('导出超时，请稍后重试')
        setExportDialogOpen(false)
        return
      }

      try {
        const response = await leadsPoolApi.getExportStatus(taskId)
        if (response.success && response.data) {
          setExportStatus(response.data)

          if (response.data.status === 'SUCCESS' && response.data.success) {
            // 导出完成，下载文件
            toast.success(response.data.message || '导出完成')
            const blob = await leadsPoolApi.downloadExportFile(taskId)
            downloadBlob(blob, response.data.file_name || '公海线索导出.xlsx')
            setExportDialogOpen(false)
          } else if (response.data.status === 'FAILURE') {
            toast.error(response.data.message || '导出失败')
            setExportDialogOpen(false)
          } else {
            // 继续轮询
            attempts++
            setTimeout(poll, 5000) // 5 秒后再次查询
          }
        }
      } catch (error) {
        console.error('Poll export status error:', error)
        attempts++
        setTimeout(poll, 5000)
      }
    }

    poll()
  }

  // 计算是否有筛选条件
  const hasFilters = searchValue || intentionFilter !== 'all' || daysMin || daysMax

  return (
    <>
      <Main fixed className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* 页面标题 */}
          <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold tracking-tight">公海线索</h1>
              <p className={cn(s.text.xs, 'text-muted-foreground')}>
                从公海池领取未分配的线索
              </p>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {/* 搜索框 */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索姓名或手机号..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value)
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="pl-8"
              />
            </div>

            {/* 意向等级筛选 */}
            <Select
              value={intentionFilter}
              onValueChange={(value) => {
                setIntentionFilter(value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="意向等级" />
              </SelectTrigger>
              <SelectContent>
                {intentionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 公海天数范围 */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="最少天数"
                value={daysMin}
                onChange={(e) => {
                  setDaysMin(e.target.value)
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="w-24"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="最多天数"
                value={daysMax}
                onChange={(e) => {
                  setDaysMax(e.target.value)
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="w-24"
              />
            </div>

            {/* 清除筛选 */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="mr-1 h-4 w-4" />
                清除筛选
              </Button>
            )}

            <div className="flex-1" />

            {/* 选中提示和批量操作 */}
            {selectedRows.length > 0 && (
              <>
                <Badge variant="secondary">
                  已选择 {selectedRows.length} 条
                </Badge>
                <Button size="sm" onClick={handleBatchClaim}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  批量领取
                </Button>
              </>
            )}

            {/* 导出按钮（仅超管可见） */}
            {isSuperUser && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                导出
              </Button>
            )}

            {/* 刷新按钮 */}
            <Button variant="outline" size="icon" onClick={handleRefresh} title="刷新">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* 数据表格 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-muted/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={cn(
                            'h-10 px-3 text-left align-middle font-medium text-muted-foreground',
                            s.text.xs
                          )}
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    // 骨架屏
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {columns.map((_, j) => (
                          <td key={j} className="px-3 py-2">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : table.getRowModel().rows.length === 0 ? (
                    // 空状态
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="h-32 text-center text-muted-foreground"
                      >
                        暂无公海线索
                      </td>
                    </tr>
                  ) : (
                    // 数据行
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b transition-colors hover:bg-muted/50 cursor-pointer',
                          row.getIsSelected() && 'bg-muted'
                        )}
                        onClick={(e) => handleRowClick(row.original, e)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={cn('px-3 py-2', s.text.xs)}
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="border-t px-4 py-2">
              <SimplePagination
                page={pagination.page}
                pageSize={pagination.size}
                total={data?.total || 0}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>
        </div>
      </Main>

      {/* 线索详情抽屉 */}
      <LeadDetailSheet
        leadId={currentLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      {/* 批量领取确认对话框 */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量领取线索</DialogTitle>
            <DialogDescription>
              确定要领取选中的 {selectedRows.length} 条线索吗？
              领取后这些线索将分配给您。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={confirmClaim} disabled={claimMutation.isPending}>
              {claimMutation.isPending ? '领取中...' : '确认领取'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导出进度对话框 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>正在导出公海线索</DialogTitle>
            <DialogDescription>
              数据量较大，正在后台处理中，请稍候...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {exportStatus?.status === 'PENDING' && '等待处理...'}
                {exportStatus?.status === 'STARTED' && '正在导出...'}
                {!exportStatus && '正在准备...'}
              </span>
            </div>
            {exportStatus?.total && (
              <p className="mt-2 text-center text-sm text-muted-foreground">
                共 {exportStatus.total} 条数据
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExportDialogOpen(false)
                setExportTaskId(null)
                setExportStatus(null)
              }}
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default LeadsPoolPage
