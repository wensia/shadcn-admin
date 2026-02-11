/**
 * Leads主页面
 * 线索管理的主入口组件
 * 支持 Mira/Lyra/Maia 风格切换
 */

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
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
import { apiClient } from '@/lib/api/client'
import type { LeadListParams, LeadListItem, Lead, LeadStatus, IntentionLevel, Grade } from './types'
import { getLeadStatusStyle, getIntentionLevelStyle } from '@/lib/status-styles'
import { leadStatusLabels, intentionLevelLabels, gradeLabels, followupResultLabels } from './types'

export function LeadsPage() {
  useDocumentTitle('线索管理')
  const queryClient = useQueryClient()
  const s = useStyleClasses()

  // 获取 URL 搜索参数
  const searchParams = useSearch({ from: '/_authenticated/crm/leads/' })

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20
  })

  // 搜索和快捷筛选
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([])
  const [intentionFilter, setIntentionFilter] = useState<IntentionLevel[]>([])

  // 搜索防抖:用户输入500ms后才触发查询
  const debouncedSearch = useDebouncedValue(searchValue, 500)

  // 筛选参数
  const [filters, setFilters] = useState<LeadListParams>({})

  // 同步 URL 搜索参数到 filters 状态（仅在组件初始化时）
  useEffect(() => {
    const urlFilters: Partial<LeadListParams> = {}

    // 年级筛选
    if (searchParams.grade) {
      urlFilters.grade = [searchParams.grade as Grade]
    }

    // 状态筛选
    if (searchParams.status) {
      setStatusFilter([searchParams.status as LeadStatus])
    }

    // 意向等级筛选
    if (searchParams.intention_level) {
      setIntentionFilter([searchParams.intention_level as IntentionLevel])
    }

    // 来源渠道筛选
    if (searchParams.source_channel_id) {
      urlFilters.source_channel_id = [searchParams.source_channel_id]
    }

    // 归属校区筛选
    if (searchParams.campus_id) {
      urlFilters.owner_campus_id = [searchParams.campus_id]
    }

    // 搜索关键词
    if (searchParams.search) {
      setSearchValue(searchParams.search)
    }

    // 如果有 URL 参数，更新 filters
    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 仅在组件挂载时执行一次

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

  // 获取筛选选项（用于显示筛选标签的名称）
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    staleTime: 5 * 60 * 1000 // 5分钟内不重新获取
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
    staleTime: 5 * 60 * 1000 // 5分钟内不重新获取
  })

  // 构建 ID -> 名称 的映射
  const filterMaps = useMemo(() => {
    return {
      channels: new Map(sourceChannels?.map(c => [c.id, c.name]) || []),
      campuses: new Map(filterOptions?.campuses?.map(c => [c.id, c.name]) || []),
      followupResults: new Map(filterOptions?.followup_results?.map(r => [r.value, r.label]) || [])
    }
  }, [filterOptions, sourceChannels])

  // 辅助函数：将 ID 数组转换为名称显示
  const getFilterLabel = (ids: string[] | undefined, map: Map<string, string> | undefined, fieldName: string) => {
    if (!ids || ids.length === 0) return null
    if (!map) return `${fieldName} (${ids.length})`
    const names = ids.map(id => map.get(id) || id).filter(Boolean)
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} 等${names.length}项`
  }

  const followupModeLabels: Record<string, string> = {
    include: '包含',
    exclude: '不包含',
    all: '全部为'
  }

  const getFollowupResultLabel = (values: string[] | undefined) => {
    if (!values || values.length === 0) return null
    const names = values.map(value => {
      return filterMaps.followupResults.get(value) || followupResultLabels[value as keyof typeof followupResultLabels] || value
    })
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} 等${names.length}项`
  }

  // 获取线索列表 - 使用防抖搜索提升性能
  const { data, isLoading } = useQuery({
    queryKey: ['leads', pagination, filters, debouncedSearch, statusFilter, intentionFilter],
    queryFn: async () => {
      const response = await leadsApi.getLeads({
        ...filters,
        search: debouncedSearch || undefined,
        // 合并 toolbar 快捷筛选和高级筛选的状态/意向等级（支持多选）
        status: statusFilter.length > 0 ? statusFilter : filters.status,
        intention_level: intentionFilter.length > 0 ? intentionFilter : filters.intention_level,
        page: pagination.page,
        size: pagination.size,
        include_styles: true
      })
      return response.data
    }
  })

  // 当前页为空但还有数据时，自动跳转到最后一页
  useEffect(() => {
    if (data && !isLoading) {
      const items = data.items || []
      const total = data.total || 0
      // 当前页没有数据，但总数据量大于0，且不在第一页
      if (items.length === 0 && total > 0 && pagination.page > 1) {
        // 计算最后一页的页码
        const lastPage = Math.max(1, Math.ceil(total / pagination.size))
        // 只有当 lastPage 与当前页不同时才跳转，防止无限循环
        if (lastPage !== pagination.page) {
          setPagination(prev => ({ ...prev, page: lastPage }))
        }
      }
    }
  }, [data, isLoading, pagination.page, pagination.size])

  // 刷新数据
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    toast.success('已刷新')
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

  // 批量操作通用守卫
  const requireSelection = (action: () => void) => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    action()
  }

  const handleBatchAssign = () => requireSelection(() => setBatchAssignDialogOpen(true))
  const handleBatchRelease = () => requireSelection(() => setBatchReleaseDialogOpen(true))
  const handleBatchUpdateStatus = () => requireSelection(() => setBatchUpdateStatusDialogOpen(true))
  const handleBatchDelete = () => requireSelection(() => setBatchDeleteDialogOpen(true))

  // 行点击 - 打开详情
  const handleRowClick = (lead: LeadListItem) => {
    setCurrentLeadId(lead.id)
    setDetailSheetOpen(true)
  }

  // 创建跟进记录
  const handleCreateFollowup = (_leadId: string) => {
    toast.info('打开创建跟进记录对话框')
    // TODO: 实现跟进记录Dialog
  }

  // 重置分页到第一页的通用辅助
  const resetToFirstPage = () => setPagination((prev) => ({ ...prev, page: 1 }))

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    resetToFirstPage()
  }

  const handleStatusFilterChange = (values: LeadStatus[]) => {
    setStatusFilter(values)
    resetToFirstPage()
  }

  const handleIntentionFilterChange = (values: IntentionLevel[]) => {
    setIntentionFilter(values)
    resetToFirstPage()
  }

  const handleRemoveSearch = () => { setSearchValue(''); resetToFirstPage() }
  const handleRemoveStatus = () => { setStatusFilter([]); resetToFirstPage() }
  const handleRemoveIntention = () => { setIntentionFilter([]); resetToFirstPage() }

  // 清空快捷筛选（供 FilterSheet 调用）
  const handleClearQuickFilters = () => {
    setStatusFilter([])
    setIntentionFilter([])
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
      // 处理数组类型的筛选条件
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value !== undefined && value !== '' && value !== null
    }).length

  // 可移除的高级筛选标签组件
  const badgeClasses = cn(s.height.badge, 'px-2', s.text.xs, s.gap.tight, s.rounded)
  const editableBadgeClasses = cn(badgeClasses, 'cursor-pointer hover:bg-secondary/80')
  const removeBtnClasses = "ml-1 -mr-1 p-0.5 rounded-sm hover:bg-muted-foreground/20"

  function FilterBadge({ label, filterKeys, children }: {
    label: string
    filterKeys: (keyof LeadListParams)[]
    children?: React.ReactNode
  }) {
    return (
      <Badge
        variant="secondary"
        className={editableBadgeClasses}
        onClick={() => setFilterSheetOpen(true)}
      >
        {label}: {children}
        <span
          role="button"
          className={removeBtnClasses}
          onClick={(e) => {
            e.stopPropagation()
            const updated = { ...filters }
            for (const key of filterKeys) {
              delete updated[key]
            }
            setFilters(updated)
          }}
        >
          <X className="h-3 w-3 hover:text-destructive" />
        </span>
      </Badge>
    )
  }

  return (
    <>
      {/* 主内容区 - fixed 使其填充剩余高度 */}
      <Main fixed className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* 新建按钮 */}
          <div className="flex flex-shrink-0 justify-end">
            <Button onClick={handleCreate} size="sm" className="h-8">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              新建线索
            </Button>
          </div>

          {/* 工具栏 */}
          <div className="flex-shrink-0">
            <LeadsToolbar
              selectedCount={selectedRows.length}
              searchValue={searchValue}
              statusFilter={statusFilter}
              intentionFilter={intentionFilter}
              showCreateButton={false}
              onRefreshClick={handleRefresh}
              onFilterClick={handleFilter}
              onSearchChange={handleSearchChange}
              onStatusFilterChange={handleStatusFilterChange}
              onIntentionFilterChange={handleIntentionFilterChange}
              onBatchAssign={handleBatchAssign}
              onBatchRelease={handleBatchRelease}
              onBatchUpdateStatus={handleBatchUpdateStatus}
              onBatchDelete={handleBatchDelete}
            />
          </div>

          {/* 筛选条件标签栏 */}
          {activeFiltersCount > 0 && (
            <div className={cn('flex flex-shrink-0 items-center flex-wrap', s.gap.tight)}>
          <span className={cn(s.text.xs, 'text-muted-foreground')}>筛选条件:</span>

          {searchValue && (
            <Badge variant="secondary" className={badgeClasses}>
              搜索: {searchValue}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={handleRemoveSearch} />
            </Badge>
          )}

          {statusFilter.length > 0 && (
            <Badge variant="secondary" className={badgeClasses}>
              状态: {statusFilter.map(status => getLeadStatusStyle(status).label).join(', ')}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={handleRemoveStatus} />
            </Badge>
          )}

          {intentionFilter.length > 0 && (
            <Badge variant="secondary" className={badgeClasses}>
              意向: {intentionFilter.map(level => getIntentionLevelStyle(level).label).join(', ')}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={handleRemoveIntention} />
            </Badge>
          )}

          {filters.grade && filters.grade.length > 0 && (
            <FilterBadge label="年级" filterKeys={['grade']}>
              {filters.grade.map(g => gradeLabels[g]).join(', ')}
            </FilterBadge>
          )}

          {filters.followup_results && filters.followup_results.length > 0 && filters.followup_result_mode && (
            <FilterBadge label="回访" filterKeys={['followup_results', 'followup_result_mode']}>
              {followupModeLabels[filters.followup_result_mode] || filters.followup_result_mode}{' '}
              {getFollowupResultLabel(filters.followup_results)}
            </FilterBadge>
          )}

          {filters.status && filters.status.length > 0 && (
            <FilterBadge label="状态" filterKeys={['status']}>
              {filters.status.map(s => leadStatusLabels[s]).join(', ')}
            </FilterBadge>
          )}

          {filters.source_channel_id && filters.source_channel_id.length > 0 && (
            <FilterBadge label="渠道" filterKeys={['source_channel_id']}>
              {getFilterLabel(filters.source_channel_id, filterMaps?.channels, '来源渠道')}
            </FilterBadge>
          )}

          {filters.advisor_name && (
            <FilterBadge label="顾问" filterKeys={['advisor_name']}>
              {filters.advisor_name}
            </FilterBadge>
          )}

          {filters.created_by_name && (
            <FilterBadge label="创建人" filterKeys={['created_by_name']}>
              {filters.created_by_name}
            </FilterBadge>
          )}

          {filters.owner_campus_id && filters.owner_campus_id.length > 0 && (
            <FilterBadge label="校区" filterKeys={['owner_campus_id']}>
              {getFilterLabel(filters.owner_campus_id, filterMaps?.campuses, '归属校区')}
            </FilterBadge>
          )}

          {filters.intention_level && filters.intention_level.length > 0 && (
            <FilterBadge label="意向" filterKeys={['intention_level']}>
              {filters.intention_level.map(l => intentionLevelLabels[l]).join(', ')}
            </FilterBadge>
          )}

          {(filters.created_from || filters.created_to) && (
            <FilterBadge label="时间" filterKeys={['created_from', 'created_to']}>
              {filters.created_from || '...'} ~ {filters.created_to || '...'}
            </FilterBadge>
          )}

          {filters.tag && (
            <FilterBadge label="标签" filterKeys={['tag']}>
              {filters.tag}
            </FilterBadge>
          )}

          {filters.days_without_activity && (
            <FilterBadge label="无活动" filterKeys={['days_without_activity']}>
              {filters.days_without_activity}天
            </FilterBadge>
          )}

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
        onClearQuickFilters={handleClearQuickFilters}
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
