/**
 * 业绩结果事实页面
 */

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconDelete, IconEdit, IconPlus, IconSearch } from '@douyinfe/semi-icons'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeDollarSign,
  RotateCcw,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { formatTime } from '@/lib/utils/time'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { apiClient } from '@/lib/api/client'
import { showApiErrorToast } from '@/lib/api/error-toast'
import type { ApiResponse } from '@/lib/api/types'
import { employeeApi } from '@/features/crm/lead-conversion/api'
import { performanceEventApi } from './api'
import { PerformanceEventDialog } from './components/performance-event-dialog'
import {
  performanceEventSourceLabels,
  performanceEventTypeColors,
  performanceEventTypeLabels,
  performanceEventTypeOptions,
  type PerformanceEvent,
  type PerformanceEventListParams,
} from './types'

const { Text } = Typography
const route = getRouteApi('/_authenticated/crm/performance-events')

interface CampusOption {
  id: string
  name: string
}

const currency = (value: number | string | null | undefined) =>
  `¥${Number(value ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export function PerformanceEventsPage() {
  useDocumentTitle('业绩结果')

  const search = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PerformanceEvent | null>(null)

  const pagination = useMemo(
    () => ({
      page: search.page ?? 1,
      size: search.size ?? 20,
    }),
    [search.page, search.size]
  )

  const filters = useMemo<PerformanceEventListParams>(
    () => ({
      event_type: search.event_type as PerformanceEventListParams['event_type'],
      campus_id: search.campus_id,
      advisor_id: search.advisor_id,
      date_from: search.date_from,
      date_to: search.date_to,
    }),
    [
      search.advisor_id,
      search.campus_id,
      search.date_from,
      search.date_to,
      search.event_type,
    ]
  )

  const keyword = search.keyword ?? search.highlight ?? ''
  const highlight = search.highlight

  const queryParams = useMemo<PerformanceEventListParams>(
    () => ({
      page: pagination.page,
      size: pagination.size,
      keyword: keyword || undefined,
      ...filters,
    }),
    [filters, keyword, pagination.page, pagination.size]
  )

  const { data: eventListData, isLoading, refetch } = useQuery({
    queryKey: ['performance-events', queryParams],
    queryFn: async () => {
      const response = await performanceEventApi.getPerformanceEvents(queryParams)
      return response.data
    },
  })

  const { data: statsData } = useQuery({
    queryKey: ['performance-event-stats', filters],
    queryFn: async () => {
      const response = await performanceEventApi.getPerformanceEventStats(filters)
      return response.data
    },
  })

  const { data: filterOptions } = useQuery({
    queryKey: ['performance-event-filter-options'],
    queryFn: async () => {
      const [campusesResponse, employeesResponse] = await Promise.all([
        apiClient.get<ApiResponse<CampusOption[]>>('/organization/campuses/simple'),
        employeeApi.getEmployees({ is_active: true, size: 200 }),
      ])

      return {
        campuses: campusesResponse.data || [],
        advisors: employeesResponse.data?.items || [],
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => performanceEventApi.deletePerformanceEvent(id),
    onSuccess: async (_result, deletedId) => {
      Toast.success({ content: '删除成功' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['performance-events'] }),
        queryClient.invalidateQueries({ queryKey: ['performance-event-stats'] }),
      ])
      if (highlight === deletedId) {
        navigate({
          search: (prev) => ({
            ...prev,
            highlight: undefined,
          }),
        })
      }
    },
    onError: (error: unknown) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  const items = useMemo(() => eventListData?.items ?? [], [eventListData?.items])
  const total = eventListData?.total ?? 0

  const matchesHighlight = (record: PerformanceEvent) =>
    Boolean(
      highlight &&
        (record.id === highlight || record.external_event_id === highlight)
    )

  const updateSearch = (patch: Record<string, unknown>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
    })
  }

  const handleDelete = (record: PerformanceEvent) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 ${record.child_name || '该条'} 业绩结果吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { type: 'danger' },
      onOk: async () => {
        await deleteMutation.mutateAsync(record.id)
      },
    })
  }

  const columns = useMemo<ColumnProps<PerformanceEvent>[]>(
    () => [
      {
        title: '事件类型',
        dataIndex: 'event_type',
        width: 100,
        render: (_text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Tag size="small" color={performanceEventTypeColors[record.event_type]}>
              {record.event_type_display || performanceEventTypeLabels[record.event_type]}
            </Tag>
          )
        },
      },
      {
        title: '学生姓名',
        dataIndex: 'child_name',
        width: 160,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{(text as string) || '-'}</span>
              {matchesHighlight(record) && (
                <span
                  style={{
                    borderRadius: 999,
                    background: 'var(--semi-color-warning-light-default)',
                    color: 'var(--semi-color-warning)',
                    fontSize: 12,
                    lineHeight: '18px',
                    padding: '0 8px',
                  }}
                >
                  定位
                </span>
              )}
            </div>
          )
        },
      },
      {
        title: '联系电话',
        dataIndex: 'parent_phone',
        width: 130,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return <span>{(text as string) || '-'}</span>
        },
      },
      {
        title: '金额',
        dataIndex: 'amount',
        width: 120,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          const signedAmount = Number(record.signed_amount ?? text ?? 0)
          const isNegative = signedAmount < 0
          return (
            <span
              style={{
                fontWeight: 600,
                color: isNegative
                  ? 'var(--semi-color-danger)'
                  : 'var(--semi-color-success)',
              }}
            >
              {isNegative ? '-' : '+'}
              {currency(Math.abs(signedAmount))}
            </span>
          )
        },
      },
      {
        title: '发生时间',
        dataIndex: 'event_at',
        width: 160,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return <span>{formatTime(text as string)}</span>
        },
      },
      {
        title: '校区',
        dataIndex: 'campus_name',
        width: 120,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={72} />
          return <span>{(text as string) || record.owner_campus_name || '-'}</span>
        },
      },
      {
        title: '顾问',
        dataIndex: 'advisor_name',
        width: 110,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return <span>{(text as string) || '-'}</span>
        },
      },
      {
        title: '合同编号',
        dataIndex: 'contract_no',
        width: 140,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return <span>{(text as string) || '-'}</span>
        },
      },
      {
        title: '录入方式',
        dataIndex: 'created_mode',
        width: 100,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
          return (
            <span>
              {record.created_mode_display ||
                performanceEventSourceLabels[
                  text as keyof typeof performanceEventSourceLabels
                ] ||
                '-'}
            </span>
          )
        },
      },
      {
        title: '备注',
        dataIndex: 'remark',
        width: 220,
        render: (text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width="80%" />
          return (
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--semi-color-text-1)',
              }}
            >
              {(text as string) || '-'}
            </span>
          )
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 140,
        fixed: 'right',
        render: (_text, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
              <span data-stop-row-click style={{ display: 'inline-flex' }}>
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<IconEdit />}
                  onClick={(event) => {
                    event.stopPropagation()
                    setEditingEvent(record)
                    setDialogOpen(true)
                  }}
                >
                  编辑
                </Button>
              </span>
              <span data-stop-row-click style={{ display: 'inline-flex' }}>
                <Button
                  theme="borderless"
                  type="danger"
                  icon={<IconDelete />}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDelete(record)
                  }}
                >
                  删除
                </Button>
              </span>
            </div>
          )
        },
      },
    ],
    [deleteMutation, highlight]
  )

  const filterToolbar = (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px,1.6fr) repeat(5, minmax(0,1fr))',
          gap: 12,
        }}
      >
        <Input
          prefix={<IconSearch />}
          placeholder="搜索学生姓名、手机号、合同号"
          value={keyword}
          onChange={(value) => {
            updateSearch({
              keyword: value || undefined,
              page: 1,
              highlight: undefined,
            })
          }}
        />
        <Select
          value={filters.event_type || 'all'}
          optionList={[
            { value: 'all', label: '全部类型' },
            ...performanceEventTypeOptions,
          ]}
          onChange={(value) => {
            updateSearch({
              event_type: value === 'all' ? undefined : value,
              page: 1,
              highlight: undefined,
            })
          }}
        />
        <Select
          value={filters.campus_id || 'all'}
          optionList={[
            { value: 'all', label: '全部校区' },
            ...(filterOptions?.campuses || []).map((campus) => ({
              value: campus.id,
              label: campus.name,
            })),
          ]}
          filter
          onChange={(value) => {
            updateSearch({
              campus_id: value === 'all' ? undefined : value,
              page: 1,
              highlight: undefined,
            })
          }}
        />
        <Select
          value={filters.advisor_id || 'all'}
          optionList={[
            { value: 'all', label: '全部顾问' },
            ...(filterOptions?.advisors || []).map((advisor) => ({
              value: advisor.id,
              label: advisor.name,
            })),
          ]}
          filter
          onChange={(value) => {
            updateSearch({
              advisor_id: value === 'all' ? undefined : value,
              page: 1,
              highlight: undefined,
            })
          }}
        />
        <Input
          type="date"
          value={filters.date_from || ''}
          onChange={(value) => {
            updateSearch({
              date_from: value || undefined,
              page: 1,
              highlight: undefined,
            })
          }}
        />
        <Input
          type="date"
          value={filters.date_to || ''}
          onChange={(value) => {
            updateSearch({
              date_to: value || undefined,
              page: 1,
              highlight: undefined,
            })
          }}
        />
      </div>

      {statsData && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 12,
            marginTop: 14,
          }}
        >
          <Card bodyStyle={{ padding: 0 }} style={{ padding: '14px 16px', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--semi-color-success-light-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--semi-color-success)',
                }}
              >
                <ArrowUpRight size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text type="tertiary" style={{ fontSize: 12 }}>
                  报名
                </Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Text strong style={{ fontSize: 18 }}>
                    {statsData.signup_count}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {currency(statsData.signup_amount)}
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          <Card bodyStyle={{ padding: 0 }} style={{ padding: '14px 16px', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--semi-color-primary-light-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--semi-color-primary)',
                }}
              >
                <BadgeDollarSign size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text type="tertiary" style={{ fontSize: 12 }}>
                  续费
                </Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Text strong style={{ fontSize: 18 }}>
                    {statsData.renewal_count}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {currency(statsData.renewal_amount)}
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          <Card bodyStyle={{ padding: 0 }} style={{ padding: '14px 16px', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'var(--semi-color-danger-light-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--semi-color-danger)',
                }}
              >
                <ArrowDownLeft size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Text type="tertiary" style={{ fontSize: 12 }}>
                  退费
                </Text>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <Text strong style={{ fontSize: 18 }}>
                    {statsData.refund_count}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {currency(statsData.refund_amount)}
                  </Text>
                </div>
              </div>
            </div>
          </Card>

          <Card
            bodyStyle={{ padding: 0 }}
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background:
                'linear-gradient(135deg, rgba(17,24,39,0.96), rgba(51,65,85,0.92))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <RotateCcw size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12 }}>
                  净业绩额
                </div>
                <div
                  style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: -0.3,
                  }}
                >
                  {currency(statsData.net_amount)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )

  return (
    <>
      <DataTableLayout
        title="业绩结果"
        total={total}
        headerActions={
          <Button
            theme="solid"
            icon={<IconPlus />}
            onClick={() => {
              setEditingEvent(null)
              setDialogOpen(true)
            }}
          >
            登记结果
          </Button>
        }
        toolbar={filterToolbar}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={total}
          page={pagination.page}
          pageSize={pagination.size}
          isLoading={isLoading}
          scrollX={1520}
          onPageChange={(page) => updateSearch({ page })}
          onPageSizeChange={(size) => updateSearch({ page: 1, size })}
          onRowClick={(record) => {
            setEditingEvent(record)
            setDialogOpen(true)
          }}
          emptyText={highlight ? '未找到匹配的业绩结果' : '暂无业绩结果'}
          rowClassName={() => ''}
        />
      </DataTableLayout>

      <PerformanceEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        performanceEvent={editingEvent}
      />
    </>
  )
}
