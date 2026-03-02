/**
 * 咨询数据统计页面
 * 展示通话统计数据，包括统计卡片和员工通话明细表格
 * Semi Design 重构 — DataTableLayout + useTableScroll
 * 注：无分页统计排行榜，使用 useTableScroll 替代手动 ResizeObserver
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Table,
  Select,
  Skeleton,
  Progress,
  Toast,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  Phone,
  Clock,
  Users,
  Building2,
} from 'lucide-react'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { useTableScroll } from '@/components/semi/use-table-scroll'
import { brandColors } from '@/features/crm/daily-control/theme'
import { callRecordsApi, yunkeCredentialsApi } from '@/features/yunke/api'

// 时间周期选项
const periodOptions = [
  { value: '0', label: '今天' },
  { value: '1', label: '本周' },
  { value: '2', label: '本月' },
]

// 统计类型选项
const statTypeOptions = [
  { value: '0', label: '全部' },
  { value: '1', label: '外呼' },
  { value: '2', label: '呼入' },
]

// 格式化时长（秒转分秒）
function formatDuration(seconds?: number): string {
  if (!seconds || seconds === 0) return '0秒'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) return `${hours}时${minutes}分${secs}秒`
  if (minutes > 0) return `${minutes}分${secs}秒`
  return `${secs}秒`
}

// 格式化时长（简短格式，用于表格）
function formatDurationShort(seconds?: number): string {
  if (!seconds || seconds === 0) return '0:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// 云客返回的数据项类型
interface ChartCountItem {
  name: string
  value: number
  url?: string
}

// 云客统计数据类型
interface YunkeCallStatisticsData {
  chart2Names1?: string[]
  chart2Names3?: string[]
  chart2Counts1?: ChartCountItem[]
  chart2Counts3?: ChartCountItem[]
}

// 合并用户数据类型
interface MergedUser {
  name: string
  callCount: number
  duration: number
}

export function ConsultingStatisticsPage() {
  useDocumentTitle('咨询数据统计')

  // 筛选条件
  const [period, setPeriod] = useState('0')
  const [statType, setStatType] = useState('0')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')

  // 使用 useTableScroll 替代手动 ResizeObserver
  const { wrapperRef, scrollY } = useTableScroll()

  // 获取云客账号列表
  const { data: accountsData } = useQuery({
    queryKey: ['yunke-accounts-for-statistics'],
    queryFn: async () => {
      return yunkeCredentialsApi.getCredentials({ status: 1, limit: 100 })
    },
    staleTime: 5 * 60 * 1000,
  })

  // 获取员工-校区映射关系
  const { data: employeeCampusMapping } = useQuery({
    queryKey: ['employee-campus-mapping'],
    queryFn: async () => {
      return callRecordsApi.getEmployeeCampusMapping()
    },
    staleTime: 5 * 60 * 1000,
  })

  // 从映射关系中提取唯一的校区列表
  const campusOptions = useMemo(() => {
    if (!employeeCampusMapping) return []
    const campusMap = new Map<string, string>()
    Object.values(employeeCampusMapping).forEach(campusList => {
      campusList.forEach(campus => {
        campusMap.set(campus.campus_id, campus.campus_name)
      })
    })
    return Array.from(campusMap.entries()).map(([id, name]) => ({
      value: id,
      label: name,
    }))
  }, [employeeCampusMapping])

  // 默认部门ID
  const DEFAULT_DEPT_ID = '50EDD867A7C04917B53FA277EE706D08'

  // 账号选项列表
  const accountOptions = useMemo(() => {
    const accounts = accountsData?.items || []
    return accounts.map(acc => ({
      value: acc.id,
      label: acc.company_name || acc.phone,
      deptId: acc.root_dept_id || DEFAULT_DEPT_ID,
    }))
  }, [accountsData])

  const effectiveAccountId = selectedAccountId || accountOptions[0]?.value || ''

  // 当前选中的部门ID
  const departmentId = useMemo(() => {
    if (effectiveAccountId) {
      const selected = accountOptions.find(opt => opt.value === effectiveAccountId)
      return selected?.deptId || DEFAULT_DEPT_ID
    }
    return accountOptions[0]?.deptId || DEFAULT_DEPT_ID
  }, [accountOptions, effectiveAccountId])

  // 获取通话统计数据
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['call-statistics', effectiveAccountId, departmentId, period, statType],
    queryFn: async () => {
      return callRecordsApi.getCallStatistics({
        department_id: departmentId,
        flag: 'department',
        period: parseInt(period),
        stat_type: parseInt(statType),
        account_id: effectiveAccountId || undefined,
      }) as Promise<YunkeCallStatisticsData>
    },
    staleTime: 60 * 1000,
    enabled: !!departmentId && !!effectiveAccountId,
  })

  // 刷新数据
  const handleRefresh = () => {
    refetch()
    Toast.success('已刷新')
  }

  // 处理通话次数数据
  const callCountList = useMemo(() => data?.chart2Counts1 || [], [data])

  // 处理通话时长数据
  const callDurationList = useMemo(() => data?.chart2Counts3 || [], [data])

  // 合并数据用于表格显示
  const mergedUserList = useMemo(() => {
    const countMap = new Map(callCountList.map(item => [item.name, item.value]))
    const durationMap = new Map(callDurationList.map(item => [item.name, item.value]))

    const allNames = new Set([
      ...callCountList.map(item => item.name),
      ...callDurationList.map(item => item.name),
    ])

    let result = Array.from(allNames).map(name => ({
      name,
      callCount: countMap.get(name) || 0,
      duration: durationMap.get(name) || 0,
    }))

    if (selectedCampusId !== 'all' && employeeCampusMapping) {
      result = result.filter(user => {
        const campusList = employeeCampusMapping[user.name] || []
        return campusList.some(campus => campus.campus_id === selectedCampusId)
      })
    }

    return result.sort((a, b) => b.callCount - a.callCount)
  }, [callCountList, callDurationList, selectedCampusId, employeeCampusMapping])

  // 计算总计
  const totals = useMemo(() => {
    const totalCount = mergedUserList.reduce((sum, user) => sum + user.callCount, 0)
    const totalDuration = mergedUserList.reduce((sum, user) => sum + user.duration, 0)
    return { totalCount, totalDuration, userCount: mergedUserList.length }
  }, [mergedUserList])

  // 最大值用于进度条
  const maxCallCount = useMemo(() => Math.max(...mergedUserList.map(user => user.callCount), 1), [mergedUserList])
  const maxDuration = useMemo(() => Math.max(...mergedUserList.map(user => user.duration), 1), [mergedUserList])

  // 表格列
  const columns = useMemo<ColumnProps<MergedUser>[]>(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 64,
      align: 'center' as const,
      render: (_: unknown, __: MergedUser, index: number) => {
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
        if (index === 0) Object.assign(rankStyle, { background: '#FEF3C7', color: '#A16207' })
        else if (index === 1) Object.assign(rankStyle, { background: '#F3F4F6', color: '#374151' })
        else if (index === 2) Object.assign(rankStyle, { background: '#FFEDD5', color: '#C2410C' })
        else Object.assign(rankStyle, { color: 'var(--semi-color-text-2)' })
        return <span style={rankStyle}>{index + 1}</span>
      },
    },
    {
      title: '员工姓名',
      dataIndex: 'name',
      width: 128,
      render: (t: string) => <span style={{ fontWeight: 500 }}>{t}</span>,
    },
    {
      title: '通话次数',
      dataIndex: 'callCount',
      width: 128,
      align: 'right' as const,
      render: (val: number) => <span style={{ fontFamily: 'monospace' }}>{val.toLocaleString()}</span>,
    },
    {
      title: '次数分布',
      dataIndex: 'countDist',
      render: (_: unknown, record: MergedUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={(record.callCount / maxCallCount) * 100} size="small" showInfo={false} style={{ flex: 1 }} />
          <span style={{ width: 48, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            {totals.totalCount > 0 ? ((record.callCount / totals.totalCount) * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
      ),
    },
    {
      title: '通话时长',
      dataIndex: 'duration',
      width: 128,
      align: 'right' as const,
      render: (val: number) => <span style={{ fontFamily: 'monospace' }}>{formatDurationShort(val)}</span>,
    },
    {
      title: '时长分布',
      dataIndex: 'durationDist',
      render: (_: unknown, record: MergedUser) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress percent={(record.duration / maxDuration) * 100} size="small" showInfo={false} style={{ flex: 1 }} />
          <span style={{ width: 48, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
            {totals.totalDuration > 0 ? ((record.duration / totals.totalDuration) * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
      ),
    },
  ], [maxCallCount, maxDuration, totals])

  return (
    <>
      <DataTableLayout
        title="咨询数据统计"
        total={totals.totalCount}
        onRefresh={handleRefresh}
        isRefreshing={isRefetching}
        toolbar={
          <>
            {/* 顶部统计栏 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 14 }}>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Skeleton.Avatar size="small" style={{ width: 32, height: 32 }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <Skeleton.Paragraph rows={1} style={{ width: 48 }} />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${brandColors.blue}15`,
                    }}>
                      <Phone style={{ width: 16, height: 16, color: brandColors.blue }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 600 }}>{totals.totalCount.toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>总通话次数</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${brandColors.green}15`,
                    }}>
                      <Clock style={{ width: 16, height: 16, color: brandColors.green }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 600 }}>{formatDuration(totals.totalDuration)}</span>
                      <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>总通话时长</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: `${brandColors.orange}15`,
                    }}>
                      <Users style={{ width: 16, height: 16, color: brandColors.orange }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 600 }}>{totals.userCount}</span>
                      <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>参与员工数</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 工具栏 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Select
                value={effectiveAccountId || undefined}
                onChange={(val) => setSelectedAccountId(val as string)}
                optionList={accountOptions}
                placeholder="选择云客账号"
                style={{ width: 160 }}
              />
              <Select
                value={selectedCampusId}
                onChange={(val) => setSelectedCampusId(val as string)}
                optionList={[{ value: 'all', label: '全部校区' }, ...campusOptions]}
                prefix={<Building2 style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />}
                style={{ width: 128 }}
              />
              <Select
                value={period}
                onChange={(val) => setPeriod(val as string)}
                optionList={periodOptions}
                style={{ width: 112 }}
              />
              <Select
                value={statType}
                onChange={(val) => setStatType(val as string)}
                optionList={statTypeOptions}
                style={{ width: 112 }}
              />
            </div>
          </>
        }
      >
        <div ref={wrapperRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Table
            columns={columns}
            dataSource={mergedUserList}
            rowKey="name"
            pagination={false}
            scroll={{ y: scrollY }}
            loading={isLoading}
            empty={<div style={{ padding: 64, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无数据</div>}
          />
        </div>
      </DataTableLayout>
    </>
  )
}

export default ConsultingStatisticsPage
