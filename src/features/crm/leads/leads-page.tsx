/**
 * Leads主页面
 * 线索管理的主入口组件
 * 支持 Mira/Lyra/Maia 风格切换
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { LeadsTable } from './components/leads-table'
import { LeadsToolbar } from './components/leads-toolbar'
import { LeadDetailSheet } from './components/lead-detail-sheet'
import { LeadFormDialog } from './components/lead-form-dialog'
import { FilterSheet } from './components/filter-sheet'
import {
  BatchAssignDialog,
  BatchReleaseDialog,
  BatchUpdateStatusDialog,
  BatchDeleteDialog
} from './components/batch-dialogs'
import { leadsApi } from './api'
import type { LeadListParams, LeadListItem, Lead, LeadStatus, IntentionLevel } from './types'
import { getLeadStatusStyle, getIntentionLevelStyle } from '@/lib/status-styles'

export function LeadsPage() {
  const queryClient = useQueryClient()
  const s = useStyleClasses()

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    size: 50
  })

  // 搜索和快捷筛选
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([])
  const [intentionFilter, setIntentionFilter] = useState<IntentionLevel[]>([])

  // 搜索防抖:用户输入500ms后才触发查询
  const debouncedSearch = useDebouncedValue(searchValue, 500)

  // 筛选参数
  const [filters, setFilters] = useState<LeadListParams>({})

  // 选中的行
  const [selectedRows, setSelectedRows] = useState<LeadListItem[]>([])

  // Dialog/Sheet状态管理
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [batchAssignDialogOpen, setBatchAssignDialogOpen] = useState(false)
  const [batchReleaseDialogOpen, setBatchReleaseDialogOpen] = useState(false)
  const [batchUpdateStatusDialogOpen, setBatchUpdateStatusDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)

  // 当前选中/编辑的线索
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  // 获取线索列表 - 使用防抖搜索提升性能
  const { data, isLoading } = useQuery({
    queryKey: ['leads', pagination, filters, debouncedSearch, statusFilter, intentionFilter],
    queryFn: async () => {
      const response = await leadsApi.getLeads({
        ...filters,
        search: debouncedSearch || undefined,
        // 如果有多个状态选中，暂时只取第一个（API 可能需要支持多状态筛选）
        status: statusFilter.length > 0 ? statusFilter[0] : undefined,
        intention_level: intentionFilter.length > 0 ? intentionFilter[0] : undefined,
        page: pagination.page,
        size: pagination.size,
        include_styles: true
      })
      return response.data
    }
  })

  // 刷新数据
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    toast.success('已刷新')
  }

  // 导出
  const handleExport = async () => {
    try {
      const blob = await leadsApi.exportLeads({ ...filters })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `线索数据_${new Date().getTime()}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败')
    }
  }

  // 新建线索
  const handleCreate = () => {
    setEditingLead(null)
    setFormDialogOpen(true)
  }

  // 编辑线索
  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormDialogOpen(true)
    setDetailSheetOpen(false) // 关闭详情Sheet
  }

  // 高级筛选
  const handleFilter = () => {
    setFilterSheetOpen(true)
  }

  // 应用筛选
  const handleApplyFilters = (newFilters: LeadListParams) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 })) // 重置到第一页
  }

  // 批量操作成功后的回调
  const handleBatchSuccess = () => {
    setSelectedRows([]) // 清空选择
    queryClient.invalidateQueries({ queryKey: ['leads'] })
  }

  // 批量分配
  const handleBatchAssign = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    setBatchAssignDialogOpen(true)
  }

  // 批量释放
  const handleBatchRelease = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    setBatchReleaseDialogOpen(true)
  }

  // 批量修改状态
  const handleBatchUpdateStatus = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    setBatchUpdateStatusDialogOpen(true)
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    setBatchDeleteDialogOpen(true)
  }

  // 行点击 - 打开详情
  const handleRowClick = (lead: LeadListItem) => {
    setCurrentLeadId(lead.id)
    setDetailSheetOpen(true)
  }

  // 创建跟进记录
  const handleCreateFollowup = (leadId: string) => {
    toast.info('打开创建跟进记录对话框')
    // TODO: 实现跟进记录Dialog
  }

  // 搜索变化
  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    setPagination((prev) => ({ ...prev, page: 1 })) // 重置到第一页
  }

  // 状态筛选变化（支持多选）
  const handleStatusFilterChange = (values: LeadStatus[]) => {
    setStatusFilter(values)
    setPagination((prev) => ({ ...prev, page: 1 })) // 重置到第一页
  }

  // 意向等级筛选变化（支持多选）
  const handleIntentionFilterChange = (values: IntentionLevel[]) => {
    setIntentionFilter(values)
    setPagination((prev) => ({ ...prev, page: 1 })) // 重置到第一页
  }

  // 移除搜索筛选
  const handleRemoveSearch = () => {
    setSearchValue('')
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // 移除状态筛选
  const handleRemoveStatus = () => {
    setStatusFilter([])
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // 移除意向筛选
  const handleRemoveIntention = () => {
    setIntentionFilter([])
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // 重置工具栏筛选
  const handleResetToolbarFilters = () => {
    setSearchValue('')
    setStatusFilter([])
    setIntentionFilter([])
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // 清除所有筛选
  const handleClearAllFilters = () => {
    setSearchValue('')
    setStatusFilter([])
    setIntentionFilter([])
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // 计算活跃筛选条件数量
  const activeFiltersCount =
    (searchValue ? 1 : 0) +
    (statusFilter.length > 0 ? 1 : 0) +
    (intentionFilter.length > 0 ? 1 : 0) +
    Object.keys(filters).filter((key) => {
      const value = filters[key as keyof LeadListParams]
      return value !== undefined && value !== '' && value !== null
    }).length

  return (
    <>
      {/* 主内容区 - fixed 使其填充剩余高度 */}
      <Main fixed className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* 页面标题 - flex-shrink-0 防止收缩 */}
          <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className={cn(s.text.lg, 'font-bold tracking-tight')}>线索管理</h1>
              <p className={cn(s.text.xs, 'text-muted-foreground')}>管理和跟进销售线索</p>
            </div>
            <Button onClick={handleCreate} size="sm" className="h-8">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              新建线索
            </Button>
          </div>

          {/* 工具栏 - flex-shrink-0 */}
          <div className="flex-shrink-0">
            <LeadsToolbar
              selectedCount={selectedRows.length}
              searchValue={searchValue}
              statusFilter={statusFilter}
              intentionFilter={intentionFilter}
              showCreateButton={false}
              onRefreshClick={handleRefresh}
              onExportClick={handleExport}
              onFilterClick={handleFilter}
              onSearchChange={handleSearchChange}
              onStatusFilterChange={handleStatusFilterChange}
              onIntentionFilterChange={handleIntentionFilterChange}
              onResetFilters={handleResetToolbarFilters}
              onBatchAssign={handleBatchAssign}
              onBatchRelease={handleBatchRelease}
              onBatchUpdateStatus={handleBatchUpdateStatus}
              onBatchDelete={handleBatchDelete}
            />
          </div>

          {/* 筛选条件标签栏 - flex-shrink-0 */}
          {activeFiltersCount > 0 && (
            <div className={cn('flex flex-shrink-0 items-center flex-wrap', s.gap.tight)}>
          <span className={cn(s.text.xs, 'text-muted-foreground')}>筛选条件:</span>

          {/* 搜索关键词标签 */}
          {searchValue && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              搜索: {searchValue}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={handleRemoveSearch}
              />
            </Badge>
          )}

          {/* 状态筛选标签 */}
          {statusFilter.length > 0 && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              状态: {statusFilter.map(status => getLeadStatusStyle(status).label).join(', ')}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={handleRemoveStatus}
              />
            </Badge>
          )}

          {/* 意向等级筛选标签 */}
          {intentionFilter.length > 0 && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              意向: {intentionFilter.map(level => getIntentionLevelStyle(level).label).join(', ')}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={handleRemoveIntention}
              />
            </Badge>
          )}

          {/* 高级筛选条件标签 */}
          {filters.source_channel_id && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              来源渠道
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { source_channel_id, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {filters.advisor_id && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              负责顾问
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { advisor_id, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {filters.created_by_id && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              创建人
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { created_by_id, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {filters.owner_campus_id && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              归属校区
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { owner_campus_id, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {filters.intention_level && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              意向等级
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { intention_level, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {(filters.created_from || filters.created_to) && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              创建时间
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { created_from, created_to, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {filters.tag && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              标签: {filters.tag}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { tag, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {filters.days_without_activity && (
            <Badge variant="secondary" className={cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)}>
              无活动天数: {filters.days_without_activity}天
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => {
                  const { days_without_activity, ...rest } = filters
                  setFilters(rest)
                }}
              />
            </Badge>
          )}

          {/* 清除全部按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className={cn(s.height.badge, 'px-2', s.text.xs, 'text-muted-foreground hover:text-foreground')}
              >
                清除全部
              </Button>
            </div>
          )}

          {/* 数据表格容器 - flex-1 min-h-0 允许收缩和滚动 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LeadsTable
              data={data?.items || []}
              total={data?.total || 0}
              page={pagination.page}
              pageSize={pagination.size}
              isLoading={isLoading}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              onPageSizeChange={(size) => setPagination({ page: 1, size })}
              onRowClick={handleRowClick}
              onSelectionChange={setSelectedRows}
            />
          </div>
        </div>
      </Main>

      {/* 线索详情Sheet */}
      <LeadDetailSheet
        leadId={currentLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={handleEdit}
        onCreateFollowup={handleCreateFollowup}
      />

      {/* 创建/编辑线索Dialog */}
      <LeadFormDialog
        lead={editingLead}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leads'] })
        }}
      />

      {/* 高级筛选Sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />

      {/* 批量分配Dialog */}
      <BatchAssignDialog
        open={batchAssignDialogOpen}
        onOpenChange={setBatchAssignDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />

      {/* 批量释放Dialog */}
      <BatchReleaseDialog
        open={batchReleaseDialogOpen}
        onOpenChange={setBatchReleaseDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />

      {/* 批量修改状态Dialog */}
      <BatchUpdateStatusDialog
        open={batchUpdateStatusDialogOpen}
        onOpenChange={setBatchUpdateStatusDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />

      {/* 批量删除Dialog */}
      <BatchDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />
    </>
  )
}
