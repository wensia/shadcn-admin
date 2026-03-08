/**
 * 咨询数据统计页面
 * 对接云客组员电话统计接口，展示总电话量、联系人数、通话时长三类指标
 */

import { useMemo, useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Button,
  Card,
  Progress,
  Select,
  Skeleton,
  Table,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  BarChart3,
  Clock,
  Phone,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { useTableScroll } from '@/components/semi/use-table-scroll'
import {
  formatDuration,
  formatDurationShort,
  getAdvisorCallMetricValue,
  type AdvisorCallMetric,
  type AdvisorCallRow,
} from './utils/advisor-call-stats'
import { useAdvisorCallData } from './hooks/use-advisor-call-data'

const { Text } = Typography

const periodOptions = [
  { value: '0', label: '今天' },
  { value: '1', label: '本周' },
  { value: '2', label: '本月' },
]

type MetricView = AdvisorCallMetric

const metricConfig: Record<MetricView, {
  label: string
  summaryLabel: string
  distributionLabel: string
  color: string
  backgroundColor: string
  icon: LucideIcon
  formatValue: (value: number) => string
  formatTableValue: (value: number) => string
}> = {
  callCount: {
    label: '总电话量',
    summaryLabel: '总电话量',
    distributionLabel: '电话量分布',
    color: 'var(--semi-color-primary)',
    backgroundColor: 'var(--semi-color-primary-light-default)',
    icon: Phone,
    formatValue: (value) => value.toLocaleString(),
    formatTableValue: (value) => value.toLocaleString(),
  },
  contactCount: {
    label: '联系人数',
    summaryLabel: '联系人数',
    distributionLabel: '联系人数分布',
    color: 'var(--semi-color-success)',
    backgroundColor: 'var(--semi-color-success-light-default)',
    icon: Users,
    formatValue: (value) => value.toLocaleString(),
    formatTableValue: (value) => value.toLocaleString(),
  },
  duration: {
    label: '通话时长',
    summaryLabel: '总通话时长',
    distributionLabel: '通话时长分布',
    color: 'var(--semi-color-warning)',
    backgroundColor: 'var(--semi-color-warning-light-default)',
    icon: Clock,
    formatValue: (value) => formatDuration(value),
    formatTableValue: (value) => formatDurationShort(value),
  },
}

export function ConsultingStatisticsPage() {
  useDocumentTitle('咨询数据统计')

  const [period, setPeriod] = useState('0')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')
  const [activeMetric, setActiveMetric] = useState<MetricView>('callCount')

  const { wrapperRef, scrollY } = useTableScroll()

  const callData = useAdvisorCallData({
    selectedAccountId,
    selectedCampusId,
    period: parseInt(period, 10),
  })

  const isLoading = callData.isLoading
  const isRefetching = callData.isRefetching

  const handleRefresh = async () => {
    await callData.refetch()
    Toast.success('已刷新')
  }

  const mergedUserList = useMemo(() => {
    return [...callData.rows].sort((a, b) => {
      const metricDiff = getAdvisorCallMetricValue(b, activeMetric) - getAdvisorCallMetricValue(a, activeMetric)
      if (metricDiff !== 0) return metricDiff
      const countDiff = b.callCount - a.callCount
      if (countDiff !== 0) return countDiff
      return a.name.localeCompare(b.name, 'zh-Hans-CN')
    })
  }, [activeMetric, callData.rows])

  const totals = callData.totals

  const activeMetricMeta = metricConfig[activeMetric]
  const activeMetricTotal = useMemo(
    () => mergedUserList.reduce((sum, user) => sum + getAdvisorCallMetricValue(user, activeMetric), 0),
    [activeMetric, mergedUserList],
  )
  const activeMetricMax = useMemo(
    () => Math.max(...mergedUserList.map((user) => getAdvisorCallMetricValue(user, activeMetric)), 1),
    [activeMetric, mergedUserList],
  )

  const summaryCards = useMemo(() => ([
    {
      key: 'callCount',
      label: metricConfig.callCount.summaryLabel,
      value: metricConfig.callCount.formatValue(totals.totalCallCount),
      icon: Phone,
      color: metricConfig.callCount.color,
      backgroundColor: metricConfig.callCount.backgroundColor,
      active: activeMetric === 'callCount',
    },
    {
      key: 'contactCount',
      label: metricConfig.contactCount.summaryLabel,
      value: metricConfig.contactCount.formatValue(totals.totalContactCount),
      icon: Users,
      color: metricConfig.contactCount.color,
      backgroundColor: metricConfig.contactCount.backgroundColor,
      active: activeMetric === 'contactCount',
    },
    {
      key: 'duration',
      label: metricConfig.duration.summaryLabel,
      value: metricConfig.duration.formatValue(totals.totalDuration),
      icon: Clock,
      color: metricConfig.duration.color,
      backgroundColor: metricConfig.duration.backgroundColor,
      active: activeMetric === 'duration',
    },
    {
      key: 'advisorCount',
      label: '参与顾问数',
      value: totals.advisorCount.toLocaleString(),
      icon: BarChart3,
      color: 'var(--semi-color-text-0)',
      backgroundColor: 'var(--semi-color-fill-0)',
      active: false,
    },
  ]), [activeMetric, totals.advisorCount, totals.totalCallCount, totals.totalContactCount, totals.totalDuration])

  const columns = useMemo<ColumnProps<AdvisorCallRow>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 64,
      align: 'center' as const,
      render: (_: unknown, __: AdvisorCallRow, index: number) => {
        const rankStyle: React.CSSProperties = {
          display: 'inline-flex',
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontSize: 12,
          fontWeight: 500,
        }
        if (index === 0) Object.assign(rankStyle, { background: 'var(--semi-color-warning-light-default)', color: 'var(--semi-color-warning)' })
        else if (index === 1) Object.assign(rankStyle, { background: 'var(--semi-color-fill-0)', color: 'var(--semi-color-text-0)' })
        else if (index === 2) Object.assign(rankStyle, { background: 'var(--semi-color-primary-light-default)', color: 'var(--semi-color-primary)' })
        else Object.assign(rankStyle, { color: 'var(--semi-color-text-2)' })
        return <span style={rankStyle}>{index + 1}</span>
      },
    },
    {
      title: '顾问姓名',
      dataIndex: 'name',
      width: 120,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: '校区',
      dataIndex: 'campusNames',
      width: 180,
      render: (text: string) => (
        <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: (
        <span style={{ color: activeMetric === 'callCount' ? metricConfig.callCount.color : undefined }}>
          总电话量
        </span>
      ),
      dataIndex: 'callCount',
      width: 112,
      align: 'right' as const,
      render: (value: number) => <span style={{ fontFamily: 'monospace' }}>{value.toLocaleString()}</span>,
    },
    {
      title: (
        <span style={{ color: activeMetric === 'contactCount' ? metricConfig.contactCount.color : undefined }}>
          联系人数
        </span>
      ),
      dataIndex: 'contactCount',
      width: 112,
      align: 'right' as const,
      render: (value: number) => <span style={{ fontFamily: 'monospace' }}>{value.toLocaleString()}</span>,
    },
    {
      title: '联系率',
      dataIndex: 'contactRate',
      width: 104,
      align: 'right' as const,
      render: (value: number) => <span style={{ fontFamily: 'monospace' }}>{value.toFixed(1)}%</span>,
    },
    {
      title: (
        <span style={{ color: activeMetric === 'duration' ? metricConfig.duration.color : undefined }}>
          通话时长
        </span>
      ),
      dataIndex: 'duration',
      width: 128,
      align: 'right' as const,
      render: (value: number) => <span style={{ fontFamily: 'monospace' }}>{formatDurationShort(value)}</span>,
    },
    {
      title: '平均通时',
      dataIndex: 'avgDuration',
      width: 120,
      align: 'right' as const,
      render: (value: number) => <span style={{ fontFamily: 'monospace' }}>{formatDurationShort(value)}</span>,
    },
    {
      title: activeMetricMeta.distributionLabel,
      dataIndex: 'distribution',
      render: (_: unknown, record: AdvisorCallRow) => {
        const value = getAdvisorCallMetricValue(record, activeMetric)
        const percentOfMax = activeMetricMax > 0 ? (value / activeMetricMax) * 100 : 0
        const percentOfTotal = activeMetricTotal > 0 ? ((value / activeMetricTotal) * 100).toFixed(1) : '0.0'

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={percentOfMax}
              size="small"
              showInfo={false}
              stroke={activeMetricMeta.color}
              style={{ flex: 1 }}
            />
            <span style={{ width: 52, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              {percentOfTotal}%
            </span>
          </div>
        )
      },
    },
  ], [activeMetric, activeMetricMax, activeMetricMeta.color, activeMetricMeta.distributionLabel, activeMetricTotal])

  return (
    <DataTableLayout
      title="咨询数据统计"
      total={mergedUserList.length}
      onRefresh={handleRefresh}
      isRefreshing={isRefetching}
      toolbar={(
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  bodyStyle={{ padding: 14 }}
                >
                  <Skeleton.Title style={{ width: '42%', marginBottom: 10 }} />
                  <Skeleton.Paragraph rows={1} style={{ width: '66%' }} />
                </Card>
              ))
            ) : (
              summaryCards.map((card) => {
                const Icon = card.icon
                const isClickable = card.key === 'callCount' || card.key === 'contactCount' || card.key === 'duration'
                return (
                  <div
                    key={card.key}
                    onClick={isClickable ? () => setActiveMetric(card.key as MetricView) : undefined}
                    style={{
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                  >
                    <Card
                      bodyStyle={{ padding: 14 }}
                      style={{
                        borderColor: card.active ? card.color : undefined,
                        background: card.active ? card.backgroundColor : 'var(--semi-color-bg-0)',
                        transition: 'background-color 0.2s ease, border-color 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 6 }}>
                            {card.label}
                          </Text>
                          <div style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 700, color: 'var(--semi-color-text-0)' }}>
                            {card.value}
                          </div>
                        </div>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: card.backgroundColor,
                            color: card.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={18} />
                        </div>
                      </div>
                      {isClickable && (
                        <Text
                          size="small"
                          style={{
                            display: 'block',
                            marginTop: 10,
                            color: card.active ? card.color : 'var(--semi-color-text-2)',
                          }}
                        >
                          {card.active ? '当前主指标' : '点击设为主指标'}
                        </Text>
                      )}
                    </Card>
                  </div>
                )
              })
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 4,
                border: '1px solid var(--semi-color-border)',
                borderRadius: 8,
                background: 'var(--semi-color-fill-0)',
                flexWrap: 'wrap',
              }}
            >
              {(Object.keys(metricConfig) as MetricView[]).map((metric) => {
                const config = metricConfig[metric]
                const isActive = activeMetric === metric
                const Icon = config.icon
                return (
                  <Button
                    key={metric}
                    theme="borderless"
                    onClick={() => setActiveMetric(metric)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      border: `1px solid ${isActive ? config.color : 'transparent'}`,
                      borderRadius: 6,
                      background: isActive ? config.backgroundColor : 'transparent',
                      color: isActive ? config.color : 'var(--semi-color-text-2)',
                      fontWeight: 600,
                    }}
                  >
                    <Icon size={15} />
                    <span>{config.label}</span>
                  </Button>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Select
                value={callData.effectiveAccountId || undefined}
                onChange={(value) => setSelectedAccountId(value as string)}
                optionList={callData.accountOptions}
                placeholder="选择云客账号"
                style={{ width: 180 }}
                disabled={!callData.hasAccounts}
              />
              <Select
                value={selectedCampusId}
                onChange={(value) => setSelectedCampusId(value as string)}
                optionList={[{ value: 'all', label: '全部校区' }, ...callData.campusOptions]}
                style={{ width: 140 }}
              />
              <Select
                value={period}
                onChange={(value) => setPeriod(value as string)}
                optionList={periodOptions}
                style={{ width: 112 }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 4,
              flexWrap: 'wrap',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-fill-0)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  color: activeMetricMeta.color,
                  background: activeMetricMeta.backgroundColor,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <activeMetricMeta.icon size={14} />
                {activeMetricMeta.label}
              </span>
              <Text type="secondary" size="small">
                当前汇总 {activeMetricMeta.formatValue(activeMetricTotal)}
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <Text type="tertiary" size="small">总电话量 {totals.totalCallCount.toLocaleString()}</Text>
              <Text type="tertiary" size="small">联系人数 {totals.totalContactCount.toLocaleString()}</Text>
              <Text type="tertiary" size="small">平均通时 {formatDurationShort(totals.avgDuration)}</Text>
            </div>
          </div>
        </>
      )}
    >
      <div ref={wrapperRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={mergedUserList}
          rowKey="id"
          pagination={false}
          scroll={{ y: scrollY }}
          loading={isLoading}
          empty={(
            <div style={{ padding: 64, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
              {callData.hasAccounts ? '暂无统计数据' : '未配置云客账号'}
            </div>
          )}
        />
      </div>
    </DataTableLayout>
  )
}

export default ConsultingStatisticsPage
