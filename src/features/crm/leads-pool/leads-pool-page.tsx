/**
 * 公海线索页面 - 使用 DataTableLayout + SemiDataTable 通用组件
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Button,
  Input,
  Tag,
  Typography,
  Toast,
  Modal,
  Spin,
  Space,
} from '@douyinfe/semi-ui-19'
import { IconDownload, IconUserAdd, IconClose } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { formatTime } from '@/lib/utils/time'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { IntentionLevelBadge } from '../leads/components/status-badges'
import { LeadDetailSheet } from '../leads/components/lead-detail-sheet'
import { FilterSheet } from '../leads/components/filter-sheet'
import { LeadListToolbarControls } from '../leads/components/lead-list-toolbar-controls'
import { leadsPoolApi, type ExportStatusResult } from './api'
import type { LeadPoolItem, LeadPoolListParams } from './types'
import { leadStatusLabels, intentionLevelLabels, gradeLabels, followupResultLabels, type LeadListParams, type IntentionLevel } from '../leads/types'
import { useIsSuperUser } from '@/stores/auth-store'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { leadsApi } from '../leads/api'
import { apiClient } from '@/lib/api/client'

const { Text } = Typography

export function LeadsPoolPage() {
  useDocumentTitle('公海线索')
  const queryClient = useQueryClient()
  const isSuperUser = useIsSuperUser()

  // 分页状态
  const [pagination, setPagination] = useState({ page: 1, size: 20 })

  // 导出相关状态
  const [isExporting, setIsExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
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

  // 获取筛选选项
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    staleTime: 5 * 60 * 1000
  })

  // 获取来源渠道列表
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])
  const [selectedRows, setSelectedRows] = useState<LeadPoolItem[]>([])

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
    else if (filters.search) params.search = filters.search
    if (filters.intention_level && filters.intention_level.length > 0) {
      params.intention_level = filters.intention_level[0] as IntentionLevel
    }
    if (daysMin) params.days_in_pool_min = parseInt(daysMin)
    if (daysMax) params.days_in_pool_max = parseInt(daysMax)
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

  const tableData = useMemo(() => data?.items || [], [data?.items])
  const total = data?.total ?? 0

  // 批量领取 mutation
  const claimMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      return leadsPoolApi.batchClaimLeads({
        lead_ids: leadIds,
        claim_reason: '批量从公海领取线索'
      })
    },
    onSuccess: () => {
      Toast.success({ content: `成功领取 ${selectedRows.length} 条线索` })
      setSelectedRows([])
      setSelectedRowKeys([])
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
      const totalCount = data.total || 0
      if (items.length === 0 && totalCount > 0 && pagination.page > 1) {
        const lastPage = Math.max(1, Math.ceil(totalCount / pagination.size))
        if (lastPage !== pagination.page) {
          setPagination(prev => ({ ...prev, page: lastPage }))
        }
      }
    }
  }, [data, isLoading, pagination.page, pagination.size])

  // Semi Table 列定义
  const columns: ColumnProps<LeadPoolItem>[] = useMemo(() => [
    {
      title: '孩子姓名',
      dataIndex: 'child_name',
      width: 100,
      fixed: 'left' as const,
      render: (_text: string, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width="80%" />
        return <Text strong style={{ fontSize: 13 }}>{record.child_name || '-'}</Text>
      },
    },
    {
      title: '家长姓名',
      dataIndex: 'parent_name',
      width: 100,
      render: (_text: string, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <Text style={{ fontSize: 13 }}>{record.parent_name || '-'}</Text>
      },
    },
    {
      title: '年龄',
      dataIndex: 'age',
      width: 60,
      align: 'center' as const,
      render: (_text: number, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        return <Text style={{ fontSize: 13 }}>{record.age ? `${record.age}岁` : '-'}</Text>
      },
    },
    {
      title: '来源渠道',
      dataIndex: 'source_channel_name',
      width: 120,
      ellipsis: { showTitle: false },
      render: (_text: string, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return <Text style={{ fontSize: 13 }}>{record.source_channel_name || '-'}</Text>
      },
    },
    {
      title: '意向等级',
      dataIndex: 'intention_level',
      width: 100,
      render: (_text: string, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        const level = record.intention_level
        if (!level) return <Text type="quaternary" style={{ fontSize: 13 }}>-</Text>
        return <IntentionLevelBadge level={level} showDot={false} />
      },
    },
    {
      title: '原负责顾问',
      key: 'previous_advisor',
      dataIndex: 'pool_info',
      width: 120,
      render: (_text: unknown, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return <Text style={{ fontSize: 13 }}>{record.pool_info?.previous_advisor_name || '-'}</Text>
      },
    },
    {
      title: '公海天数',
      key: 'days_in_pool',
      dataIndex: 'pool_info',
      width: 80,
      render: (_text: unknown, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
        return (
          <Text style={{ fontSize: 13 }}>
            {record.pool_info?.days_in_pool != null ? `${record.pool_info.days_in_pool}天` : '-'}
          </Text>
        )
      },
    },
    {
      title: '进入公海时间',
      key: 'pooled_at',
      dataIndex: 'pool_info',
      width: 150,
      render: (_text: unknown, record: LeadPoolItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
        return <Text style={{ fontSize: 12 }}>{formatTime(record.pool_info?.pooled_at)}</Text>
      },
    },
  ], [])

  // 分页处理
  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const handlePageSizeChange = useCallback((size: number) => {
    setPagination({ page: 1, size })
  }, [])

  // 行点击处理
  const handleRowClick = (record: LeadPoolItem) => {
    setCurrentLeadId(record.id)
    setDetailSheetOpen(true)
  }

  // 刷新数据
  const handleRefresh = () => {
    refetch()
    Toast.success({ content: '已刷新' })
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
      Toast.warning({ content: '请先选择线索' })
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
      delete params.page
      delete params.size
      const response = await leadsPoolApi.exportPoolLeads(params)
      if (response instanceof Blob) {
        downloadBlob(response, `公海线索导出_${new Date().toISOString().slice(0, 10)}.xlsx`)
        Toast.success({ content: '导出成功' })
      } else if (response.success && response.data?.task_id) {
        setExportDialogOpen(true)
        Toast.info({ content: response.data.message || '正在后台导出...' })
        pollExportStatus(response.data.task_id)
      } else {
        Toast.error({ content: response.message || '导出失败' })
      }
    } catch (error) {
      showApiErrorToast(error, '导出失败')
    } finally {
      setIsExporting(false)
    }
  }

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

  const pollExportStatus = async (taskId: string) => {
    const maxAttempts = 120
    let attempts = 0
    const poll = async () => {
      if (attempts >= maxAttempts) {
        Toast.error({ content: '导出超时，请稍后重试' })
        setExportDialogOpen(false)
        return
      }
      try {
        const response = await leadsPoolApi.getExportStatus(taskId)
        if (response.success && response.data) {
          setExportStatus(response.data)
          if (response.data.status === 'SUCCESS' && response.data.success) {
            Toast.success({ content: response.data.message || '导出完成' })
            const blob = await leadsPoolApi.downloadExportFile(taskId)
            downloadBlob(blob, response.data.file_name || '公海线索导出.xlsx')
            setExportDialogOpen(false)
          } else if (response.data.status === 'FAILURE') {
            Toast.error({ content: response.data.message || '导出失败' })
            setExportDialogOpen(false)
          } else {
            attempts++
            setTimeout(poll, 5000)
          }
        }
      } catch {
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

  const hasFilters = searchValue || advancedFiltersCount > 0 || daysMin || daysMax

  /* -- 筛选标签数组 -- */
  const filterTags: FilterTag[] = []

  if (searchValue) {
    filterTags.push({
      key: 'search',
      label: '搜索',
      value: searchValue,
      onClose: () => { setSearchValue(''); setPagination(prev => ({ ...prev, page: 1 })) },
    })
  }

  if (daysMin || daysMax) {
    filterTags.push({
      key: 'days',
      label: '公海天数',
      value: `${daysMin || '0'} - ${daysMax || '∞'}天`,
      onClose: () => { setDaysMin(''); setDaysMax(''); setPagination(prev => ({ ...prev, page: 1 })) },
    })
  }

  if (filters.intention_level && filters.intention_level.length > 0) {
    filterTags.push({
      key: 'intention',
      label: '意向',
      value: filters.intention_level.map(l => intentionLevelLabels[l]).join(', '),
      onClose: () => { const { intention_level, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.status && filters.status.length > 0) {
    filterTags.push({
      key: 'status',
      label: '状态',
      value: filters.status.map(s => leadStatusLabels[s]).join(', '),
      onClose: () => { const { status, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.source_channel_id && filters.source_channel_id.length > 0) {
    filterTags.push({
      key: 'channel',
      label: '渠道',
      value: getFilterLabel(filters.source_channel_id, filterMaps?.channels, '来源渠道') || '',
      onClose: () => { const { source_channel_id, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.advisor_name) {
    filterTags.push({
      key: 'advisor',
      label: '顾问',
      value: filters.advisor_name,
      onClose: () => { const { advisor_name, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.created_by_name) {
    filterTags.push({
      key: 'created_by',
      label: '创建人',
      value: filters.created_by_name,
      onClose: () => { const { created_by_name, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.owner_campus_id && filters.owner_campus_id.length > 0) {
    filterTags.push({
      key: 'campus',
      label: '校区',
      value: getFilterLabel(filters.owner_campus_id, filterMaps?.campuses, '归属校区') || '',
      onClose: () => { const { owner_campus_id, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.grade && filters.grade.length > 0) {
    filterTags.push({
      key: 'grade',
      label: '年级',
      value: filters.grade.map(g => gradeLabels[g]).join(', '),
      onClose: () => { const { grade, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.followup_results && filters.followup_results.length > 0 && filters.followup_result_mode) {
    filterTags.push({
      key: 'followup',
      label: '回访',
      value: `${followupModeLabels[filters.followup_result_mode] || filters.followup_result_mode} ${getFollowupResultLabel(filters.followup_results)}`,
      onClose: () => { const { followup_results, followup_result_mode, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.created_from || filters.created_to) {
    filterTags.push({
      key: 'time',
      label: '时间',
      value: `${filters.created_from || '...'} ~ ${filters.created_to || '...'}`,
      onClose: () => { const { created_from, created_to, ...rest } = filters; setFilters(rest) },
    })
  }

  if (filters.tag) {
    filterTags.push({
      key: 'tag',
      label: '标签',
      value: filters.tag,
      onClose: () => { const { tag, ...rest } = filters; setFilters(rest) },
    })
  }

  // 标题右侧操作按钮
  const headerActions = (
    <Space spacing={8}>
      {selectedRows.length > 0 && (
        <>
          <Tag color="blue">已选择 {selectedRows.length} 条</Tag>
          <Button
            theme="solid"
            icon={<IconUserAdd />}
            onClick={handleBatchClaim}
          >
            批量领取
          </Button>
        </>
      )}
      {isSuperUser && (
        <Button
          icon={<IconDownload />}
          onClick={handleExport}
          disabled={isExporting}
          loading={isExporting}
        >
          导出
        </Button>
      )}
    </Space>
  )

  // 工具栏
  const toolbar = (
    <LeadListToolbarControls
      searchValue={searchValue}
      searchWidth={240}
      filterBadgeCount={advancedFiltersCount}
      onSearchChange={(value) => {
        setSearchValue(value)
        setPagination(prev => ({ ...prev, page: 1 }))
      }}
      onFilterClick={() => setFilterSheetOpen(true)}
      extraControls={
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Input
              type="number"
              placeholder="最少天数"
              value={daysMin}
              onChange={(value) => {
                setDaysMin(value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              style={{ width: 100 }}
            />
            <Text type="tertiary">-</Text>
            <Input
              type="number"
              placeholder="最多天数"
              value={daysMax}
              onChange={(value) => {
                setDaysMax(value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              style={{ width: 100 }}
            />
          </div>

          {hasFilters && (
            <Button
              type="tertiary"
              theme="borderless"
              icon={<IconClose />}
              onClick={handleClearFilters}
            >
              清除筛选
            </Button>
          )}
        </>
      }
    />
  )

  return (
    <>
      <DataTableLayout
        title="公海线索"
        total={total}
        headerActions={headerActions}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        toolbar={toolbar}
        filterTags={filterTags}
        onClearAllFilters={handleClearFilters}
      >
        <SemiDataTable<LeadPoolItem>
          columns={columns}
          data={tableData}
          total={total}
          page={pagination.page}
          pageSize={pagination.size}
          isLoading={isLoading}
          scrollX={830}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onRowClick={handleRowClick}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys)
              setSelectedRows(rows)
            },
            fixed: 'left',
            width: 48,
          }}
          emptyText="暂无公海线索"
        />
      </DataTableLayout>

      {/* 线索详情抽屉 */}
      <LeadDetailSheet
        leadId={currentLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />

      {/* 批量领取确认对话框 */}
      <Modal
        title="批量领取线索"
        visible={claimDialogOpen}
        onCancel={() => setClaimDialogOpen(false)}
        onOk={confirmClaim}
        okButtonProps={{ loading: claimMutation.isPending }}
        okText="确认领取"
        cancelText="取消"
      >
        <div style={{ padding: '8px 0' }}>
          确定要领取选中的 <Text strong>{selectedRows.length}</Text> 条线索吗？
          领取后这些线索将分配给您。
        </div>
      </Modal>

      {/* 高级筛选Sheet */}
      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />

      {/* 导出进度对话框 */}
      <Modal
        title="正在导出公海线索"
        visible={exportDialogOpen}
        onCancel={() => {
          setExportDialogOpen(false)
          setExportStatus(null)
        }}
        footer={
          <Button onClick={() => {
            setExportDialogOpen(false)
            setExportStatus(null)
          }}>
            取消
          </Button>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <Text type="tertiary">数据量较大，正在后台处理中，请稍候...</Text>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            <Spin />
            <Text type="tertiary">
              {exportStatus?.status === 'PENDING' && '等待处理...'}
              {exportStatus?.status === 'STARTED' && '正在导出...'}
              {!exportStatus && '正在准备...'}
            </Text>
          </div>
          {exportStatus?.total && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="tertiary">共 {exportStatus.total} 条数据</Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

export default LeadsPoolPage
