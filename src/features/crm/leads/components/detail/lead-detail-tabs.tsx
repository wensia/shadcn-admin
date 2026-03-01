/**
 * 线索详情 Tabs 组件 - Semi Design 版本
 * 包含：概览、跟进记录、订单记录、统计图表、变更历史 五个 Tab
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabPane, Table, Tag, Tooltip, Button, Select, Card, Toast } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconCopy, IconTick } from '@douyinfe/semi-icons'
import { Receipt, ChevronLeft, ChevronRight } from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'
import { formatTime } from '@/lib/utils/time'

import { leadsApi } from '../../api'
import type { Lead, LeadFollowup } from '../../types'
import { followupMethodLabels } from '../../types'
import { useLeadStatistics } from '../../hooks/use-lead-statistics'
import { FollowupResultBadge } from '../status-badges'

// 订单相关
import { orderApi } from '@/features/crm/orders/api'
import type { Order } from '@/features/crm/orders/types'

// 详情组件
import { LeadInfoDisplay } from './lead-info-display'
import { ChangeHistoryTimeline } from './change-history-timeline'
import { LeadCallRecords } from './lead-call-records'

// 图表组件
import { FollowupFrequencyChart } from './charts/followup-frequency-chart'
import { FollowupMethodPie } from './charts/followup-method-pie'
import { FollowupResultPie } from './charts/followup-result-pie'

/** 跟进内容单元格 - 支持悬浮展示完整内容和复制 */
function FollowupContentCell({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const success = await copyToClipboard(content)
    if (success) {
      setCopied(true)
      Toast.success('已复制')
      setTimeout(() => setCopied(false), 2000)
    } else { Toast.error('复制失败') }
  }

  return (
    <Tooltip
      content={
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: 300 }}>
          <p style={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1, margin: 0 }}>{content}</p>
          <button
            type="button"
            onClick={handleCopy}
            style={{ flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: 'inherit' }}
          >
            {copied ? <IconTick style={{ fontSize: 12, color: 'var(--semi-color-success)' }} /> : <IconCopy style={{ fontSize: 12 }} />}
          </button>
        </div>
      }
      position="topLeft"
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', cursor: 'pointer' }}>{content}</span>
    </Tooltip>
  )
}

interface LeadDetailTabsProps {
  leadId: string
  lead?: Lead | null
  isLoading?: boolean
  defaultTab?: 'overview' | 'followups' | 'orders' | 'statistics' | 'history'
  className?: string
  useScrollArea?: boolean
  height?: string
  onFieldUpdate?: (field: string, value: string) => Promise<void>
  compact?: boolean
}

