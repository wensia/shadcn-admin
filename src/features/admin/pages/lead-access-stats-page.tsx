/**
 * 线索查看统计页面
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import {
  Download,
  Search,
  Pencil,
  Users,
  Eye,
  MousePointer,
  Activity,
  Bell,
} from 'lucide-react'
import { Button, Input, Select, Modal, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { leadAccessStatsApi } from '../api'
import { LeadAccessNotifyDialog } from '../components/lead-access-notify-dialog'
import type {
  AdvisorAccessStatistics,
  AccessStatisticsSummary,
  AccessStatsFilters,
  BatchUpdateLimit,
} from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'

const { Text } = Typography

// 时间范围选项
const TIME_RANGE_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '近7天', value: 'last7days' },
  { label: '本周', value: 'thisweek' },
  { label: '近30天', value: 'last30days' },
  { label: '本月', value: 'thismonth' },
]

/** 带 id 字段的行数据类型，满足 SemiDataTable 约束 */
type StatsRow = AdvisorAccessStatistics & { id: string }

export function LeadAccessStatsPage() {
  useDocumentTitle('线索查看统计')
  const queryClient = useQueryClient()

  // 状态
  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<AccessStatsFilters>({
    time_range: 'today',
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 编辑弹窗状态
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdvisorAccessStatistics | null>(null)
  const [editDailyLimit, setEditDailyLimit] = useState(500)

  // 批量编辑弹窗状态
  const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false)
  const [batchDailyLimit, setBatchDailyLimit] = useState(500)

  // 导出状态
  const [exportLoading, setExportLoading] = useState(false)

  // 通知设置弹窗状态
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false)

  // 自动刷新定时器
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 获取统计数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lead-access-stats', filters],
    queryFn: () => leadAccessStatsApi.getAdvisorStatistics(filters),
  })

  const statistics = useMemo<AdvisorAccessStatistics[]>(() => data?.statistics ?? [], [data?.statistics])
  const summary: AccessStatisticsSummary = data?.summary || {
    total_users: 0,
    active_users: 0,
    total_views: 0,
    total_access: 0,
    time_range: 'today',
  }

  // 计算活跃率
  const activeRate = useMemo(() => {
    if (summary.total_users === 0) return 0
    return Math.round((summary.active_users / summary.total_users) * 100)
  }, [summary.total_users, summary.active_users])

  // 过滤后的数据（带 id）
  const filteredData = useMemo<StatsRow[]>(() => {
    const source = searchValue
      ? statistics.filter((item) => {
          const keyword = searchValue.toLowerCase()
          return (
            item.user_name.toLowerCase().includes(keyword) ||
            item.username.toLowerCase().includes(keyword)
          )
        })
      : statistics
    return source.map((item) => ({
      ...item,
      id: `${item.user_id}_${item.campus_name || ''}`,
    }))
  }, [statistics, searchValue])

  // 当前页数据（前端分页）
  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, page, pageSize])

  // 选中的行数据
  const selectedRows = useMemo(() => {
    return filteredData.filter((item) => selectedRowKeys.includes(item.id))
  }, [filteredData, selectedRowKeys])

  // 批量更新访问限制
  const batchUpdateMutation = useMutation({
    mutationFn: (updates: BatchUpdateLimit[]) =>
      leadAccessStatsApi.batchUpdateAccessLimits(updates),
    onSuccess: (result) => {
      toast.success(`成功更新 ${result.update_count} 条记录`)
      setEditDialogOpen(false)
      setBatchEditDialogOpen(false)
      setSelectedRowKeys([])
      queryClient.invalidateQueries({ queryKey: ['lead-access-stats'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })
  const { mutate: batchUpdateAccessLimits } = batchUpdateMutation

  // 打开单个编辑弹窗 - 使用 useCallback 缓存
  const handleEditLimit = useCallback((user: AdvisorAccessStatistics) => {
    setEditingUser(user)
    setEditDailyLimit(user.daily_limit)
    setEditDialogOpen(true)
  }, [])

  // Semi Table 列定义
  const columns: ColumnProps<StatsRow>[] = useMemo(
    () => [
      {
        title: '顾问姓名',
        dataIndex: 'user_name',
        render: (_text: string, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={80} />
          }
          return <span className="font-medium">{record.user_name}</span>
        },
      },
      {
        title: '所属校区',
        dataIndex: 'campus_name',
        render: (_text: string, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={112} />
          }
          return record.campus_name
        },
      },
      {
        title: '地区',
        dataIndex: 'district_name',
        render: (_text: string, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={80} />
          }
          return record.district_name || '-'
        },
      },
      {
        title: '查看线索数',
        dataIndex: 'view_count',
        sorter: (a: StatsRow, b: StatsRow) => (a?.view_count ?? 0) - (b?.view_count ?? 0),
        render: (_text: number, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={48} />
          }
          const count = record.view_count
          return (
            <span
              className={
                count > 0 ? 'text-green-600 font-medium' : ''
              }
              style={count <= 0 ? { color: 'var(--semi-color-text-2)' } : undefined}
            >
              {count}
            </span>
          )
        },
      },
      {
        title: '总访问次数',
        dataIndex: 'total_access',
        sorter: (a: StatsRow, b: StatsRow) => (a?.total_access ?? 0) - (b?.total_access ?? 0),
        render: (_text: number, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={48} />
          }
          return record.total_access
        },
      },
      {
        title: '每日限制',
        dataIndex: 'daily_limit',
        render: (_text: number, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={64} />
          }
          return (
            <Button
              theme="borderless"
              type="tertiary"
              size="small"
              icon={<Pencil className="h-3 w-3" />}
              iconPosition="right"
              onClick={() => handleEditLimit(record)}
            >
              {record.daily_limit}
            </Button>
          )
        },
      },
      {
        title: '使用率(按查看线索数)',
        dataIndex: 'usage_rate',
        render: (_text: unknown, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={48} />
          }
          const rate =
            record.daily_limit > 0
              ? Math.round(
                  (record.view_count / record.daily_limit) * 100
                )
              : 0

          let colorClass = 'text-green-600'
          if (rate >= 90) colorClass = 'text-yellow-600'
          if (rate >= 100) colorClass = 'text-red-600'

          return <span className={`font-medium ${colorClass}`}>{rate}%</span>
        },
      },
      {
        title: '今日剩余可查看',
        dataIndex: 'remaining',
        render: (_text: unknown, record: StatsRow) => {
          if (isSkeletonRow(record.user_id)) {
            return <SemiSkeletonCell width={48} />
          }
          const remaining = Math.max(
            0,
            record.daily_limit - record.view_count
          )

          let colorClass = 'text-green-600'
          if (remaining === 0) colorClass = 'text-red-600'
          else if (remaining < 50) colorClass = 'text-yellow-600'

          return <span className={`font-medium ${colorClass}`}>{remaining}</span>
        },
      },
    ],
    [handleEditLimit]
  )

  // 处理筛选变化
  const handleFilterChange = useCallback((key: keyof AccessStatsFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
    setSelectedRowKeys([])
    setPage(1)
  }, [])

  // 保存单个限制
  const handleSaveSingleLimit = useCallback(() => {
    if (!editingUser) return
    if (editDailyLimit === editingUser.daily_limit) {
      setEditDialogOpen(false)
      return
    }
    batchUpdateAccessLimits([
      { user_id: editingUser.user_id, daily_limit: editDailyLimit },
    ])
  }, [editingUser, editDailyLimit, batchUpdateAccessLimits])

  // 打开批量编辑弹窗
  const handleOpenBatchEdit = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择要修改的顾问')
      return
    }
    setBatchDailyLimit(500)
    setBatchEditDialogOpen(true)
  }, [selectedRows.length])

  // 保存批量限制
  const handleSaveBatchLimit = useCallback(() => {
    if (selectedRows.length === 0) return
    const updates: BatchUpdateLimit[] = selectedRows.map((row) => ({
      user_id: row.user_id,
      daily_limit: batchDailyLimit,
    }))
    batchUpdateAccessLimits(updates)
  }, [selectedRows, batchDailyLimit, batchUpdateAccessLimits])

  // 导出数据
  const handleExport = useCallback(() => {
    if (filteredData.length === 0) {
      toast.warning('暂无数据可导出')
      return
    }

    setExportLoading(true)

    try {
      const headers = [
        '顾问姓名',
        '所属校区',
        '地区',
        '查看线索数',
        '总访问次数',
        '每日限制',
        '使用率',
      ]

      const rows = filteredData.map((item) => [
        item.user_name,
        item.campus_name,
        item.district_name || '-',
        item.view_count.toString(),
        item.total_access.toString(),
        item.daily_limit.toString(),
        `${item.daily_limit > 0 ? Math.round((item.view_count / item.daily_limit) * 100) : 0}%`,
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const now = new Date()
      const filename = `线索访问统计_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.csv`

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('导出成功')
    } catch {
      toast.error('导出失败')
    } finally {
      setExportLoading(false)
    }
  }, [filteredData])

  // 自动刷新
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      refetch()
    }, 30000)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [refetch])

  // SemiDataTable rowSelection
  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: (keys: (string | number)[], _rows: StatsRow[]) => setSelectedRowKeys(keys as string[]),
  }), [selectedRowKeys])

  return (
    <>
      <DataTableLayout
        title="线索查看统计"
        total={filteredData.length}
        headerActions={
          <div className="flex items-center gap-2">
            <Button theme="outline" icon={<Bell className="h-4 w-4" />} onClick={() => setNotifyDialogOpen(true)}>
              通知设置
            </Button>
            <Button theme="solid" type="primary" icon={<Download className="h-4 w-4" />} onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? '导出中...' : '导出数据'}
            </Button>
          </div>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 }}>
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <Text type="tertiary" size="small">总顾问数</Text>
                    <p className="text-2xl font-bold">{summary.total_users}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <Activity className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <Text type="tertiary" size="small">活跃顾问数</Text>
                    <p className="text-2xl font-bold">
                      {summary.active_users}
                      <Text type="tertiary" size="small" className="ml-2">
                        ({activeRate}%)
                      </Text>
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <Text type="tertiary" size="small">总查看线索数</Text>
                    <p className="text-2xl font-bold">{summary.total_views}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-2">
                    <MousePointer className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <Text type="tertiary" size="small">总访问次数</Text>
                    <p className="text-2xl font-bold">{summary.total_access}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 筛选工具栏 */}
            <div className="flex items-center gap-2">
              <Select
                value={filters.time_range || 'today'}
                onChange={(value) => handleFilterChange('time_range', value as string)}
                optionList={TIME_RANGE_OPTIONS}
                style={{ width: 140 }}
              />
              <Input
                prefix={<Search className="h-4 w-4" />}
                placeholder="搜索顾问姓名..."
                value={searchValue}
                onChange={(v) => { setSearchValue(v); setPage(1) }}
                style={{ width: 200 }}
              />
              {selectedRows.length > 0 && (
                <Button theme="outline" onClick={handleOpenBatchEdit}>
                  批量修改限制 ({selectedRows.length})
                </Button>
              )}
            </div>
          </div>
        }
      >
        <SemiDataTable<StatsRow>
          columns={columns}
          data={pagedData}
          total={filteredData.length}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          rowSelection={rowSelection}
          emptyText="暂无数据"
        />
      </DataTableLayout>

      {/* 单个编辑弹窗 */}
      <Modal
        title="修改访问限制"
        visible={editDialogOpen}
        onCancel={() => setEditDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={handleSaveSingleLimit}
              loading={batchUpdateMutation.isPending}
            >
              确定
            </Button>
          </div>
        }
        width={400}
      >
        <div className="space-y-4 py-2">
          <Text type="tertiary" size="small">修改顾问每日可查看线索的限制数量</Text>
          <div className="flex items-center gap-4">
            <span className="w-20 text-right" style={{ color: 'var(--semi-color-text-2)' }}>顾问姓名</span>
            <span>{editingUser?.user_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-right" style={{ color: 'var(--semi-color-text-2)' }}>当前限制</span>
            <span>{editingUser?.daily_limit} 个/天</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-right" style={{ color: 'var(--semi-color-text-2)' }}>新的限制</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={String(editDailyLimit)}
                onChange={(v) => setEditDailyLimit(parseInt(v) || 0)}
                style={{ width: 128 }}
              />
              <Text type="tertiary">个/天</Text>
            </div>
          </div>
        </div>
      </Modal>

      {/* 批量编辑弹窗 */}
      <Modal
        title="批量修改访问限制"
        visible={batchEditDialogOpen}
        onCancel={() => setBatchEditDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBatchEditDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={handleSaveBatchLimit}
              loading={batchUpdateMutation.isPending}
            >
              确定修改
            </Button>
          </div>
        }
        width={400}
      >
        <div className="space-y-4 py-2">
          <Text type="tertiary" size="small">为选中的顾问统一设置每日可查看线索限制</Text>
          <div className="flex items-center gap-4">
            <span className="w-20 text-right" style={{ color: 'var(--semi-color-text-2)' }}>选中顾问</span>
            <span>已选择 {selectedRows.length} 名顾问</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-right" style={{ color: 'var(--semi-color-text-2)' }}>每日限制</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={String(batchDailyLimit)}
                onChange={(v) => setBatchDailyLimit(parseInt(v) || 0)}
                style={{ width: 128 }}
              />
              <Text type="tertiary">个/天</Text>
            </div>
          </div>
        </div>
      </Modal>

      {/* 通知设置弹窗 */}
      <LeadAccessNotifyDialog
        open={notifyDialogOpen}
        onOpenChange={setNotifyDialogOpen}
      />
    </>
  )
}
