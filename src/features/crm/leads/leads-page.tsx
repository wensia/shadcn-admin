/**
 * 线索管理主页面 - 使用 DataTableLayout 通用布局
 */
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { IconPlus } from '@douyinfe/semi-icons'
import { Button, Toast } from '@douyinfe/semi-ui-19'
import { apiClient } from '@/lib/api/client'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { CreateAssignmentTaskDialog } from '@/features/crm/lead-assignment-tasks'
import { leadsApi } from './api'
import {
  BatchAssignDialog,
  BatchReleaseDialog,
  BatchUpdateStatusDialog,
  BatchDeleteDialog,
} from './components/batch-dialogs'
import { FilterSheet } from './components/filter-sheet'
import { LeadDetailSheet } from './components/lead-detail-sheet'
import { LeadFormDialog } from './components/lead-form-dialog'
import { LeadsTable } from './components/leads-table'
import { LeadsToolbar } from './components/leads-toolbar'
import {
  leadStatusLabels,
  intentionLevelLabels,
  gradeLabels,
  followupResultLabels,
  type LeadListParams,
  type LeadListItem,
  type Lead,
  type LeadStatus,
  type IntentionLevel,
  type Grade,
} from './types'

export function LeadsPage() {
  useDocumentTitle('线索管理')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // URL 搜索参数
  const searchParams = useSearch({ from: '/_authenticated/crm/leads/' })

  // 分页
  const [pagination, setPagination] = useState({ page: 1, size: 20 })

  // 搜索和快捷筛选
  const [searchValue, setSearchValue] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([])
  const [intentionFilter, setIntentionFilter] = useState<IntentionLevel[]>([])

  // 筛选参数
  const [filters, setFilters] = useState<LeadListParams>({})

  // URL 参数同步
  useEffect(() => {
    const urlFilters: Partial<LeadListParams> = {}
    if (searchParams.grade) urlFilters.grade = [searchParams.grade as Grade]
    if (searchParams.status)
      setStatusFilter([searchParams.status as LeadStatus])
    if (searchParams.intention_level)
      setIntentionFilter([searchParams.intention_level as IntentionLevel])
    if (searchParams.source_channel_id)
      urlFilters.source_channel_id = [searchParams.source_channel_id]
    if (searchParams.campus_id)
      urlFilters.owner_campus_id = [searchParams.campus_id]
    if (searchParams.search) setSearchValue(searchParams.search)
    if (searchParams.detail) {
      setCurrentLeadId(searchParams.detail)
      setDetailSheetOpen(true)
    }
    if (Object.keys(urlFilters).length > 0) {
      setFilters((prev) => ({ ...prev, ...urlFilters }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 选中的行
  const [selectedRows, setSelectedRows] = useState<LeadListItem[]>([])

  // Dialog/Sheet 状态
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [batchAssignDialogOpen, setBatchAssignDialogOpen] = useState(false)
  const [createAssignmentTaskDialogOpen, setCreateAssignmentTaskDialogOpen] =
    useState(false)
  const [batchReleaseDialogOpen, setBatchReleaseDialogOpen] = useState(false)
  const [batchUpdateStatusDialogOpen, setBatchUpdateStatusDialogOpen] =
    useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)

  // 当前选中/编辑线索
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  // 获取筛选选项
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  // 获取来源渠道
  const { data: sourceChannels } = useQuery({
    queryKey: ['source-channels-active'],
    queryFn: async () => {
      const response = await apiClient.get<{
        code: number
        data: { items: Array<{ id: string; name: string; category: string }> }
      }>('/source-channels', {
        params: { page: 1, size: 100, is_active: true },
      })
      return response.data?.items || []
    },
    staleTime: 5 * 60 * 1000,
  })

  // ID -> 名称映射
  const filterMaps = useMemo(() => {
    return {
      channels: new Map(sourceChannels?.map((c) => [c.id, c.name]) || []),
      campuses: new Map(
        filterOptions?.campuses?.map((c) => [c.id, c.name]) || []
      ),
      followupResults: new Map(
        filterOptions?.followup_results?.map((r) => [r.value, r.label]) || []
      ),
    }
  }, [filterOptions, sourceChannels])

  const getFilterLabel = (
    ids: string[] | undefined,
    map: Map<string, string> | undefined,
    fieldName: string
  ) => {
    if (!ids || ids.length === 0) return null
    if (!map) return `${fieldName} (${ids.length})`
    const names = ids.map((id) => map.get(id) || id).filter(Boolean)
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} 等${names.length}项`
  }

  const followupModeLabels: Record<string, string> = {
    include: '包含',
    exclude: '不包含',
    all: '全部为',
  }

  const getFollowupResultLabel = (values: string[] | undefined) => {
    if (!values || values.length === 0) return null
    const names = values.map((value) => {
      return (
        filterMaps.followupResults.get(value) ||
        followupResultLabels[value as keyof typeof followupResultLabels] ||
        value
      )
    })
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} 等${names.length}项`
  }

  // 获取线索列表
  const { data, isLoading } = useQuery({
    queryKey: [
      'leads',
      pagination,
      filters,
      committedSearch,
      statusFilter,
      intentionFilter,
    ],
    queryFn: async () => {
      const response = await leadsApi.getLeads({
        ...filters,
        search: committedSearch || undefined,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        intention_level:
          intentionFilter.length > 0 ? intentionFilter : undefined,
        page: pagination.page,
        size: pagination.size,
        include_styles: true,
      })
      return response.data
    },
  })

  // 空页自动跳转
  useEffect(() => {
    if (data && !isLoading) {
      const items = data.items || []
      const total = data.total || 0
      if (items.length === 0 && total > 0 && pagination.page > 1) {
        const lastPage = Math.max(1, Math.ceil(total / pagination.size))
        if (lastPage !== pagination.page) {
          setPagination((prev) => ({ ...prev, page: lastPage }))
        }
      }
    }
  }, [data, isLoading, pagination.page, pagination.size])

  // ⚠️ 必须 useMemo：data?.items 在加载中为 undefined，`?? []` 每次渲染创建新数组引用
  // 新引用传入 SemiDataTable → useEffect(data) 触发 → 清空选中 → 父组件 setState → 重渲染 → 无限循环
  const leads = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0

  /* ── 操作处理 ── */
  const resetToFirstPage = () => setPagination((prev) => ({ ...prev, page: 1 }))

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (!value) {
      setCommittedSearch('')
      resetToFirstPage()
    }
  }

  const handleSearch = () => {
    setCommittedSearch(searchValue)
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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    Toast.success({ content: '已刷新' })
  }

  const handleCreate = () => {
    setEditingLead(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormDialogOpen(true)
    setDetailSheetOpen(false)
  }

  const handleFilter = () => setFilterSheetOpen(true)

  const handleApplyFilters = (newFilters: LeadListParams) => {
    // 从高级筛选结果中提取 status/intention，同步到快速筛选
    const { status, intention_level, ...rest } = newFilters
    setStatusFilter(status ?? [])
    setIntentionFilter(intention_level ?? [])
    setFilters(rest)
    resetToFirstPage()
  }

  const handleBatchSuccess = () => {
    setSelectedRows([])
    queryClient.invalidateQueries({ queryKey: ['leads'] })
  }

  const requireSelection = (action: () => void) => {
    if (selectedRows.length === 0) {
      Toast.warning({ content: '请先选择线索' })
      return
    }
    action()
  }

  const handleBatchAssign = () =>
    requireSelection(() => setBatchAssignDialogOpen(true))
  const handleCreateAssignmentTask = () =>
    requireSelection(() => setCreateAssignmentTaskDialogOpen(true))
  const handleBatchRelease = () =>
    requireSelection(() => setBatchReleaseDialogOpen(true))
  const handleBatchUpdateStatus = () =>
    requireSelection(() => setBatchUpdateStatusDialogOpen(true))
  const handleBatchDelete = () =>
    requireSelection(() => setBatchDeleteDialogOpen(true))

  const handleRowClick = (lead: LeadListItem) => {
    setCurrentLeadId(lead.id)
    setDetailSheetOpen(true)
  }

  const handleClearAllFilters = () => {
    setSearchValue('')
    setCommittedSearch('')
    setStatusFilter([])
    setIntentionFilter([])
    setFilters({})
    resetToFirstPage()
  }

  /* ── 筛选标签数组 ── */
  const filterTags: FilterTag[] = []

  if (committedSearch) {
    filterTags.push({
      key: 'search',
      label: '搜索',
      value: committedSearch,
      onClose: () => {
        setSearchValue('')
        setCommittedSearch('')
        resetToFirstPage()
      },
    })
  }

  if (statusFilter.length > 0) {
    filterTags.push({
      key: 'status',
      label: '状态',
      value: statusFilter.map((s) => leadStatusLabels[s]).join(', '),
      onClose: () => {
        setStatusFilter([])
        resetToFirstPage()
      },
    })
  }

  if (intentionFilter.length > 0) {
    filterTags.push({
      key: 'intention',
      label: '意向',
      value: intentionFilter.map((l) => intentionLevelLabels[l]).join(', '),
      onClose: () => {
        setIntentionFilter([])
        resetToFirstPage()
      },
    })
  }

  if (filters.grade && filters.grade.length > 0) {
    filterTags.push({
      key: 'grade',
      label: '年级',
      value: filters.grade.map((g) => gradeLabels[g]).join(', '),
      onClose: () =>
        setFilters((prev) => {
          const { grade, ...rest } = prev
          return rest
        }),
    })
  }

  if (
    filters.followup_results &&
    filters.followup_results.length > 0 &&
    filters.followup_result_mode
  ) {
    filterTags.push({
      key: 'followup',
      label: '回访',
      value: `${followupModeLabels[filters.followup_result_mode] || filters.followup_result_mode} ${getFollowupResultLabel(filters.followup_results)}`,
      onClose: () =>
        setFilters((prev) => {
          const { followup_results, followup_result_mode, ...rest } = prev
          return rest
        }),
    })
  }

  if (filters.source_channel_id && filters.source_channel_id.length > 0) {
    filterTags.push({
      key: 'channel',
      label: '渠道',
      value:
        getFilterLabel(
          filters.source_channel_id,
          filterMaps?.channels,
          '来源渠道'
        ) || '',
      onClose: () =>
        setFilters((prev) => {
          const { source_channel_id, ...rest } = prev
          return rest
        }),
    })
  }

  if (filters.advisor_name) {
    filterTags.push({
      key: 'advisor',
      label: '顾问',
      value: filters.advisor_name,
      onClose: () =>
        setFilters((prev) => {
          const { advisor_name, ...rest } = prev
          return rest
        }),
    })
  }

  if (filters.created_by_name) {
    filterTags.push({
      key: 'creator',
      label: '创建人',
      value: filters.created_by_name,
      onClose: () =>
        setFilters((prev) => {
          const { created_by_name, ...rest } = prev
          return rest
        }),
    })
  }

  if (filters.owner_campus_id && filters.owner_campus_id.length > 0) {
    filterTags.push({
      key: 'campus',
      label: '校区',
      value:
        getFilterLabel(
          filters.owner_campus_id,
          filterMaps?.campuses,
          '归属校区'
        ) || '',
      onClose: () =>
        setFilters((prev) => {
          const { owner_campus_id, ...rest } = prev
          return rest
        }),
    })
  }

  if (filters.created_from || filters.created_to) {
    filterTags.push({
      key: 'time',
      label: '时间',
      value: `${filters.created_from || '...'} ~ ${filters.created_to || '...'}`,
      onClose: () =>
        setFilters((prev) => {
          const { created_from, created_to, ...rest } = prev
          return rest
        }),
    })
  }

  if (filters.tag) {
    filterTags.push({
      key: 'tag',
      label: '标签',
      value: filters.tag,
      onClose: () =>
        setFilters((prev) => {
          const { tag, ...rest } = prev
          return rest
        }),
    })
  }

  if (filters.days_without_activity) {
    filterTags.push({
      key: 'inactive',
      label: '无活动',
      value: `${filters.days_without_activity}天`,
      onClose: () =>
        setFilters((prev) => {
          const { days_without_activity, ...rest } = prev
          return rest
        }),
    })
  }

  return (
    <>
      <DataTableLayout
        title='线索管理'
        total={total}
        headerActions={
          <Button icon={<IconPlus />} theme='solid' onClick={handleCreate}>
            新建线索
          </Button>
        }
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        toolbar={
          <LeadsToolbar
            selectedCount={selectedRows.length}
            searchValue={searchValue}
            statusFilter={statusFilter}
            intentionFilter={intentionFilter}
            onSearchChange={handleSearchChange}
            onSearch={handleSearch}
            onStatusFilterChange={handleStatusFilterChange}
            onIntentionFilterChange={handleIntentionFilterChange}
            onFilterClick={handleFilter}
            onCreateAssignmentTask={handleCreateAssignmentTask}
            onBatchAssign={handleBatchAssign}
            onBatchRelease={handleBatchRelease}
            onBatchUpdateStatus={handleBatchUpdateStatus}
            onBatchDelete={handleBatchDelete}
          />
        }
        filterTags={filterTags}
        onClearAllFilters={handleClearAllFilters}
      >
        <LeadsTable
          data={leads}
          total={total}
          page={pagination.page}
          pageSize={pagination.size}
          isLoading={isLoading}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          onPageSizeChange={(size) => setPagination({ page: 1, size })}
          onRowClick={handleRowClick}
          onSelectionChange={setSelectedRows}
        />
      </DataTableLayout>

      {/* 线索详情 SideSheet */}
      <LeadDetailSheet
        leadId={currentLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={handleEdit}
      />

      {/* 创建/编辑线索 */}
      <LeadFormDialog
        lead={editingLead}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['leads'] })
        }}
      />

      {/* 高级筛选 */}
      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={{
          ...filters,
          ...(statusFilter.length > 0 ? { status: statusFilter } : {}),
          ...(intentionFilter.length > 0
            ? { intention_level: intentionFilter }
            : {}),
        }}
        onApplyFilters={handleApplyFilters}
      />

      {/* 批量操作弹窗 */}
      <BatchAssignDialog
        open={batchAssignDialogOpen}
        onOpenChange={setBatchAssignDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />
      <CreateAssignmentTaskDialog
        open={createAssignmentTaskDialogOpen}
        onOpenChange={setCreateAssignmentTaskDialogOpen}
        selectedLeads={selectedRows}
        onSuccess={(taskId) => {
          handleBatchSuccess()
          queryClient.invalidateQueries({ queryKey: ['lead-assignment-tasks'] })
          Toast.success({ content: '分配任务创建成功' })
          navigate({
            to: '/crm/leads/assignment-tasks/$taskId',
            params: { taskId },
          })
        }}
      />
      <BatchReleaseDialog
        open={batchReleaseDialogOpen}
        onOpenChange={setBatchReleaseDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />
      <BatchUpdateStatusDialog
        open={batchUpdateStatusDialogOpen}
        onOpenChange={setBatchUpdateStatusDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />
      <BatchDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        selectedLeadIds={selectedRows.map((row) => row.id)}
        onSuccess={handleBatchSuccess}
      />
    </>
  )
}
