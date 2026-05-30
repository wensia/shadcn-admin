import { useMemo, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Input,
  Select,
  SideSheet,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconEyeOpened, IconSearch, IconClose } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import type { FilterTag } from '@/components/semi/filter-tags-bar'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { xiaoditangApi, type XiaodituiLeadDetail } from './api'

const { Text } = Typography

function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatText(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function compactJson(value: Record<string, unknown>): string {
  return JSON.stringify(value || {}, null, 2)
}

function makeSkeletonLead(): Omit<XiaodituiLeadDetail, 'id'> {
  return {
    activity_id: 0,
    external_lead_id: '',
    raw_data: {},
  }
}

interface XiaodituiLeadDetailsContentProps {
  enabled?: boolean
  embedded?: boolean
}

export function XiaodituiLeadDetailsPage() {
  useDocumentTitle('小地推名单明细')

  return <XiaodituiLeadDetailsContent />
}

export function XiaodituiLeadDetailsContent({
  enabled = true,
  embedded = false,
}: XiaodituiLeadDetailsContentProps) {

  const [activityId, setActivityId] = useState<number | undefined>()
  const [marketId, setMarketId] = useState<number | undefined>()
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(() => {
    const current = today()
    return [current, current]
  })
  const [keyword, setKeyword] = useState('')
  const [submittedKeyword, setSubmittedKeyword] = useState('')
  const [pagination, setPagination] = useState({ page: 1, size: 20 })
  const [selectedLead, setSelectedLead] = useState<XiaodituiLeadDetail | null>(null)

  const startDate = dateRange?.[0] ? toYMD(dateRange[0]) : undefined
  const endDate = dateRange?.[1] ? toYMD(dateRange[1]) : startDate

  const activitiesQuery = useQuery({
    queryKey: ['xiaoditui', 'activities'],
    queryFn: () => xiaoditangApi.listActivities(),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const marketsQuery = useQuery({
    queryKey: ['xiaoditui', 'markets'],
    queryFn: () => xiaoditangApi.listMarkets(),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })

  const leadsQuery = useQuery({
    queryKey: [
      'xiaoditui',
      'lead-details',
      activityId,
      marketId,
      startDate,
      endDate,
      submittedKeyword,
      pagination.page,
      pagination.size,
    ],
    queryFn: () =>
      xiaoditangApi.listLeadDetails({
        activityId,
        marketId,
        startDate,
        endDate,
        keyword: submittedKeyword || undefined,
        page: pagination.page,
        size: pagination.size,
      }),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const activities = activitiesQuery.data?.data || []
  const markets = marketsQuery.data?.data?.items || []
  const pageData = leadsQuery.data?.data
  const rows = useMemo(() => pageData?.items || [], [pageData?.items])
  const total = pageData?.total || 0
  const isLoading = leadsQuery.isPending || leadsQuery.isFetching

  const selectedActivity = activities.find((item) => item.activity_id === activityId)
  const selectedMarket = markets.find((item) => item.market_id === marketId)
  const filterTags = useMemo<FilterTag[]>(() => {
    const tags: FilterTag[] = []
    if (selectedActivity) {
      tags.push({
        key: 'activity',
        label: '活动',
        value: selectedActivity.name,
        onClose: () => {
          setActivityId(undefined)
          setPagination((prev) => ({ ...prev, page: 1 }))
        },
      })
    }
    if (dateRange) {
      tags.push({
        key: 'date',
        label: '日期',
        value: startDate === endDate ? startDate || '' : `${startDate} ~ ${endDate}`,
        onClose: () => {
          setDateRange(null)
          setPagination((prev) => ({ ...prev, page: 1 }))
        },
      })
    }
    if (selectedMarket) {
      tags.push({
        key: 'market',
        label: '推广员',
        value: selectedMarket.name || String(selectedMarket.market_id),
        onClose: () => {
          setMarketId(undefined)
          setPagination((prev) => ({ ...prev, page: 1 }))
        },
      })
    }
    if (submittedKeyword) {
      tags.push({
        key: 'keyword',
        label: '关键词',
        value: submittedKeyword,
        onClose: () => {
          setKeyword('')
          setSubmittedKeyword('')
          setPagination((prev) => ({ ...prev, page: 1 }))
        },
      })
    }
    return tags
  }, [dateRange, endDate, selectedActivity, selectedMarket, startDate, submittedKeyword])

  const columns = useMemo<ColumnProps<XiaodituiLeadDetail>[]>(
    () => [
      {
        title: '提交时间',
        dataIndex: 'lead_created_at',
        width: 170,
        fixed: 'left',
        render: (value, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell width={120} /> : formatText(value),
      },
      {
        title: '名单信息',
        dataIndex: 'nickname',
        width: 220,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={150} />
          return (
            <div style={stackStyle}>
              <Text strong ellipsis={{ showTooltip: true }} style={oneLineTextStyle}>
                {formatText(record.nickname || record.mobile)}
              </Text>
              <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
                {formatText(record.mobile)}
              </Text>
            </div>
          )
        },
      },
      {
        title: '推广员',
        dataIndex: 'market_name',
        width: 180,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return (
            <div style={stackStyle}>
              <Text ellipsis={{ showTooltip: true }}>{formatText(record.market_name)}</Text>
              <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
                {formatText(record.market_mobile || record.market_id)}
              </Text>
            </div>
          )
        },
      },
      {
        title: '活动',
        dataIndex: 'activity_name',
        width: 220,
        render: (_, record) =>
          isSkeletonRow(record.id) ? (
            <SemiSkeletonCell width={140} />
          ) : (
            <Text ellipsis={{ showTooltip: true }}>{formatText(record.activity_name)}</Text>
          ),
      },
      {
        title: '地址',
        dataIndex: 'address',
        width: 260,
        render: (value, record) =>
          isSkeletonRow(record.id) ? (
            <SemiSkeletonCell width={180} />
          ) : (
            <Text ellipsis={{ showTooltip: true }}>{formatText(value)}</Text>
          ),
      },
      {
        title: '渠道',
        dataIndex: 'channel',
        width: 120,
        render: (value, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell width={80} /> : formatText(value),
      },
      {
        title: '重复',
        dataIndex: 'is_repeat',
        width: 110,
        render: (value, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={70} />
          return value ? <Tag size='small'>{String(value)}</Tag> : '-'
        },
      },
      {
        title: '小地推 ID',
        dataIndex: 'external_lead_id',
        width: 140,
        render: (value, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell width={90} /> : formatText(value),
      },
      {
        title: '操作',
        width: 80,
        fixed: 'right',
        render: (_, record) =>
          isSkeletonRow(record.id) ? null : (
            <Tooltip content='查看原始数据'>
              <Button
                theme='borderless'
                type='tertiary'
                icon={<IconEyeOpened />}
                aria-label='查看原始数据'
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedLead(record)
                }}
              />
            </Tooltip>
          ),
      },
    ],
    [],
  )

  const toolbar = (
    <div style={toolbarStyle}>
      <Select
        placeholder='全部活动'
        loading={activitiesQuery.isFetching}
        value={activityId}
        onChange={(value) => {
          setActivityId(value as number | undefined)
          setPagination((prev) => ({ ...prev, page: 1 }))
        }}
        optionList={activities.map((item) => ({
          label: item.name,
          value: item.activity_id,
        }))}
        style={{ width: 260 }}
        filter
        showClear
      />
      <DatePicker
        type='dateRange'
        value={dateRange || undefined}
        onChange={(value) => {
          if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
            setDateRange(value as [Date, Date])
          } else {
            setDateRange(null)
          }
          setPagination((prev) => ({ ...prev, page: 1 }))
        }}
        density='compact'
        format='yyyy-MM-dd'
        placeholder={['开始日期', '结束日期']}
        syncSwitchMonth
        weekStartsOn={1}
        style={{ width: 260 }}
      />
      <Select
        placeholder='全部推广员'
        loading={marketsQuery.isFetching}
        value={marketId}
        onChange={(value) => {
          setMarketId(value as number | undefined)
          setPagination((prev) => ({ ...prev, page: 1 }))
        }}
        optionList={markets.map((item) => ({
          label: `${item.name || item.nickname || item.market_id}${item.mobile ? ` · ${item.mobile}` : ''}`,
          value: item.market_id,
        }))}
        style={{ width: 240 }}
        filter
        showClear
      />
      <Input
        prefix={<IconSearch />}
        placeholder='微信昵称 / 手机号 / 地址 / 名单 ID'
        value={keyword}
        onChange={setKeyword}
        onEnterPress={() => {
          setSubmittedKeyword(keyword.trim())
          setPagination((prev) => ({ ...prev, page: 1 }))
        }}
        suffix={
          keyword ? (
            <Button
              theme='borderless'
              type='tertiary'
              icon={<IconClose />}
              aria-label='清空关键词'
              onClick={() => {
                setKeyword('')
                setSubmittedKeyword('')
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            />
          ) : null
        }
        style={{ width: 280 }}
      />
      <Button
        theme='solid'
        type='primary'
        icon={<IconSearch />}
        onClick={() => {
          setSubmittedKeyword(keyword.trim())
          setPagination((prev) => ({ ...prev, page: 1 }))
        }}
      >
        查询
      </Button>
    </div>
  )

  return (
    <>
      <DataTableLayout
        title={embedded ? '名单明细' : '小地推名单明细'}
        total={total}
        toolbar={toolbar}
        onRefresh={() => leadsQuery.refetch()}
        isRefreshing={leadsQuery.isFetching}
        filterTags={filterTags}
        onClearAllFilters={() => {
          setActivityId(undefined)
          setMarketId(undefined)
          setDateRange(null)
          setKeyword('')
          setSubmittedKeyword('')
          setPagination({ page: 1, size: pagination.size })
        }}
      >
        <SemiDataTable<XiaodituiLeadDetail>
          columns={columns}
          data={rows}
          total={total}
          page={pagination.page}
          pageSize={pagination.size}
          isLoading={isLoading}
          scrollX={1570}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(size) => setPagination({ page: 1, size })}
          onRowClick={setSelectedLead}
          emptyText={leadsQuery.data?.success === false ? leadsQuery.data.message : '暂无名单数据'}
          skeletonFactory={makeSkeletonLead}
        />
      </DataTableLayout>

      <SideSheet
        title='名单原始数据'
        visible={!!selectedLead}
        onCancel={() => setSelectedLead(null)}
        width={720}
        bodyStyle={detailBodyStyle}
      >
        {selectedLead && (
          <div style={detailStackStyle}>
            <div style={detailMetaGridStyle}>
              <DetailItem label='提交时间' value={selectedLead.lead_created_at} />
              <DetailItem label='活动' value={selectedLead.activity_name} />
              <DetailItem label='推广员' value={selectedLead.market_name} />
              <DetailItem label='手机号' value={selectedLead.mobile} />
            </div>
            <pre style={jsonPreStyle}>{compactJson(selectedLead.raw_data)}</pre>
          </div>
        )}
      </SideSheet>
    </>
  )
}

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={detailItemStyle}>
      <Text type='tertiary' size='small'>
        {label}
      </Text>
      <Text ellipsis={{ showTooltip: true }}>{formatText(value)}</Text>
    </div>
  )
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
}

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
}

const oneLineTextStyle: CSSProperties = {
  maxWidth: 180,
}

const detailBodyStyle: CSSProperties = {
  padding: 20,
}

const detailStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const detailMetaGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
}

const detailItemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
}

const jsonPreStyle: CSSProperties = {
  margin: 0,
  padding: 14,
  minHeight: 360,
  overflow: 'auto',
  border: '1px solid var(--semi-color-border)',
  borderRadius: 8,
  background: 'var(--semi-color-fill-0)',
  color: 'var(--semi-color-text-0)',
  fontSize: 12,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}
