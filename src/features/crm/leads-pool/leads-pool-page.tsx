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
import { Download, ListFilter, RefreshCw, Search, UserPlus, X, Loader2 } from 'lucide-react'
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
import { FilterSheet } from '../leads/components/filter-sheet'
import { leadsPoolApi, type ExportStatusResult } from './api'
import type { LeadPoolItem, LeadPoolListParams } from './types'
import type { LeadListParams, IntentionLevel } from '../leads/types'
import { leadStatusLabels, intentionLevelLabels, gradeLabels, followupResultLabels } from '../leads/types'
import { useIsSuperUser } from '@/stores/auth-store'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { leadsApi } from '../leads/api'
import { apiClient } from '@/lib/api/client'

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
  const [daysMin, setDaysMin] = useState<string>('')
  const [daysMax, setDaysMax] = useState<string>('')

  // 高级筛选
  const [filters, setFilters] = useState<LeadListParams>({})
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)

  // 搜索防抖
  const debouncedSearch = useDebouncedValue(searchValue, 500)

  // 获取筛选选项（用于显示筛选标签的名称）
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    staleTime: 5 * 60 * 1000
  })

  // 获取来源渠道列表（用于显示筛选标签的名称）
  const { data: sourceChannels } = useQuery({
    queryKey: ['source-channels-active'],
    queryFn: async () => {
      const response = await apiClient.get<{ code: number; data: { items: Array<{ id: string; name: string; category: string }> } }>(
        '/source-channels',
        { params: { page: 1, size: 100, is_active: true } }
      )
      return response.data?.items || []
    },
    staleTime: 5 * 60 * 1000
  })

  // 构建 ID -> 名称 的映射
  const filterMaps = useMemo(() => {
    return {
      channels: new Map(sourceChannels?.map(c => [c.id, c.name]) || []),
      campuses: new Map(filterOptions?.campuses?.map(c => [c.id, c.name]) || []),
      followupResults: new Map(filterOptions?.followup_results?.map(r => [r.value, r.label]) || [])
    }
  }, [filterOptions, sourceChannels])

  const followupModeLabels: Record<string, string> = {
    include: '包含',
    exclude: '不包含',
    all: '全部为'
  }

  // 辅助函数：将 ID 数组转换为名称显示
  const getFilterLabel = (ids: string[] | undefined, map: Map<string, string> | undefined, fieldName: string) => {
    if (!ids || ids.length === 0) return null
    if (!map) return `${fieldName} (${ids.length})`
    const names = ids.map(id => map.get(id) || id).filter(Boolean)
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} 等${names.length}项`
  }

  const getFollowupResultLabel = (values: string[] | undefined) => {
    if (!values || values.length === 0) return null
    const names = values.map(value => {
      return filterMaps.followupResults.get(value) || followupResultLabels[value as keyof typeof followupResultLabels] || value
    })
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} 等${names.length}项`
  }

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
    // 搜索：toolbar 搜索优先，否则取 FilterSheet 中的 search
    if (debouncedSearch) params.search = debouncedSearch
    else if (filters.search) params.search = filters.search
    // 意向等级：从高级筛选取（pool API 支持单选，取第一个值）
    if (filters.intention_level && filters.intention_level.length > 0) {
      params.intention_level = filters.intention_level[0] as IntentionLevel
    }
    if (daysMin) params.days_in_pool_min = parseInt(daysMin)
    if (daysMax) params.days_in_pool_max = parseInt(daysMax)
    // 高级筛选条件
    if (filters.status && filters.status.length > 0) params.status = filters.status
    if (filters.source_channel_id && filters.source_channel_id.length > 0) params.source_channel_id = filters.source_channel_id
    if (filters.owner_campus_id && filters.owner_campus_id.length > 0) params.owner_campus_id = filters.owner_campus_id
    if (filters.grade && filters.grade.length > 0) params.grade = filters.grade
    if (filters.age_min != null) params.age_min = filters.age_min
    if (filters.age_max != null) params.age_max = filters.age_max
    if (filters.created_from) params.created_from = filters.created_from
    if (filters.created_to) params.created_to = filters.created_to
    if (filters.advisor_name) params.advisor_name = filters.advisor_name
    if (filters.created_by_name) params.created_by_name = filters.created_by_name
    if (filters.tag) params.tag = filters.tag
    if (filters.followup_result_mode) params.followup_result_mode = filters.followup_result_mode
    if (filters.followup_results && filters.followup_results.length > 0) params.followup_results = filters.followup_results
    if (filters.days_without_activity != null) params.days_without_activity = filters.days_without_activity
    if (filters.activated_from) params.activated_from = filters.activated_from
    if (filters.activated_to) params.activated_to = filters.activated_to
    return params
  }

  // 获取公海线索列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pool-leads', pagination, debouncedSearch, filters, daysMin, daysMax],
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
      showApiErrorToast(error, '领取失败')
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

  // 应用高级筛选
  const handleApplyFilters = (newFilters: LeadListParams) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // 清除筛选
  const handleClearFilters = () => {
    setSearchValue('')
    setFilters({})
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

  // 计算高级筛选活跃条件数
  const advancedFiltersCount = Object.keys(filters).filter((key) => {
    const value = filters[key as keyof LeadListParams]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== '' && value !== null
  }).length

  // 计算是否有筛选条件
  const hasFilters = searchValue || advancedFiltersCount > 0 || daysMin || daysMax

  return (
    <>
      <Main fixed className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
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

            {/* 高级筛选按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterSheetOpen(true)}
              className="relative"
            >
              <ListFilter className="mr-1.5 h-4 w-4" />
              高级筛选
              {advancedFiltersCount > 0 && (
                <Badge variant="default" className="ml-1.5 h-5 min-w-5 px-1 text-xs">
                  {advancedFiltersCount}
                </Badge>
              )}
            </Button>

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

          {/* 筛选条件标签栏 */}
          {(advancedFiltersCount > 0 || searchValue || daysMin || daysMax) && (
            <div className={cn('flex flex-shrink-0 items-center flex-wrap', s.gap.tight)}>
              <span className={cn(s.text.xs, 'text-muted-foreground')}>筛选条件:</span>

              {/* 搜索关键词标签 */}
              {searchValue && (
                <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
                  搜索: {searchValue}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => { setSearchValue(''); setPagination(prev => ({ ...prev, page: 1 })) }}
                  />
                </Badge>
              )}

              {/* 公海天数标签 */}
              {(daysMin || daysMax) && (
                <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
                  公海天数: {daysMin || '0'} - {daysMax || '∞'}天
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => { setDaysMin(''); setDaysMax(''); setPagination(prev => ({ ...prev, page: 1 })) }}
                  />
                </Badge>
              )}

              {/* 高级筛选 - 意向等级 */}
              {filters.intention_level && filters.intention_level.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  意向: {filters.intention_level.map(l => intentionLevelLabels[l]).join(', ')}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { intention_level, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 线索状态 */}
              {filters.status && filters.status.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  状态: {filters.status.map(s => leadStatusLabels[s]).join(', ')}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { status, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 来源渠道 */}
              {filters.source_channel_id && filters.source_channel_id.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  渠道: {getFilterLabel(filters.source_channel_id, filterMaps?.channels, '来源渠道')}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { source_channel_id, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 负责顾问 */}
              {filters.advisor_name && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  顾问: {filters.advisor_name}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { advisor_name, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 创建人 */}
              {filters.created_by_name && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  创建人: {filters.created_by_name}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { created_by_name, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 归属校区 */}
              {filters.owner_campus_id && filters.owner_campus_id.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  校区: {getFilterLabel(filters.owner_campus_id, filterMaps?.campuses, '归属校区')}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { owner_campus_id, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 年级 */}
              {filters.grade && filters.grade.length > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  年级: {filters.grade.map(g => gradeLabels[g]).join(', ')}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { grade, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 回访状态 */}
              {filters.followup_results && filters.followup_results.length > 0 && filters.followup_result_mode && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  回访: {followupModeLabels[filters.followup_result_mode] || filters.followup_result_mode}{' '}
                  {getFollowupResultLabel(filters.followup_results)}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { followup_results, followup_result_mode, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 创建时间 */}
              {(filters.created_from || filters.created_to) && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  时间: {filters.created_from || '...'} ~ {filters.created_to || '...'}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { created_from, created_to, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 高级筛选 - 标签 */}
              {filters.tag && (
                <Badge
                  variant="secondary"
                  className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded, 'cursor-pointer hover:bg-secondary/80')}
                  onClick={() => setFilterSheetOpen(true)}
                >
                  标签: {filters.tag}
                  <span
                    role="button"
                    className="ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      const { tag, ...rest } = filters
                      setFilters(rest)
                    }}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </span>
                </Badge>
              )}

              {/* 清除全部按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className={cn(s.height.badge, 'px-2', s.text.xs, 'text-muted-foreground hover:text-foreground')}
              >
                清除全部
              </Button>
            </div>
          )}

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

      {/* 高级筛选Sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />

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
