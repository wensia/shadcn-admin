import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import {
  Banner,
  Button,
  Card,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconAlertTriangle, IconRefresh } from '@douyinfe/semi-icons'
import type { CSSProperties } from 'react'

import { useDocumentTitle } from '@/hooks/use-document-title'
import { xiaoditangApi } from './api'
import { XiaodituiSalaryWorkspace } from './salary-tab'

const { Title, Text } = Typography

type SalaryPageSearch = {
  activity_id?: string | number
  start_date?: string
  end_date?: string
  market_id?: string | number
}

function parseSearchNumber(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function parseSearchDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

export function XiaodituiSalaryPage() {
  useDocumentTitle('兼职工资')
  const queryClient = useQueryClient()
  const search = useSearch({ strict: false }) as SalaryPageSearch
  const syncTriggeredRef = useRef(false)
  const wasSyncingRef = useRef(false)
  const statusQuery = useQuery({
    queryKey: ['xiaoditui', 'status'],
    queryFn: () => xiaoditangApi.checkMyStatus(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const status = statusQuery.data?.data
  const bound = !!status?.bound
  const valid = !!status?.bound && !!status?.valid
  const statusMessage = statusQuery.isError
    ? statusQuery.error instanceof Error
      ? statusQuery.error.message
      : '小地推状态校验失败'
    : status?.message || status?.last_error || '请重新登录'

  const initialActivityId = parseSearchNumber(search.activity_id)
  const initialMarketId = parseSearchNumber(search.market_id)
  const initialStartDate = parseSearchDate(search.start_date)
  const initialEndDate = parseSearchDate(search.end_date)

  const syncStatusQuery = useQuery({
    queryKey: ['xiaoditui', 'sync-status'],
    queryFn: () => xiaoditangApi.getSyncStatus(),
    enabled: bound,
    staleTime: 10_000,
    refetchInterval: (query) =>
      query.state.data?.data?.syncing ? 5000 : false,
    refetchOnWindowFocus: false,
  })
  const syncStatus = syncStatusQuery.data?.data
  const syncMutation = useMutation({
    mutationFn: () => xiaoditangApi.submitSync({ mode: 'incremental' }),
    onSuccess: () => {
      syncStatusQuery.refetch()
    },
  })

  useEffect(() => {
    if (!valid) {
      syncTriggeredRef.current = false
      return
    }
    if (syncTriggeredRef.current) return
    syncTriggeredRef.current = true
    syncMutation.mutate()
  }, [syncMutation, valid])

  useEffect(() => {
    const syncing = !!syncStatus?.syncing
    if (wasSyncingRef.current && !syncing) {
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'salary-report'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'markets'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'stats'] })
    }
    wasSyncingRef.current = syncing
  }, [queryClient, syncStatus?.syncing])

  const syncStatusContent =
    bound && syncStatus ? (
      <div style={salarySyncStatusInlineStyle}>
        <Text
          type={syncStatus.last_error ? 'warning' : 'tertiary'}
          size='small'
          ellipsis={{ showTooltip: true }}
          style={salarySyncStatusTextStyle}
        >
          名单数据：{formatSyncStatusText(syncStatus.syncing, syncStatus.last_synced_at)}
          {syncStatus.last_error ? ` · ${syncStatus.last_error}` : ''}
        </Text>
        <Button
          theme='borderless'
          type='tertiary'
          icon={<IconRefresh />}
          loading={syncMutation.isPending || syncStatusQuery.isFetching}
          disabled={syncMutation.isPending || syncStatusQuery.isFetching || syncStatus.syncing}
          onClick={() => syncMutation.mutate()}
        >
          {syncStatus.syncing ? '同步中' : '同步'}
        </Button>
      </div>
    ) : null

  return (
    <div className='xiaoditui-salary-page flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4'>
      <div style={salaryPageHeaderStyle}>
        <div style={salaryPageTitleStyle}>
          <Title heading={4} style={{ margin: 0 }}>
            兼职工资
          </Title>
          <Text type='tertiary'>
            按活动和日期处理兼职工资、工资标准与每日结算标记。
          </Text>
        </div>
        <div style={salaryPageActionsStyle}>
          {syncStatusContent}
          <Tag color={valid ? 'green' : 'red'} size='large'>
            {valid ? '小地推登录正常' : '小地推登录不可用'}
          </Tag>
          <Button
            theme='light'
            icon={<IconRefresh />}
            loading={statusQuery.isFetching}
            onClick={() => statusQuery.refetch()}
            title='刷新状态'
            aria-label='刷新状态'
          />
        </div>
      </div>

      {statusQuery.isPending ? (
        <Card bordered style={salaryPageLoadingCardStyle}>
          <Spin size='middle' />
          <Text type='tertiary'>正在校验小地推登录状态…</Text>
        </Card>
      ) : (
        <>
          {!valid && (
            <Banner
              fullMode={false}
              type='danger'
              icon={<IconAlertTriangle />}
            description={
              <span>
                小地推登录状态不可用：
                <Text type='danger' strong>
                  {statusMessage}
                </Text>
                  。已有数据库数据仍可查看，恢复登录态后才能同步最新名单。
              </span>
            }
          />
          )}

          <XiaodituiSalaryWorkspace
            enabled={bound}
            mode='full'
            initialActivityId={initialActivityId}
            initialStartDate={initialStartDate}
            initialEndDate={initialEndDate}
            initialMarketId={initialMarketId}
          />
        </>
      )}
    </div>
  )
}

function formatSyncDate(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return value
  }
}

function formatSyncStatusText(
  syncing?: boolean,
  lastSyncedAt?: string | null,
): string {
  const lastSyncedText = lastSyncedAt
    ? `上次同步 ${formatSyncDate(lastSyncedAt)}`
    : '尚未完成首次同步'
  if (syncing) return `后台同步中 · ${lastSyncedText}`
  return lastSyncedAt ? lastSyncedText : '等待首次同步'
}

const salaryPageHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  minWidth: 0,
  flexShrink: 0,
}

const salaryPageTitleStyle: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const salaryPageActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
  flexShrink: 0,
}

const salarySyncStatusInlineStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  minWidth: 0,
  maxWidth: 520,
  flexShrink: 0,
}

const salarySyncStatusTextStyle: CSSProperties = {
  maxWidth: 340,
}

const salaryPageLoadingCardStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
}
