import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Radio, RadioGroup, Toast } from '@douyinfe/semi-ui-19'
import { IconSearch } from '@douyinfe/semi-icons'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { leadsApi } from './api'
import { LeadDetailSheet } from './components/lead-detail-sheet'
import { LeadFormDialog } from './components/lead-form-dialog'
import { LongTermFollowupTable } from './components/long-term-followup-table'
import {
  FollowupResult,
  IntentionLevel,
  LeadStatus,
  type Lead,
  type LeadListItem,
  type LeadListParams,
} from './types'

type FollowupView = 'today' | 'week' | 'nurture' | 'dormant' | 'high_intent'

const activeStatuses = [
  LeadStatus.PENDING_FOLLOWUP,
  LeadStatus.FOLLOWING_UP,
  LeadStatus.FOLLOWED_UP,
  LeadStatus.TRIAL_SCHEDULED,
  LeadStatus.INVITED_NO_SHOW,
  LeadStatus.VISITED_NOT_SIGNED,
]

const viewLabels: Record<FollowupView, string> = {
  today: '今日待跟',
  week: '本周跟进',
  nurture: '长期养单',
  dormant: '沉睡线索',
  high_intent: '高意向',
}

function toApiDateTime(date: Date) {
  return date.toISOString().replace('Z', '+00:00')
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfToday() {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

function endAfterDays(days: number) {
  const date = endOfToday()
  date.setDate(date.getDate() + days)
  return date
}

function buildViewParams(view: FollowupView): LeadListParams {
  if (view === 'today') {
    return {
      status: activeStatuses,
      next_followup_from: toApiDateTime(startOfToday()),
      next_followup_to: toApiDateTime(endOfToday()),
      sort_by: 'next_followup_at',
      sort_order: 'asc',
    }
  }

  if (view === 'week') {
    return {
      status: activeStatuses,
      next_followup_from: toApiDateTime(startOfToday()),
      next_followup_to: toApiDateTime(endAfterDays(6)),
      sort_by: 'next_followup_at',
      sort_order: 'asc',
    }
  }

  if (view === 'dormant') {
    return {
      status: activeStatuses,
      days_without_activity: 30,
      sort_by: 'created_at',
      sort_order: 'desc',
    }
  }

  if (view === 'high_intent') {
    return {
      status: activeStatuses,
      intention_level: [IntentionLevel.HIGH],
      sort_by: 'next_followup_at',
      sort_order: 'asc',
    }
  }

  return {
    status: activeStatuses,
    followup_result_mode: 'include',
    followup_results: [
      FollowupResult.CAN_CONTINUE,
      FollowupResult.WECHAT_ADDED,
      FollowupResult.APPOINTMENT_SCHEDULED,
    ],
    sort_by: 'next_followup_at',
    sort_order: 'asc',
  }
}

export function LongTermFollowupPage() {
  useDocumentTitle('长期跟进')
  const queryClient = useQueryClient()

  const [activeView, setActiveView] = useState<FollowupView>('today')
  const [pagination, setPagination] = useState({ page: 1, size: 20 })
  const [searchValue, setSearchValue] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  const viewParams = useMemo(() => buildViewParams(activeView), [activeView])

  const { data, isLoading } = useQuery({
    queryKey: ['long-term-followup-leads', activeView, pagination, committedSearch],
    queryFn: async () => {
      const response = await leadsApi.getLeads({
        ...viewParams,
        search: committedSearch || undefined,
        page: pagination.page,
        size: pagination.size,
        include_styles: true,
      })
      return response.data
    },
  })

  const leads = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0

  const resetToFirstPage = () => setPagination((prev) => ({ ...prev, page: 1 }))

  const handleViewChange = (view: FollowupView) => {
    setActiveView(view)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleSearch = () => {
    setCommittedSearch(searchValue.trim())
    resetToFirstPage()
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (!value) {
      setCommittedSearch('')
      resetToFirstPage()
    }
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['long-term-followup-leads'] })
    Toast.success({ content: '已刷新' })
  }

  const handleRowClick = (lead: LeadListItem) => {
    setCurrentLeadId(lead.id)
    setDetailSheetOpen(true)
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormDialogOpen(true)
    setDetailSheetOpen(false)
  }

  const handleClearAllFilters = () => {
    setSearchValue('')
    setCommittedSearch('')
    setActiveView('today')
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const filterTags: FilterTag[] = activeView === 'today' ? [] : [
    {
      key: 'view',
      label: '视图',
      value: viewLabels[activeView],
      onClose: () => handleViewChange('today'),
    },
  ]

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

  return (
    <>
      <DataTableLayout
        title="长期跟进"
        total={total}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <RadioGroup
              type="button"
              buttonSize="small"
              value={activeView}
              onChange={(event) => handleViewChange(event.target.value as FollowupView)}
            >
              {Object.entries(viewLabels).map(([value, label]) => (
                <Radio key={value} value={value}>
                  {label}
                </Radio>
              ))}
            </RadioGroup>

            <Input
              prefix={<IconSearch />}
              placeholder="姓名 / 手机号"
              value={searchValue}
              onChange={handleSearchChange}
              onEnterPress={handleSearch}
              style={{ width: 220 }}
              showClear
            />
            <Button theme="solid" onClick={handleSearch}>
              搜索
            </Button>
          </div>
        }
        filterTags={filterTags}
        onClearAllFilters={handleClearAllFilters}
      >
        <LongTermFollowupTable
          data={leads}
          total={total}
          page={pagination.page}
          pageSize={pagination.size}
          isLoading={isLoading}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(size) => setPagination({ page: 1, size })}
          onRowClick={handleRowClick}
        />
      </DataTableLayout>

      <LeadDetailSheet
        leadId={currentLeadId}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={handleEdit}
      />

      <LeadFormDialog
        lead={editingLead}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['long-term-followup-leads'] })
          queryClient.invalidateQueries({ queryKey: ['leads'] })
        }}
      />
    </>
  )
}
