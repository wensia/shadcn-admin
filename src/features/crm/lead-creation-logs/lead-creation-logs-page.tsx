/**
 * 线索创建日志页面
 * 两个 Tab：渠道提交 + 普通新建
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import {
  Tabs,
  TabPane,
  Select,
  Tag,
  DatePicker,
  Typography,
  Button,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconRefresh } from '@douyinfe/semi-icons'
import { format } from 'date-fns'

import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { leadCreationLogsApi } from './api'
import {
  submitStatusConfig,
  submitModeLabels,
  type ChannelSubmitLogItem,
  type ManualLeadLogItem,
  type ChannelSubmitLogParams,
  type ManualLeadLogParams,
} from './types'

const { Title, Text } = Typography

type TabKey = 'channel' | 'manual'

/** 状态筛选下拉选项 */
const statusOptions = Object.entries(submitStatusConfig).map(
  ([value, { label }]) => ({ value, label }),
)

export function LeadCreationLogsPage() {
  useDocumentTitle('线索创建日志')

  // 线索详情抽屉状态
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Tab 状态
  const [activeTab, setActiveTab] = useState<TabKey>('channel')

  // 渠道提交 Tab 状态
  const [channelPage, setChannelPage] = useState(1)
  const [channelPageSize, setChannelPageSize] = useState(20)
  const [channelStatus, setChannelStatus] = useState<string | undefined>()
  const [channelDateRange, setChannelDateRange] = useState<
    [Date, Date] | undefined
  >()

  // 普通新建 Tab 状态
  const [manualPage, setManualPage] = useState(1)
  const [manualPageSize, setManualPageSize] = useState(20)
  const [manualDateRange, setManualDateRange] = useState<
    [Date, Date] | undefined
  >()

  // 渠道提交查询参数
  const channelParams = useMemo<ChannelSubmitLogParams>(
    () => ({
      page: channelPage,
      size: channelPageSize,
      ...(channelStatus ? { status: channelStatus } : {}),
      ...(channelDateRange
        ? {
            date_from: channelDateRange[0].toISOString(),
            date_to: channelDateRange[1].toISOString(),
          }
        : {}),
    }),
    [channelPage, channelPageSize, channelStatus, channelDateRange],
  )

  // 手动创建查询参数
  const manualParams = useMemo<ManualLeadLogParams>(
    () => ({
      page: manualPage,
      size: manualPageSize,
      ...(manualDateRange
        ? {
            date_from: manualDateRange[0].toISOString(),
            date_to: manualDateRange[1].toISOString(),
          }
        : {}),
    }),
    [manualPage, manualPageSize, manualDateRange],
  )

  // 渠道提交数据
  const {
    data: channelData,
    isLoading: channelLoading,
    refetch: refetchChannel,
  } = useQuery({
    queryKey: ['channel-submit-logs', channelParams],
    queryFn: async () => {
      const response =
        await leadCreationLogsApi.getChannelSubmitLogs(channelParams)
      return response.data
    },
    enabled: activeTab === 'channel',
  })

  // 手动创建数据
  const {
    data: manualData,
    isLoading: manualLoading,
    refetch: refetchManual,
  } = useQuery({
    queryKey: ['manual-lead-logs', manualParams],
    queryFn: async () => {
      const response =
        await leadCreationLogsApi.getManualLeadLogs(manualParams)
      return response.data
    },
    enabled: activeTab === 'manual',
  })

  // Tab 切换
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as TabKey)
  }, [])

  // 行点击 → 打开线索详情
  const handleChannelRowClick = useCallback((record: ChannelSubmitLogItem) => {
    if (record.lead_id) {
      setDetailLeadId(record.lead_id)
      setDetailOpen(true)
    }
  }, [])

  const handleManualRowClick = useCallback((record: ManualLeadLogItem) => {
    setDetailLeadId(record.id)
    setDetailOpen(true)
  }, [])

  // 刷新
  const handleRefresh = useCallback(() => {
    if (activeTab === 'channel') {
      refetchChannel()
    } else {
      refetchManual()
    }
  }, [activeTab, refetchChannel, refetchManual])

  // 渠道提交表格列
  const channelColumns = useMemo<ColumnProps<ChannelSubmitLogItem>[]>(
    () => [
      {
        title: '时间',
        dataIndex: 'created_at',
        width: 160,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={130} />
          return record.created_at
            ? format(new Date(record.created_at), 'yyyy-MM-dd HH:mm:ss')
            : '-'
        },
      },
      {
        title: '手机号',
        dataIndex: 'phone_masked',
        width: 120,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
          return record.phone_masked
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
          const config = submitStatusConfig[record.status]
          if (!config)
            return (
              <Tag size="small" color="grey">
                {record.status}
              </Tag>
            )
          return (
            <Tag size="small" color={config.color}>
              {config.label}
            </Tag>
          )
        },
      },
      {
        title: '消息',
        dataIndex: 'message',
        width: 200,
        ellipsis: true,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
          return record.message || '-'
        },
      },
      {
        title: '渠道',
        dataIndex: 'source_channel_name',
        width: 140,
        ellipsis: true,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
          return record.source_channel_name
        },
      },
      {
        title: '提交人',
        dataIndex: 'submitter_name',
        width: 100,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
          return record.submitter_name || '-'
        },
      },
      {
        title: '校区',
        dataIndex: 'campus_name',
        width: 120,
        ellipsis: true,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          return record.campus_name || '-'
        },
      },
      {
        title: '方式',
        dataIndex: 'submit_mode',
        width: 80,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={40} />
          return record.submit_mode
            ? (submitModeLabels[record.submit_mode] ?? record.submit_mode)
            : '-'
        },
      },
    ],
    [],
  )

  // 手动创建表格列
  const manualColumns = useMemo<ColumnProps<ManualLeadLogItem>[]>(
    () => [
      {
        title: '时间',
        dataIndex: 'created_at',
        width: 160,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={130} />
          return record.created_at
            ? format(new Date(record.created_at), 'yyyy-MM-dd HH:mm:ss')
            : '-'
        },
      },
      {
        title: '手机号',
        dataIndex: 'phone_masked',
        width: 120,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
          return record.phone_masked
        },
      },
      {
        title: '渠道',
        dataIndex: 'source_channel_name',
        width: 160,
        ellipsis: true,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={120} />
          return record.source_channel_name
        },
      },
      {
        title: '创建人',
        dataIndex: 'creator_name',
        width: 120,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          return record.creator_name
        },
      },
      {
        title: '校区',
        dataIndex: 'campus_name',
        width: 140,
        ellipsis: true,
        render: (_, record) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
          return record.campus_name || '-'
        },
      },
    ],
    [],
  )

  return (
    <Main fixed className='min-h-0'>
      <div
        style={{
          display: 'flex',
          minHeight: 0,
          flex: 1,
          flexDirection: 'column',
          gap: 16,
          overflow: 'hidden',
        }}
      >
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div>
            <Title heading={5} style={{ margin: 0 }}>
              线索创建日志
            </Title>
            <Text type='tertiary' style={{ fontSize: 12 }}>
              查看渠道提交和手动创建的线索记录
            </Text>
          </div>
          <Button icon={<IconRefresh />} onClick={handleRefresh} />
        </div>

        {/* Tabs + 筛选 */}
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Tabs
            type='button'
            activeKey={activeTab}
            onChange={handleTabChange}
          >
            <TabPane tab='渠道提交' itemKey='channel' />
            <TabPane tab='普通新建' itemKey='manual' />
          </Tabs>

          {/* 筛选栏 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeTab === 'channel' && (
              <Select
                placeholder='状态筛选'
                optionList={statusOptions}
                value={channelStatus}
                onChange={(v) => {
                  setChannelStatus(v as string | undefined)
                  setChannelPage(1)
                }}
                showClear
                style={{ width: 130 }}
              />
            )}
            <DatePicker
              type='dateRange'
              placeholder={['开始日期', '结束日期']}
              value={
                activeTab === 'channel' ? channelDateRange : manualDateRange
              }
              onChange={(dates) => {
                const range =
                  Array.isArray(dates) &&
                  dates.length === 2 &&
                  dates[0] instanceof Date &&
                  dates[1] instanceof Date
                    ? ([dates[0], dates[1]] as [Date, Date])
                    : undefined
                if (activeTab === 'channel') {
                  setChannelDateRange(range)
                  setChannelPage(1)
                } else {
                  setManualDateRange(range)
                  setManualPage(1)
                }
              }}
              style={{ width: 240 }}
            />
          </div>
        </div>

        {/* 数据表格 */}
        <div
          style={{
            display: 'flex',
            minHeight: 0,
            flex: 1,
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 8,
            border: '1px solid var(--semi-color-border)',
            background: 'var(--semi-color-bg-0)',
          }}
        >
          {activeTab === 'channel' ? (
            <SemiDataTable<ChannelSubmitLogItem>
              columns={channelColumns}
              data={channelData?.items ?? []}
              total={channelData?.total ?? 0}
              page={channelPage}
              pageSize={channelPageSize}
              isLoading={channelLoading}
              onPageChange={setChannelPage}
              onPageSizeChange={(size) => {
                setChannelPageSize(size)
                setChannelPage(1)
              }}
              onRowClick={handleChannelRowClick}
            />
          ) : (
            <SemiDataTable<ManualLeadLogItem>
              columns={manualColumns}
              data={manualData?.items ?? []}
              total={manualData?.total ?? 0}
              page={manualPage}
              pageSize={manualPageSize}
              isLoading={manualLoading}
              onPageChange={setManualPage}
              onPageSizeChange={(size) => {
                setManualPageSize(size)
                setManualPage(1)
              }}
              onRowClick={handleManualRowClick}
            />
          )}
        </div>
      </div>

      {/* 线索详情抽屉 */}
      <LeadDetailSheet
        leadId={detailLeadId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </Main>
  )
}
