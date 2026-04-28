import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  Banner,
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Tag,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconRefresh, IconSearch } from '@douyinfe/semi-icons'
import { format } from 'date-fns'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import type { SemiTagColor } from '@/lib/semi-types'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  FollowupResultBadge,
  LeadStatusBadge,
} from '@/features/crm/leads/components/status-badges'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { leadsApi } from '@/features/crm/leads/api'
import {
  followupResultLabels,
  gradeLabels,
  leadStatusLabels,
  type FollowupResult,
  type LeadStatus,
  type SourceChannelExtraField,
} from '@/features/crm/leads/types'
import { channelLedgerApi } from './api'
import {
  channelLedgerValidityLabels,
  type ChannelLedgerFollowupSnapshot,
  type ChannelLedgerItem,
  type ChannelLedgerParams,
  type ChannelLedgerValidity,
  type PersistedLedgerFilters,
  yesNoFilterOptions,
} from './types'

const { Text, Title } = Typography

const STORAGE_KEY = 'crm-channel-ledger-filters:v1'

const validityTagColors: Record<ChannelLedgerValidity, SemiTagColor> = {
  valid: 'green',
  invalid: 'red',
  pending: 'grey',
}

const validityOptions = [
  { value: '', label: '全部有效性' },
  { value: 'valid', label: '有效' },
  { value: 'invalid', label: '无效' },
  { value: 'pending', label: '待处理' },
]

const summaryCards: Array<{
  key: keyof ReturnType<typeof createEmptySummary>
  label: string
  accent: string
}> = [
  { key: 'total', label: '总线索', accent: 'var(--semi-color-primary)' },
  { key: 'pending', label: '待跟进', accent: '#ff7d00' },
  { key: 'followed_up', label: '已跟进', accent: '#0064fa' },
  { key: 'promised', label: '诺到', accent: '#7a3cff' },
  { key: 'visited', label: '实到', accent: '#00b42a' },
  { key: 'paid', label: '成交', accent: '#0fc6c2' },
]

function createEmptySummary() {
  return {
    total: 0,
    pending: 0,
    followed_up: 0,
    promised: 0,
    visited: 0,
    paid: 0,
  }
}

function getDefaultFilters(): PersistedLedgerFilters {
  return {
    dateRange: null,
    campusId: '',
    advisorId: '',
    channelId: '',
    keyword: '',
    validity: '',
    status: '',
    hasFollowup: '',
    promised: '',
    visited: '',
    paid: '',
  }
}

function parsePersistedFilters(): PersistedLedgerFilters {
  if (typeof window === 'undefined') return getDefaultFilters()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultFilters()
    const parsed = JSON.parse(raw) as Partial<PersistedLedgerFilters>
    return {
      ...getDefaultFilters(),
      ...parsed,
    }
  } catch {
    return getDefaultFilters()
  }
}

function formatShortDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return format(date, 'MM-dd HH:mm')
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return format(date, 'yyyy-MM-dd')
}

function formatCurrency(value?: number | null) {
  if (value == null) return '-'
  return `¥${Number(value).toLocaleString('zh-CN')}`
}

function summarizeText(value?: string | null, fallback = '-') {
  if (!value) return fallback
  return value.length > 26 ? `${value.slice(0, 26)}…` : value
}

function asBooleanFilter(value: '' | 'yes' | 'no'): boolean | undefined {
  if (value === 'yes') return true
  if (value === 'no') return false
  return undefined
}

function normalizeFollowups(
  item: ChannelLedgerItem,
): ChannelLedgerFollowupSnapshot[] {
  const snapshots = item.recent_followups ?? item.followup_snapshots ?? []
  return snapshots.slice(0, 3)
}

function getDynamicFieldValue(
  item: ChannelLedgerItem,
  field: SourceChannelExtraField,
): string {
  const value =
    item.dynamic_values?.[field.field_name] ??
    item.source_extra_info?.[field.field_name]

  if (value == null || value === '') return '-'
  if (Array.isArray(value)) return value.join(' / ')
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (field.field_type === 'select' && field.options?.length) {
    const matched = field.options.find((option) => option.value === String(value))
    if (matched) return matched.label
  }
  return String(value)
}

