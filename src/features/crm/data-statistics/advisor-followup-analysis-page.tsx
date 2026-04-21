/**
 * 跟进分析 Tab 页面
 * 包含：跟进结果分布表 + 回访线索渠道分布表
 */

import { useMemo } from 'react'
import { Card, Skeleton, Table, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { RefreshCw } from 'lucide-react'
import { Button } from '@douyinfe/semi-ui-19'
import { followupResultOptions } from '@/features/crm/continuous-call/components/followup-options'
import { useAdvisorFollowupResultStats } from './hooks/use-advisor-followup-result-stats'
import { useAdvisorLeadChannelStats } from './hooks/use-advisor-lead-channel-stats'
import type { AdvisorFollowupResultStats, AdvisorLeadChannelStats } from './api/advisor-stats-api'

const { Title, Text } = Typography

// ============================================================================
// 跟进结果标签映射（前端已有的 followupResultOptions 不完整，补充完整映射）
// ============================================================================

const RESULT_LABEL_MAP: Record<string, string> = {
  not_connected: '未接通',
  hung_up: '秒挂',
  no_need: '不需要',
  wrong_number: '空错号',
  yunke_risk_control: '云客风控',
  no_child: '没孩子',
  age_mismatch: '年龄不符',
  temporarily_unavailable: '暂时不便',
  can_continue: '可持续跟进',
  appointment_scheduled: '预约到访',
  wechat_added: '添加微信',
  other: '其他',
}

// 跟进结果颜色映射
const RESULT_COLOR_MAP: Record<string, string> = {}
for (const opt of followupResultOptions) {
  RESULT_COLOR_MAP[opt.value] = opt.color
}

// 所有跟进结果枚举值（固定顺序）
const ALL_RESULTS = [
  'can_continue',
  'appointment_scheduled',
  'wechat_added',
  'not_connected',
  'temporarily_unavailable',
  'hung_up',
  'no_need',
  'wrong_number',
  'no_child',
  'age_mismatch',
  'yunke_risk_control',
  'other',
]

// ============================================================================
// 类型定义
// ============================================================================

interface ExternalFilter {
  dateMode: string
  selectedDate: Date
  selectedRange: [Date, Date]
  selectedCampusId: string
  selectedAccountId: string
  dateFrom: string
  dateTo: string
}

interface FollowupResultRow {
  key: string
  advisorName: string
  campusName: string
  totalFollowups: number
  [resultKey: string]: string | number
}

interface ChannelRow {
  key: string
  advisorName: string
  campusName: string
  totalLeads: number
  [channelName: string]: string | number
}

// ============================================================================
// 跟进结果分布表
// ============================================================================

function FollowupResultTable({
  data,
  isLoading,
}: {
  data: AdvisorFollowupResultStats[] | null
  isLoading: boolean
}) {
  const rows: FollowupResultRow[] = useMemo(() => {
    if (!data) return []
    return data.map((advisor) => {
      const row: FollowupResultRow = {
        key: advisor.advisor_id,
        advisorName: advisor.advisor_name,
        campusName: advisor.campus_name ?? '-',
        totalFollowups: advisor.total_followups,
      }
      // 初始化所有结果为 0
      for (const r of ALL_RESULTS) {
        row[r] = 0
      }
      // 填入实际值
      for (const rc of advisor.result_counts) {
        row[rc.result] = rc.count
      }
      return row
    })
  }, [data])

  const columns: ColumnProps<FollowupResultRow>[] = useMemo(() => {
    const base: ColumnProps<FollowupResultRow>[] = [
      {
        title: '顾问',
        dataIndex: 'advisorName',
        width: 100,
        fixed: 'left',
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: '校区',
        dataIndex: 'campusName',
        width: 100,
      },
      {
        title: '总跟进',
        dataIndex: 'totalFollowups',
        width: 80,
        sorter: (a, b) => (a?.totalFollowups ?? 0) - (b?.totalFollowups ?? 0),
        render: (v: number) => <Text strong>{v}</Text>,
      },
    ]

    const resultCols: ColumnProps<FollowupResultRow>[] = ALL_RESULTS.map((r) => ({
      title: RESULT_LABEL_MAP[r] ?? r,
      dataIndex: r,
      width: 80,
      align: 'center' as const,
      sorter: (a: FollowupResultRow | undefined, b: FollowupResultRow | undefined) =>
        ((a?.[r] as number) ?? 0) - ((b?.[r] as number) ?? 0),
      render: (v: number) => {
        if (!v) return <Text type="tertiary">-</Text>
        const color = RESULT_COLOR_MAP[r]
        return <Text style={color ? { color, fontWeight: 600 } : { fontWeight: 600 }}>{v}</Text>
      },
    }))

    return [...base, ...resultCols]
  }, [])

  if (isLoading) {
    return <Skeleton.Paragraph rows={6} />
  }

  return (
    <Table
      columns={columns}
      dataSource={rows}
      pagination={false}
      size="small"
      scroll={{ x: 100 + 100 + 80 + ALL_RESULTS.length * 80 }}
      empty="暂无数据"
    />
  )
}

// ============================================================================
// 回访线索渠道分布表
// ============================================================================

function ChannelTable({
  data,
  isLoading,
}: {
  data: AdvisorLeadChannelStats[] | null
  isLoading: boolean
}) {
  // 收集所有出现过的渠道名称
  const allChannels = useMemo(() => {
    if (!data) return []
    const channelSet = new Map<string, string>() // name -> category
    for (const advisor of data) {
      for (const ch of advisor.channel_counts) {
        if (!channelSet.has(ch.channel_name)) {
          channelSet.set(ch.channel_name, ch.channel_category ?? '')
        }
      }
    }
    return Array.from(channelSet.entries()).map(([name, category]) => ({ name, category }))
  }, [data])

  const rows: ChannelRow[] = useMemo(() => {
    if (!data) return []
    return data.map((advisor) => {
      const row: ChannelRow = {
        key: advisor.advisor_id,
        advisorName: advisor.advisor_name,
        campusName: advisor.campus_name ?? '-',
        totalLeads: advisor.total_leads,
      }
      for (const ch of allChannels) {
        row[ch.name] = 0
      }
      for (const ch of advisor.channel_counts) {
        row[ch.channel_name] = ch.count
      }
      return row
    })
  }, [data, allChannels])

  const columns: ColumnProps<ChannelRow>[] = useMemo(() => {
    const base: ColumnProps<ChannelRow>[] = [
      {
        title: '顾问',
        dataIndex: 'advisorName',
        width: 100,
        fixed: 'left',
        render: (text: string) => <Text strong>{text}</Text>,
      },
      {
        title: '校区',
        dataIndex: 'campusName',
        width: 100,
      },
      {
        title: '总线索数',
        dataIndex: 'totalLeads',
        width: 90,
        sorter: (a, b) => (a?.totalLeads ?? 0) - (b?.totalLeads ?? 0),
        render: (v: number) => <Text strong>{v}</Text>,
      },
    ]

    const channelCols: ColumnProps<ChannelRow>[] = allChannels.map((ch) => ({
      title: ch.name,
      dataIndex: ch.name,
      width: 100,
      align: 'center' as const,
      sorter: (a: ChannelRow | undefined, b: ChannelRow | undefined) =>
        ((a?.[ch.name] as number) ?? 0) - ((b?.[ch.name] as number) ?? 0),
      render: (v: number) => {
        if (!v) return <Text type="tertiary">-</Text>
        return <Text style={{ fontWeight: 600 }}>{v}</Text>
      },
    }))

    return [...base, ...channelCols]
  }, [allChannels])

  if (isLoading) {
    return <Skeleton.Paragraph rows={6} />
  }

  return (
    <Table
      columns={columns}
      dataSource={rows}
      pagination={false}
      size="small"
      scroll={{ x: 100 + 100 + 90 + allChannels.length * 100 }}
      empty="暂无数据"
    />
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function AdvisorFollowupAnalysisPage({
  externalFilter,
}: {
  externalFilter: ExternalFilter
}) {
  const { selectedCampusId, dateFrom, dateTo } = externalFilter

  const resultStats = useAdvisorFollowupResultStats({
    campusId: selectedCampusId,
    dateFrom,
    dateTo,
  })

  const channelStats = useAdvisorLeadChannelStats({
    campusId: selectedCampusId,
    dateFrom,
    dateTo,
  })

  const isAnyLoading = resultStats.isLoading || channelStats.isLoading
  const isAnyRefetching = resultStats.isRefetching || channelStats.isRefetching

  const handleRefresh = () => {
    void resultStats.refetch()
    void channelStats.refetch()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          icon={<RefreshCw size={14} />}
          loading={isAnyRefetching}
          onClick={handleRefresh}
          size="small"
        >
          刷新
        </Button>
      </div>

      {/* 跟进结果分布 */}
      <Card
        style={{
          borderRadius: 14,
          border: '1px solid var(--semi-color-border)',
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Title heading={6} style={{ marginBottom: 12 }}>
          跟进结果分布
        </Title>
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
          统计每个顾问在所选时间范围内的跟进记录，按跟进结果分类计数
        </Text>
        <FollowupResultTable
          data={resultStats.data?.stats ?? null}
          isLoading={resultStats.isLoading}
        />
      </Card>

      {/* 回访线索渠道分布 */}
      <Card
        style={{
          borderRadius: 14,
          border: '1px solid var(--semi-color-border)',
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Title heading={6} style={{ marginBottom: 12 }}>
          回访线索渠道分布
        </Title>
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
          统计每个顾问回访过的线索的来源渠道（激活线索使用激活后的渠道）
        </Text>
        <ChannelTable
          data={channelStats.data?.stats ?? null}
          isLoading={channelStats.isLoading}
        />
      </Card>
    </div>
  )
}
