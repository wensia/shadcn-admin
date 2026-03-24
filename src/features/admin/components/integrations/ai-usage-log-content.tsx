/**
 * AI 调用记录组件
 * 展示所有 AI 调用的日志记录，包含 token 消耗情况
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { Select, Tag, Typography, DatePicker } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { aiConfigApi } from '../../api'
import { AI_PROVIDER_OPTIONS, AI_SCENE_LABELS, type AIUsageLogItem } from '../../types'

const { Text } = Typography

function formatDuration(ms: number | null): string {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTokens(n: number | null): string {
  if (n == null) return '-'
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const SCENE_OPTIONS = Object.entries(AI_SCENE_LABELS).map(([value, label]) => ({ value, label }))

const STATUS_OPTIONS = [
  { value: 'success', label: '成功' },
  { value: 'error', label: '失败' },
]

export function AIUsageLogContent() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [provider, setProvider] = useState<string>('')
  const [sceneKey, setSceneKey] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-ai-usage-logs', page, pageSize, provider, sceneKey, status, dateRange],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      }
      if (provider) params.provider = provider
      if (sceneKey) params.scene_key = sceneKey
      if (status) params.log_status = status
      if (dateRange) {
        params.start_time = dateRange[0].toISOString()
        params.end_time = dateRange[1].toISOString()
      }
      return aiConfigApi.listUsageLogs(params as Parameters<typeof aiConfigApi.listUsageLogs>[0])
    },
  })

  const columns: ColumnProps<AIUsageLogItem>[] = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 140,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={110} />
        return <Text size="small" className="font-mono">{formatTime(record.created_at)}</Text>
      },
    },
    {
      title: '场景',
      dataIndex: 'scene_key',
      width: 100,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <Tag size="small">{AI_SCENE_LABELS[record.scene_key || ''] || record.scene_key || '-'}</Tag>
      },
    },
    {
      title: '模型',
      dataIndex: 'model',
      width: 200,
      ellipsis: true,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={140} />
        return <Text size="small" className="font-mono">{record.model}</Text>
      },
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 100,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        const label = AI_PROVIDER_OPTIONS.find(o => o.value === record.provider)?.label || record.provider
        return <Tag size="small" color={record.provider === 'doubao' ? 'blue' : undefined}>{label}</Tag>
      },
    },
    {
      title: 'Prompt',
      dataIndex: 'prompt_tokens',
      width: 80,
      align: 'right' as const,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
        return <Text size="small" className="font-mono">{formatTokens(record.prompt_tokens)}</Text>
      },
    },
    {
      title: 'Completion',
      dataIndex: 'completion_tokens',
      width: 90,
      align: 'right' as const,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
        return <Text size="small" className="font-mono">{formatTokens(record.completion_tokens)}</Text>
      },
    },
    {
      title: 'Total',
      dataIndex: 'total_tokens',
      width: 80,
      align: 'right' as const,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
        return <Text size="small" className="font-mono font-medium">{formatTokens(record.total_tokens)}</Text>
      },
    },
    {
      title: '耗时',
      dataIndex: 'duration_ms',
      width: 80,
      align: 'right' as const,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={48} />
        return <Text size="small" className="font-mono">{formatDuration(record.duration_ms)}</Text>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={40} />
        return record.status === 'success'
          ? <Tag size="small" color="green" prefixIcon={<CheckCircle2 className="h-3 w-3" />}>成功</Tag>
          : <Tag size="small" color="red" prefixIcon={<AlertCircle className="h-3 w-3" />}>失败</Tag>
      },
    },
    {
      title: '调用者',
      dataIndex: 'employee_name',
      width: 90,
      render: (_: unknown, record: AIUsageLogItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <Text size="small">{record.employee_name || '系统'}</Text>
      },
    },
  ]

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0

  const handleReset = () => {
    setProvider('')
    setSceneKey('')
    setStatus('')
    setDateRange(null)
    setPage(1)
  }

  return (
    <DataTableLayout
      title="调用记录"
      total={total}
      onRefresh={() => refetch()}
      isRefreshing={isLoading}
      toolbar={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <Select
            placeholder="Provider"
            style={{ width: 130 }}
            value={provider || undefined}
            onChange={(v) => { setProvider(v as string || ''); setPage(1) }}
            optionList={AI_PROVIDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            showClear
          />
          <Select
            placeholder="场景"
            style={{ width: 120 }}
            value={sceneKey || undefined}
            onChange={(v) => { setSceneKey(v as string || ''); setPage(1) }}
            optionList={SCENE_OPTIONS}
            showClear
          />
          <Select
            placeholder="状态"
            style={{ width: 100 }}
            value={status || undefined}
            onChange={(v) => { setStatus(v as string || ''); setPage(1) }}
            optionList={STATUS_OPTIONS}
            showClear
          />
          <DatePicker
            type="dateRange"
            placeholder={['开始日期', '结束日期']}
            style={{ width: 240 }}
            value={dateRange as [Date, Date] | undefined}
            onChange={(v) => { setDateRange(v as [Date, Date] | null); setPage(1) }}
          />
          {(provider || sceneKey || status || dateRange) && (
            <a onClick={handleReset} style={{ fontSize: 13, cursor: 'pointer', color: 'var(--semi-color-primary)' }}>
              重置
            </a>
          )}
        </div>
      }
    >
      <SemiDataTable
        columns={columns}
        data={items}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        scrollX={1100}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
      />
    </DataTableLayout>
  )
}
