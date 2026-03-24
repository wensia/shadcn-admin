/**
 * 来源渠道 Tab
 * 按来源渠道聚合展示诺到/到访/缴费统计
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Skeleton, Tag } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { getVisitSchedules, getPayments, dailyControlQueryKeys } from '../api'
import { brandColors } from '../theme'

interface SourceChannelTabProps {
  dateFrom?: string
  dateTo?: string
  creatorCampusId?: string
}

interface ChannelStats {
  channel: string
  promisedCount: number
  visitedCount: number
  paymentCount: number
  paymentAmount: number
  visitRate: string
}

export function SourceChannelTab({ dateFrom, dateTo, creatorCampusId }: SourceChannelTabProps) {
  // 拉取诺到数据（全量，用于前端聚合）
  const promisedQuery = useQuery({
    queryKey: [...dailyControlQueryKeys.all, 'source-channel', 'promised', dateFrom, dateTo, creatorCampusId],
    queryFn: () => getVisitSchedules({
      page: 1, size: 500, status: 'scheduled',
      visit_date_from: dateFrom, visit_date_to: dateTo,
      creator_campus_id: creatorCampusId,
    }),
  })

  // 拉取到访数据
  const visitedQuery = useQuery({
    queryKey: [...dailyControlQueryKeys.all, 'source-channel', 'visited', dateFrom, dateTo, creatorCampusId],
    queryFn: () => getVisitSchedules({
      page: 1, size: 500, status: 'visited',
      visit_date_from: dateFrom, visit_date_to: dateTo,
      creator_campus_id: creatorCampusId,
    }),
  })

  // 拉取缴费数据
  const paymentQuery = useQuery({
    queryKey: [...dailyControlQueryKeys.all, 'source-channel', 'payment', dateFrom, dateTo, creatorCampusId],
    queryFn: () => getPayments({
      page: 1, size: 500,
      date_from: dateFrom, date_to: dateTo,
      creator_campus_id: creatorCampusId,
    }),
  })

  const isLoading = promisedQuery.isLoading || visitedQuery.isLoading || paymentQuery.isLoading

  // 按来源渠道聚合
  const channelData = useMemo<ChannelStats[]>(() => {
    const map = new Map<string, { promised: number; visited: number; paymentCount: number; paymentAmount: number }>()

    const getOrCreate = (channel: string) => {
      const key = channel || '未知渠道'
      if (!map.has(key)) {
        map.set(key, { promised: 0, visited: 0, paymentCount: 0, paymentAmount: 0 })
      }
      return map.get(key)!
    }

    // 聚合诺到
    for (const item of promisedQuery.data?.items ?? []) {
      getOrCreate(item.source_channel_name ?? '').promised += 1
    }

    // 聚合到访
    for (const item of visitedQuery.data?.items ?? []) {
      getOrCreate(item.source_channel_name ?? '').visited += 1
    }

    // 聚合缴费
    for (const item of paymentQuery.data?.items ?? []) {
      const stats = getOrCreate(item.source_channel_name ?? '')
      stats.paymentCount += 1
      stats.paymentAmount += item.amount ?? 0
    }

    // 转为数组并排序（按总量降序）
    return Array.from(map.entries())
      .map(([channel, stats]) => {
        const total = stats.promised + stats.visited
        return {
          channel,
          promisedCount: stats.promised,
          visitedCount: stats.visited,
          paymentCount: stats.paymentCount,
          paymentAmount: stats.paymentAmount,
          visitRate: total === 0 ? '-' : `${Math.round((stats.visited / total) * 100)}%`,
        }
      })
      .sort((a, b) => (b.promisedCount + b.visitedCount + b.paymentCount) - (a.promisedCount + a.visitedCount + a.paymentCount))
  }, [promisedQuery.data, visitedQuery.data, paymentQuery.data])

  // 汇总行
  const totals = useMemo(() => {
    return channelData.reduce(
      (acc, row) => ({
        promised: acc.promised + row.promisedCount,
        visited: acc.visited + row.visitedCount,
        paymentCount: acc.paymentCount + row.paymentCount,
        paymentAmount: acc.paymentAmount + row.paymentAmount,
      }),
      { promised: 0, visited: 0, paymentCount: 0, paymentAmount: 0 }
    )
  }, [channelData])

  const totalVisitRate = (totals.promised + totals.visited) === 0
    ? '-'
    : `${Math.round((totals.visited / (totals.promised + totals.visited)) * 100)}%`

  if (isLoading) {
    return (
      <Card style={{ flex: 1 }} bodyStyle={{ padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 16 }}>
              <Skeleton.Paragraph rows={1} style={{ width: 100 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
              <Skeleton.Paragraph rows={1} style={{ width: 60 }} />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  const columns: ColumnProps<ChannelStats>[] = [
    {
      title: '来源渠道', dataIndex: 'channel', width: 160,
      render: (text) => (
        <Tag size="small" color={text === '未知渠道' ? 'grey' : 'cyan'}>
          {text}
        </Tag>
      ),
    },
    {
      title: <span style={{ color: brandColors.orange }}>诺到</span>,
      dataIndex: 'promisedCount', width: 80, align: 'center' as const,
      render: (text) => <span style={{ fontWeight: 500, color: text > 0 ? brandColors.orange : undefined }}>{text}</span>,
    },
    {
      title: <span style={{ color: brandColors.blue }}>到访</span>,
      dataIndex: 'visitedCount', width: 80, align: 'center' as const,
      render: (text) => <span style={{ fontWeight: 500, color: text > 0 ? brandColors.blue : undefined }}>{text}</span>,
    },
    {
      title: '到访率', dataIndex: 'visitRate', width: 80, align: 'center' as const,
      render: (text) => <span style={{ color: 'var(--semi-color-text-2)' }}>{text}</span>,
    },
    {
      title: <span style={{ color: brandColors.green }}>缴费笔数</span>,
      dataIndex: 'paymentCount', width: 80, align: 'center' as const,
      render: (text) => <span style={{ fontWeight: 500, color: text > 0 ? brandColors.green : undefined }}>{text}</span>,
    },
    {
      title: '缴费金额', dataIndex: 'paymentAmount', width: 120, align: 'right' as const,
      render: (text) => {
        const amount = Number(text || 0)
        if (amount === 0) return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
        return (
          <span style={{ fontWeight: 500, color: brandColors.orange }}>
            ¥{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
  ]

  return (
    <Card
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 16px 0' }}
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>来源渠道统计</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>渠道数</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{channelData.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: brandColors.orange }}>诺到</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{totals.promised}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: brandColors.blue }}>到访</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{totals.visited}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>到访率</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{totalVisitRate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: brandColors.green }}>缴费</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{totals.paymentCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>缴费金额</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: brandColors.orange }}>
                ¥{totals.paymentAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      }
    >
      <Table
        columns={columns}
        dataSource={channelData}
        rowKey="channel"
        pagination={false}
        size="middle"
        empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无数据</div>}
      />
    </Card>
  )
}