function FollowupSnapshotCell({
  snapshot,
}: {
  snapshot?: ChannelLedgerFollowupSnapshot
}) {
  if (!snapshot) {
    return (
      <Text type="quaternary" size="small">
        -
      </Text>
    )
  }

  const resultLabel =
    snapshot.result_label ||
    (snapshot.result
      ? followupResultLabels[snapshot.result as FollowupResult] || snapshot.result
      : '')

  return (
    <div
      style={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
        }}
      >
        <Text
          size="small"
          strong
          style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
        >
          {formatShortDateTime(snapshot.followup_at)}
        </Text>
        {snapshot.result ? (
          <FollowupResultBadge result={snapshot.result as FollowupResult} />
        ) : resultLabel ? (
          <Tag size="small" color="grey" shape="circle">
            {resultLabel}
          </Tag>
        ) : null}
      </div>
      <Text
        type="secondary"
        size="small"
        style={{ lineHeight: 1.45 }}
      >
        {summarizeText(snapshot.content)}
      </Text>
      {snapshot.next_action ? (
        <Text
          type="tertiary"
          size="small"
          style={{ lineHeight: 1.4 }}
        >
          下步: {summarizeText(snapshot.next_action)}
        </Text>
      ) : null}
    </div>
  )
}

function SummaryStrip({
  summary,
}: {
  summary: ReturnType<typeof createEmptySummary>
}) {
  return (
    <div
      style={{
        padding: '16px 20px 0',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}
      >
        {summaryCards.map((card) => (
          <Card
            key={card.key}
            shadows="hover"
            bodyStyle={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 16,
              background:
                'linear-gradient(145deg, var(--semi-color-bg-0) 0%, rgba(255,255,255,0.82) 100%)',
            }}
            style={{
              borderRadius: 16,
              border: '1px solid color-mix(in srgb, var(--semi-color-border) 70%, white)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '0 auto auto 0',
                width: 60,
                height: 3,
                background: card.accent,
              }}
            />
            <Text type="secondary" size="small">
              {card.label}
            </Text>
            <Title
              heading={3}
              style={{
                margin: 0,
                color: card.accent,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {summary[card.key]}
            </Title>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ChannelLedgerPage() {
  useDocumentTitle('渠道台账')

  const persisted = useMemo(() => parsePersistedFilters(), [])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dateRange, setDateRange] = useState<[string, string] | null>(
    persisted.dateRange,
  )
  const [campusId, setCampusId] = useState(persisted.campusId)
  const [advisorId, setAdvisorId] = useState(persisted.advisorId)
  const [channelId, setChannelId] = useState(persisted.channelId)
  const [keyword, setKeyword] = useState(persisted.keyword)
  const [validity, setValidity] = useState<ChannelLedgerValidity | ''>(
    persisted.validity,
  )
  const [status, setStatus] = useState<LeadStatus | ''>(persisted.status)
  const [hasFollowup, setHasFollowup] = useState<'' | 'yes' | 'no'>(
    persisted.hasFollowup,
  )
  const [promised, setPromised] = useState<'' | 'yes' | 'no'>(
    persisted.promised,
  )
  const [visited, setVisited] = useState<'' | 'yes' | 'no'>(
    persisted.visited,
  )
  const [paid, setPaid] = useState<'' | 'yes' | 'no'>(persisted.paid)
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const deferredKeyword = useDeferredValue(keyword.trim())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload: PersistedLedgerFilters = {
      dateRange,
      campusId,
      advisorId,
      channelId,
      keyword,
      validity,
      status,
      hasFollowup,
      promised,
      visited,
      paid,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    advisorId,
    campusId,
    channelId,
    dateRange,
    hasFollowup,
    keyword,
    paid,
    promised,
    status,
    validity,
    visited,
  ])

  const params = useMemo<ChannelLedgerParams>(
    () => ({
      page,
      size: pageSize,
      date_from: dateRange?.[0] || undefined,
      date_to: dateRange?.[1] || undefined,
      owner_campus_id: campusId || undefined,
      advisor_id: advisorId || undefined,
      source_channel_id: channelId || undefined,
      keyword: deferredKeyword || undefined,
      validity: validity || undefined,
      status: status || undefined,
      has_followup: asBooleanFilter(hasFollowup),
      promised: asBooleanFilter(promised),
      visited: asBooleanFilter(visited),
      paid: asBooleanFilter(paid),
    }),
    [
      advisorId,
      campusId,
      channelId,
      dateRange,
      deferredKeyword,
      hasFollowup,
      page,
      pageSize,
      paid,
      promised,
      status,
      validity,
      visited,
    ],
  )

  const ledgerQuery = useQuery({
    queryKey: ['channel-ledger', params],
    queryFn: async () => {
      const response = await channelLedgerApi.getChannelLedger(params)
      return response.data
    },
  })

  const optionsQuery = useQuery({
    queryKey: ['lead-filter-options'],
    queryFn: async () => {
      const response = await leadsApi.getFilterOptions()
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: ledgerData,
    error: ledgerError,
    isLoading: ledgerLoading,
    isRefetching: ledgerRefreshing,
    refetch: refetchLedger,
  } = ledgerQuery

  const summary = useMemo(
    () => ledgerData?.summary ?? createEmptySummary(),
    [ledgerData?.summary],
  )
  const dynamicColumns = useMemo(
    () => ledgerData?.dynamic_columns ?? [],
    [ledgerData?.dynamic_columns],
  )
  const items = useMemo(() => ledgerData?.items ?? [], [ledgerData?.items])
  const total = ledgerData?.total ?? 0
  const campuses = useMemo(
    () => optionsQuery.data?.campuses ?? [],
    [optionsQuery.data?.campuses],
  )
  const advisors = useMemo(
    () => optionsQuery.data?.advisors ?? [],
    [optionsQuery.data?.advisors],
  )
  const channels = useMemo(
    () => optionsQuery.data?.source_channels ?? [],
    [optionsQuery.data?.source_channels],
  )

  const resetPage = useCallback(() => setPage(1), [])

  const statusOptions = useMemo(
    () => [
      { value: '', label: '全部状态' },
      ...Object.entries(leadStatusLabels).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  )

  const filterTags: FilterTag[] = useMemo(() => {
    const tags: FilterTag[] = []
    if (dateRange) {
      tags.push({
        key: 'date',
        label: '登记日期',
        value: `${dateRange[0]} ~ ${dateRange[1]}`,
        onClose: () => {
          setDateRange(null)
          resetPage()
        },
      })
    }
    if (campusId) {
      const campus = campuses.find((item) => item.id === campusId)
      tags.push({
        key: 'campus',
        label: '校区',
        value: campus?.name || campusId,
        onClose: () => {
          setCampusId('')
          resetPage()
        },
      })
    }
    if (advisorId) {
      const advisor = advisors.find((item) => item.id === advisorId)
      tags.push({
        key: 'advisor',
        label: '顾问',
        value: advisor?.name || advisorId,
        onClose: () => {
          setAdvisorId('')
          resetPage()
        },
      })
    }
    if (channelId) {
      const channel = channels.find((item) => item.id === channelId)
      tags.push({
        key: 'channel',
        label: '渠道',
        value: channel?.name || channelId,
        onClose: () => {
          setChannelId('')
          resetPage()
        },
      })
    }
    if (deferredKeyword) {
      tags.push({
        key: 'keyword',
        label: '搜索',
        value: deferredKeyword,
        onClose: () => {
          setKeyword('')
          resetPage()
        },
      })
    }
    if (validity) {
      tags.push({
        key: 'validity',
        label: '有效性',
        value: channelLedgerValidityLabels[validity],
        onClose: () => {
          setValidity('')
          resetPage()
        },
      })
    }
    if (status) {
      tags.push({
        key: 'status',
        label: '状态',
        value: leadStatusLabels[status as LeadStatus] || status,
        onClose: () => {
          setStatus('')
          resetPage()
        },
      })
    }
    ;[
      ['hasFollowup', '已跟进', hasFollowup, setHasFollowup],
      ['promised', '诺到', promised, setPromised],
      ['visited', '实到', visited, setVisited],
      ['paid', '成交', paid, setPaid],
    ].forEach(([key, label, value, setter]) => {
      if (!value) return
      tags.push({
        key: String(key),
        label: String(label),
        value: value === 'yes' ? '是' : '否',
        onClose: () => {
          ;(setter as (value: '' | 'yes' | 'no') => void)('')
          resetPage()
        },
      })
    })
    return tags
  }, [
    advisorId,
    advisors,
    campusId,
    campuses,
    channelId,
    channels,
    dateRange,
    deferredKeyword,
    hasFollowup,
    paid,
    promised,
    resetPage,
    status,
    validity,
    visited,
  ])

  const handleClearAllFilters = useCallback(() => {
    setDateRange(null)
    setCampusId('')
    setAdvisorId('')
    setChannelId('')
    setKeyword('')
    setValidity('')
    setStatus('')
    setHasFollowup('')
    setPromised('')
    setVisited('')
    setPaid('')
    setPage(1)
  }, [])

  const baseColumns = useMemo<ColumnProps<ChannelLedgerItem>[]>(
    () => [
      {
        title: '登记日期',
        dataIndex: 'registered_at',
        width: 120,
        fixed: 'left',
        render: (_, record) => (
          <Text style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatDateOnly(record.registered_at)}
          </Text>
        ),
      },
      {
        title: '校区',
        dataIndex: 'campus_name',
        width: 120,
        fixed: 'left',
        render: (value: string | null | undefined) => value || '-',
      },
      {
        title: '渠道',
        dataIndex: 'channel_name',
        width: 150,
        fixed: 'left',
        ellipsis: true,
        render: (value: string | null | undefined) => value || '-',
      },
      {
        title: '客户',
        dataIndex: 'customer_name',
        width: 140,
        fixed: 'left',
        render: (_, record) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Text strong>{record.customer_name || record.parent_name || '-'}</Text>
            {record.grade_label || record.grade ? (
              <Text type="tertiary" size="small">
                {record.grade_label ||
                  (record.grade ? gradeLabels[record.grade] : '-')}
              </Text>
            ) : null}
          </div>
        ),
      },
      {
        title: '手机号',
        dataIndex: 'parent_phone',
        width: 132,
        fixed: 'left',
        render: (value: string | null | undefined) => (
          <Text style={{ fontFamily: 'monospace' }}>{value || '-'}</Text>
        ),
      },
      {
        title: '顾问',
        dataIndex: 'advisor_name',
        width: 110,
        render: (value: string | null | undefined) => value || '-',
      },
      {
        title: '创建/激活人',
        dataIndex: 'owner_name',
        width: 110,
        render: (value: string | null | undefined) => value || '-',
      },
      {
        title: '有效性',
        dataIndex: 'validity',
        width: 92,
        render: (_, record) => {
          if (!record.validity) return <Text type="quaternary">-</Text>
          const label =
            record.validity_label ||
            channelLedgerValidityLabels[record.validity as ChannelLedgerValidity]
          return (
            <Tag
              color={
                validityTagColors[record.validity as ChannelLedgerValidity] ||
                'grey'
              }
              shape="circle"
            >
              {label}
            </Tag>
          )
        },
      },
      {
        title: '当前状态',
        dataIndex: 'status',
        width: 110,
        render: (_, record) =>
          record.status && leadStatusLabels[record.status as LeadStatus] ? (
            <LeadStatusBadge status={record.status as LeadStatus} />
          ) : (
            <Tag color="grey" shape="circle">
              {record.status_label || record.status || '-'}
            </Tag>
          ),
      },
      {
        title: '备注',
        dataIndex: 'notes',
        width: 180,
        ellipsis: true,
        render: (value: string | null | undefined) => (
          <Text type={value ? 'primary' : 'quaternary'}>
            {value || '-'}
          </Text>
        ),
      },
      {
        title: '回访①',
        dataIndex: 'followup_1',
        width: 220,
        render: (_, record) => (
          <FollowupSnapshotCell snapshot={normalizeFollowups(record)[0]} />
        ),
      },
      {
        title: '回访②',
        dataIndex: 'followup_2',
        width: 220,
        render: (_, record) => (
          <FollowupSnapshotCell snapshot={normalizeFollowups(record)[1]} />
        ),
      },
      {
        title: '回访③',
        dataIndex: 'followup_3',
        width: 220,
        render: (_, record) => (
          <FollowupSnapshotCell snapshot={normalizeFollowups(record)[2]} />
        ),
      },
      {
        title: '诺到',
        dataIndex: 'promised',
        width: 96,
        align: 'center' as const,
        render: (_, record) =>
          record.promised == null ? (
            <Text type="quaternary">-</Text>
          ) : (
            <Tag color={record.promised ? 'violet' : 'grey'} shape="circle">
              {record.promised ? '是' : '否'}
            </Tag>
          ),
      },
      {
        title: '诺到日期',
        dataIndex: 'promised_at',
        width: 124,
        render: (value: string | null | undefined) => formatDateOnly(value),
      },
      {
        title: '实到',
        dataIndex: 'visited',
        width: 96,
        align: 'center' as const,
        render: (_, record) =>
          record.visited == null ? (
            <Text type="quaternary">-</Text>
          ) : (
            <Tag color={record.visited ? 'green' : 'grey'} shape="circle">
              {record.visited ? '是' : '否'}
            </Tag>
          ),
      },
      {
        title: '试听形式',
        dataIndex: 'trial_mode',
        width: 120,
        render: (value: string | null | undefined) => value || '-',
      },
      {
        title: '成交科数',
        dataIndex: 'subject_count',
        width: 104,
        align: 'right' as const,
        render: (value: number | null | undefined) =>
          value == null ? <Text type="quaternary">-</Text> : value,
      },
      {
        title: '定金',
        dataIndex: 'deposit',
        width: 120,
        align: 'right' as const,
        render: (value: number | null | undefined) => (
          <Text strong={value != null}>{formatCurrency(value)}</Text>
        ),
      },
    ],
    [],
  )

  const columns = useMemo<ColumnProps<ChannelLedgerItem>[]>(() => {
    if (!dynamicColumns.length) return baseColumns
    const extraColumns: ColumnProps<ChannelLedgerItem>[] = dynamicColumns.map(
      (field) => ({
        title: field.field_label,
        dataIndex: `dynamic:${field.field_name}`,
        width: field.field_type === 'textarea' ? 220 : 150,
        ellipsis: true,
        render: (_, record) => getDynamicFieldValue(record, field),
      }),
    )
    return [...baseColumns, ...extraColumns]
  }, [baseColumns, dynamicColumns])

  const scrollX = useMemo(
    () => 2240 + dynamicColumns.length * 150,
    [dynamicColumns.length],
  )

  const handleDateChange = useCallback(
    (value: string | string[] | undefined) => {
      if (Array.isArray(value) && value.length === 2) {
        setDateRange([value[0], value[1]])
      } else {
        setDateRange(null)
      }
      resetPage()
    },
    [resetPage],
  )

  const handleRowClick = useCallback((record: ChannelLedgerItem) => {
    setDetailLeadId(record.id)
    setDetailOpen(true)
  }, [])

  const handleRefresh = useCallback(() => {
    void refetchLedger()
  }, [refetchLedger])

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--semi-color-primary-light-default) 24%, white) 0%, var(--semi-color-bg-1) 28%)',
      }}
    >
      <SummaryStrip summary={summary} />

      <div style={{ flex: 1, minHeight: 0 }}>
        <DataTableLayout
          title="渠道台账"
          total={total}
          onRefresh={handleRefresh}
          isRefreshing={ledgerRefreshing}
          toolbar={
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {ledgerError ? (
                <Banner
                  type="danger"
                  closeIcon={null}
                  description={
                    ledgerError instanceof Error
                      ? ledgerError.message
                      : '渠道台账加载失败'
                  }
                />
              ) : null}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <Input
                  prefix={<IconSearch />}
                  showClear
                  value={keyword}
                  onChange={(value) => {
                    setKeyword(value)
                    resetPage()
                  }}
                  placeholder="搜索姓名 / 手机号"
                  style={{ width: 220 }}
                />
                <DatePicker
                  type="dateRange"
                  value={dateRange ?? undefined}
                  placeholder={['开始日期', '结束日期']}
                  onChange={(_, value) => handleDateChange(value as string[])}
                  style={{ width: 260 }}
                />
                <Select
                  value={campusId}
                  onChange={(value) => {
                    setCampusId((value as string) || '')
                    resetPage()
                  }}
                  optionList={[
                    { value: '', label: '全部校区' },
                    ...campuses.map((campus) => ({
                      value: campus.id,
                      label: campus.name,
                    })),
                  ]}
                  filter
                  style={{ width: 150 }}
                />
                <Select
                  value={channelId}
                  onChange={(value) => {
                    setChannelId((value as string) || '')
                    resetPage()
                  }}
                  optionList={[
                    { value: '', label: '全部渠道' },
                    ...channels.map((channel) => ({
                      value: channel.id,
                      label: channel.name,
                    })),
                  ]}
                  filter
                  style={{ width: 180 }}
                />
                <Select
                  value={advisorId}
                  onChange={(value) => {
                    setAdvisorId((value as string) || '')
                    resetPage()
                  }}
                  optionList={[
                    { value: '', label: '全部顾问' },
                    ...advisors.map((advisor) => ({
                      value: advisor.id,
                      label: advisor.name,
                    })),
                  ]}
                  filter
                  style={{ width: 150 }}
                />
                <Select
                  value={validity}
                  onChange={(value) => {
                    setValidity(((value as ChannelLedgerValidity) || '') as ChannelLedgerValidity | '')
                    resetPage()
                  }}
                  optionList={validityOptions}
                  style={{ width: 124 }}
                />
                <Select
                  value={status as string}
                  onChange={(value) => {
                    setStatus(((value as LeadStatus) || '') as LeadStatus | '')
                    resetPage()
                  }}
                  optionList={statusOptions}
                  style={{ width: 140 }}
                />
                <Select
                  value={hasFollowup}
                  onChange={(value) => {
                    setHasFollowup(((value as 'yes' | 'no') || '') as '' | 'yes' | 'no')
                    resetPage()
                  }}
                  optionList={[
                    { value: '', label: '全部回访' },
                    ...yesNoFilterOptions.slice(1),
                  ]}
                  style={{ width: 112 }}
                />
                <Select
                  value={promised}
                  onChange={(value) => {
                    setPromised(((value as 'yes' | 'no') || '') as '' | 'yes' | 'no')
                    resetPage()
                  }}
                  optionList={[
                    { value: '', label: '全部诺到' },
                    ...yesNoFilterOptions.slice(1),
                  ]}
                  style={{ width: 112 }}
                />
                <Select
                  value={visited}
                  onChange={(value) => {
                    setVisited(((value as 'yes' | 'no') || '') as '' | 'yes' | 'no')
                    resetPage()
                  }}
                  optionList={[
                    { value: '', label: '全部实到' },
                    ...yesNoFilterOptions.slice(1),
                  ]}
                  style={{ width: 112 }}
                />
                <Select
                  value={paid}
                  onChange={(value) => {
                    setPaid(((value as 'yes' | 'no') || '') as '' | 'yes' | 'no')
                    resetPage()
                  }}
                  optionList={[
                    { value: '', label: '全部成交' },
                    ...yesNoFilterOptions.slice(1),
                  ]}
                  style={{ width: 112 }}
                />
                <Button
                  theme="light"
                  icon={<IconRefresh />}
                  onClick={handleClearAllFilters}
                >
                  重置筛选
                </Button>
              </div>
            </div>
          }
          filterTags={filterTags}
          onClearAllFilters={handleClearAllFilters}
        >
          <SemiDataTable<ChannelLedgerItem>
            columns={columns}
            data={items}
            total={total}
            page={page}
            pageSize={pageSize}
            isLoading={ledgerLoading}
            scrollX={scrollX}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            onRowClick={handleRowClick}
            emptyText="暂无渠道台账数据"
          />
        </DataTableLayout>
      </div>

      <LeadDetailSheet
        leadId={detailLeadId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