export function LeadDetailTabs({
  leadId,
  lead: externalLead,
  isLoading: externalLoading,
  defaultTab = 'overview',
  className,
  useScrollArea = true,
  height = 'h-full',
  onFieldUpdate,
  compact = false,
}: LeadDetailTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [followupPage, setFollowupPage] = useState(1)
  const [followupPageSize, setFollowupPageSize] = useState(5)

  // 如果外部没有传入 lead 数据，则内部获取
  const { data: internalLead, isLoading: internalLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => { const response = await leadsApi.getLead(leadId, true); return response.data },
    enabled: !!leadId && !externalLead,
  })

  const lead = externalLead ?? internalLead
  const isLoading = externalLoading ?? internalLoading

  // 获取跟进记录
  const { data: followupsResponse, isLoading: isFollowupsLoading } = useQuery({
    queryKey: ['lead-followups', leadId],
    queryFn: async () => await leadsApi.getLeadFollowups(leadId, { page: 1, size: 100 }),
    enabled: !!leadId && (activeTab === 'followups' || activeTab === 'statistics'),
  })

  const followupsPaginated = useMemo(() => {
    const all = followupsResponse?.data || []
    const total = all.length
    const totalPages = Math.ceil(total / followupPageSize)
    const items = all.slice((followupPage - 1) * followupPageSize, followupPage * followupPageSize)
    return { items, total, totalPages }
  }, [followupsResponse?.data, followupPage, followupPageSize])

  // 获取信息变更记录
  const { data: infoChangeLogs, isLoading: isInfoChangeLoading } = useQuery({
    queryKey: ['lead-info-changes', leadId],
    queryFn: async () => await leadsApi.getLeadInfoChangeLogs(leadId, { page: 1, size: 50 }),
    enabled: !!leadId && activeTab === 'history',
  })

  // 获取归属变更记录
  const { data: ownershipChangeLogs, isLoading: isOwnershipChangeLoading } = useQuery({
    queryKey: ['lead-ownership-changes', leadId],
    queryFn: async () => await leadsApi.getLeadOwnershipChangeLogs(leadId, { page: 1, size: 50 }),
    enabled: !!leadId && activeTab === 'history',
  })

  // 获取订单记录
  const { data: ordersResponse, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['lead-orders', leadId],
    queryFn: async () => await orderApi.getLeadOrders(leadId),
    enabled: !!leadId && activeTab === 'orders',
  })

  const statistics = useLeadStatistics(lead || null, followupsResponse?.data)

  // 跟进记录表格 columns
  const followupColumns: ColumnProps<LeadFollowup>[] = [
    { title: '跟进时间', dataIndex: 'followup_at', width: 140, render: (text) => <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{formatTime(text as string)}</span> },
    { title: '跟进方式', dataIndex: 'method', width: 80, render: (text) => <span style={{ fontSize: 13 }}>{followupMethodLabels[text as keyof typeof followupMethodLabels] || text}</span> },
    { title: '跟进结果', dataIndex: 'result', width: 90, render: (text, record) => text ? <FollowupResultBadge result={text as string} /> : <span style={{ color: 'var(--semi-color-text-2)' }}>-</span> },
    {
      title: '跟进内容', dataIndex: 'content',
      render: (text) => text ? <FollowupContentCell content={text as string} /> : '-',
    },
    {
      title: '跟进人', dataIndex: 'followup_by_name', width: 100,
      render: (text, record) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          {(text as string) || '-'}
          {record?.source === 'ai_auto' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, borderRadius: 3, padding: '0 4px', fontSize: 10, fontWeight: 500, background: '#faf5ff', color: '#9333ea' }} title="AI 通话分析自动生成">AI</span>
          )}
          {record?.source === 'ai_supplement' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, borderRadius: 3, padding: '0 4px', fontSize: 10, fontWeight: 500, background: '#eff6ff', color: '#2563eb' }} title="AI 通话分析补充记录">AI补充</span>
          )}
        </span>
      ),
    },
  ]

  // 订单表格 columns
  const orderColumns: ColumnProps<Order>[] = [
    { title: '订单编号', dataIndex: 'order_no', width: 120, render: (text) => <span style={{ fontSize: 13, fontWeight: 500 }}>{text as string}</span> },
    { title: '实付金额', dataIndex: 'actual_amount', width: 80, render: (text) => <span style={{ fontSize: 13, fontWeight: 500, color: '#ea580c', textAlign: 'right', display: 'block' }}>¥{Number(text).toFixed(2)}</span> },
    { title: '支付状态', dataIndex: 'payment_status', width: 80, render: (text, record) => <Tag size="small" color={text === 'paid' ? 'green' : undefined}>{record?.payment_status_display}</Tag> },
    { title: '支付时间', dataIndex: 'payment_at', width: 140, render: (text) => <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{text ? formatTime(text as string) : '-'}</span> },
    { title: '创建时间', dataIndex: 'created_at', width: 140, render: (text) => <span style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>{formatTime(text as string)}</span> },
  ]

  const wrapperStyle: React.CSSProperties = useScrollArea
    ? { height: '100%', overflow: 'auto' }
    : { overflow: 'auto' }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key as typeof activeTab)}
      className={className}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}
      tabBarStyle={{ paddingLeft: 16, paddingRight: 16, flexShrink: 0 }}
      contentStyle={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: 0 }}
    >
      {/* ===== 概览 Tab ===== */}
      <TabPane tab="概览" itemKey="overview">
        <div style={wrapperStyle}>
          <div style={{ padding: 16 }}>
            {isLoading ? (
              <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '32px 0' }}>加载中...</div>
            ) : lead ? (
              <LeadInfoDisplay lead={lead} isOverdue={statistics.isOverdue} onFieldUpdate={onFieldUpdate} compact={compact} />
            ) : (
              <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '32px 0' }}>暂无数据</div>
            )}
          </div>
        </div>
      </TabPane>

      {/* ===== 跟进记录 Tab ===== */}
      <TabPane
        tab={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            跟进记录
            <Tag size="small">{lead?.followup_count || 0}</Tag>
          </span>
        }
        itemKey="followups"
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 跟进记录表格区域 */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--semi-color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>跟进记录</span>
              {followupsPaginated.total > 0 && <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>共 {followupsPaginated.total} 条</span>}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {isFollowupsLoading ? (
                <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>加载中...</div>
              ) : !followupsPaginated.items.length ? (
                <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '16px 0' }}>暂无跟进记录</div>
              ) : (
                <Table columns={followupColumns} dataSource={followupsPaginated.items} rowKey="id" pagination={false} size="small" />
              )}
            </div>
            {followupsPaginated.total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid var(--semi-color-border)', background: 'var(--semi-color-fill-0)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--semi-color-text-2)' }}>每页</span>
                  <Select value={followupPageSize} onChange={(val) => { setFollowupPageSize(val as number); setFollowupPage(1) }} optionList={[5, 10, 20].map(s => ({ label: String(s), value: s }))} style={{ width: 70 }} size="small" />
                  <span style={{ color: 'var(--semi-color-text-2)' }}>条</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Button size="small" theme="light" disabled={followupPage <= 1} onClick={() => setFollowupPage(followupPage - 1)} icon={<ChevronLeft style={{ width: 16, height: 16 }} />} />
                  <span style={{ fontSize: 12, padding: '0 8px' }}>{followupPage} / {followupsPaginated.totalPages || 1}</span>
                  <Button size="small" theme="light" disabled={followupPage >= followupsPaginated.totalPages} onClick={() => setFollowupPage(followupPage + 1)} icon={<ChevronRight style={{ width: 16, height: 16 }} />} />
                </div>
              </div>
            )}
          </div>
          {/* 通话记录 - 可折叠 */}
          {leadId && (
            <div style={{ flexShrink: 0, borderTop: '1px solid var(--semi-color-border)' }}>
              <LeadCallRecords leadId={leadId} showHeader collapsible defaultCollapsed />
            </div>
          )}
        </div>
      </TabPane>

      {/* ===== 订单记录 Tab ===== */}
      <TabPane
        tab={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            订单记录
            {ordersResponse?.data && ordersResponse.data.length > 0 && <Tag size="small">{ordersResponse.data.length}</Tag>}
          </span>
        }
        itemKey="orders"
      >
        <div style={wrapperStyle}>
          <div style={{ padding: 16 }}>
            {isOrdersLoading ? (
              <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)', textAlign: 'center', padding: '32px 0' }}>加载中...</div>
            ) : !ordersResponse?.data?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
                <Receipt style={{ width: 48, height: 48, color: 'var(--semi-color-text-3)', marginBottom: 16 }} />
                <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>暂无订单记录</p>
                <p style={{ fontSize: 12, color: 'var(--semi-color-text-3)', marginTop: 4 }}>该线索还没有关联的缴费订单</p>
              </div>
            ) : (
              <Table columns={orderColumns} dataSource={ordersResponse.data} rowKey="id" pagination={false} size="small" />
            )}
          </div>
        </div>
      </TabPane>

      {/* ===== 统计图表 Tab ===== */}
      <TabPane tab="统计图表" itemKey="statistics">
        <div style={wrapperStyle}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card title={<span style={{ fontSize: 14 }}>跟进频率趋势</span>} headerLine>
              <div style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginBottom: 8 }}>最近30天的跟进活动</div>
              <FollowupFrequencyChart data={statistics.followupFrequencyData} />
            </Card>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card title={<span style={{ fontSize: 14 }}>跟进方式分布</span>} headerLine>
                <FollowupMethodPie data={statistics.methodDistribution} />
              </Card>
              <Card title={<span style={{ fontSize: 14 }}>跟进结果分布</span>} headerLine>
                <FollowupResultPie data={statistics.resultDistribution} />
              </Card>
            </div>
          </div>
        </div>
      </TabPane>

      {/* ===== 变更历史 Tab ===== */}
      <TabPane tab="变更历史" itemKey="history">
        <div style={wrapperStyle}>
          <div style={{ padding: 16 }}>
            <ChangeHistoryTimeline
              infoChanges={infoChangeLogs?.data || []}
              ownershipChanges={ownershipChangeLogs?.data || []}
              isLoading={isInfoChangeLoading || isOwnershipChangeLoading}
            />
          </div>
        </div>
      </TabPane>
    </Tabs>
  )
}

export default LeadDetailTabs
