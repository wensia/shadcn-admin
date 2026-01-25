/**
 * 咨询数据统计页面
 * 展示通话统计数据，包括统计卡片和员工通话明细表格
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Phone,
  Clock,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { brandColors } from '@/features/crm/daily-control/theme'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { callRecordsApi, yunkeCredentialsApi, type EmployeeCampusMapping } from '@/features/yunke/api'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'

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

export function ConsultingStatisticsPage() {
  useDocumentTitle('咨询数据统计')

  // 筛选条件
  const [period, setPeriod] = useState('0')
  const [statType, setStatType] = useState('0')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')

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

  // 默认部门ID（当账号没有 root_dept_id 时使用）
  const DEFAULT_DEPT_ID = '50EDD867A7C04917B53FA277EE706D08'

  // 账号选项列表
  const accountOptions = useMemo(() => {
    const accounts = accountsData?.items || []
    return accounts.map(acc => ({
      value: acc.id,
      label: acc.company_name || acc.phone,
      deptId: acc.root_dept_id || DEFAULT_DEPT_ID, // 使用默认值
    }))
  }, [accountsData])

  // 当前选中的部门ID
  const departmentId = useMemo(() => {
    if (selectedAccountId) {
      const selected = accountOptions.find(opt => opt.value === selectedAccountId)
      return selected?.deptId || DEFAULT_DEPT_ID
    }
    // 默认使用第一个账号的部门ID，或默认值
    return accountOptions[0]?.deptId || DEFAULT_DEPT_ID
  }, [selectedAccountId, accountOptions])

  // 自动选择第一个账号
  useEffect(() => {
    if (!selectedAccountId && accountOptions.length > 0) {
      setSelectedAccountId(accountOptions[0].value)
    }
  }, [accountOptions, selectedAccountId])

  // 获取通话统计数据
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['call-statistics', selectedAccountId, departmentId, period, statType],
    queryFn: async () => {
      return callRecordsApi.getCallStatistics({
        department_id: departmentId,
        flag: 'department',
        period: parseInt(period),
        stat_type: parseInt(statType),
        account_id: selectedAccountId || undefined, // 传递选中的账号ID
      }) as Promise<YunkeCallStatisticsData>
    },
    staleTime: 60 * 1000,
    enabled: !!departmentId && !!selectedAccountId, // 只有选择了部门和账号才查询
  })

  // 刷新数据
  const handleRefresh = () => {
    refetch()
    toast.success('已刷新')
  }

  // 处理通话次数数据（chart2Counts1）
  const callCountList = useMemo(() => {
    return data?.chart2Counts1 || []
  }, [data])

  // 处理通话时长数据（chart2Counts3）
  const callDurationList = useMemo(() => {
    return data?.chart2Counts3 || []
  }, [data])

  // 合并数据用于表格显示
  const mergedUserList = useMemo(() => {
    const countMap = new Map(callCountList.map(item => [item.name, item.value]))
    const durationMap = new Map(callDurationList.map(item => [item.name, item.value]))

    // 获取所有员工名称
    const allNames = new Set([
      ...callCountList.map(item => item.name),
      ...callDurationList.map(item => item.name),
    ])

    // 合并数据
    let result = Array.from(allNames).map(name => ({
      name,
      callCount: countMap.get(name) || 0,
      duration: durationMap.get(name) || 0,
    }))

    // 根据校区过滤
    if (selectedCampusId !== 'all' && employeeCampusMapping) {
      result = result.filter(user => {
        const campusList = employeeCampusMapping[user.name] || []
        return campusList.some(campus => campus.campus_id === selectedCampusId)
      })
    }

    // 按通话次数排序
    return result.sort((a, b) => b.callCount - a.callCount)
  }, [callCountList, callDurationList, selectedCampusId, employeeCampusMapping])

  // 计算总计（基于过滤后的数据）
  const totals = useMemo(() => {
    const totalCount = mergedUserList.reduce((sum, user) => sum + user.callCount, 0)
    const totalDuration = mergedUserList.reduce((sum, user) => sum + user.duration, 0)
    return { totalCount, totalDuration, userCount: mergedUserList.length }
  }, [mergedUserList])

  // 最大值用于进度条（基于过滤后的数据）
  const maxCallCount = useMemo(() => {
    return Math.max(...mergedUserList.map(user => user.callCount), 1)
  }, [mergedUserList])

  const maxDuration = useMemo(() => {
    return Math.max(...mergedUserList.map(user => user.duration), 1)
  }, [mergedUserList])

  return (
    <Main fixed className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* 顶部统计栏 - 紧凑内联样式 */}
        <div className="flex-shrink-0 flex items-center gap-6">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex items-baseline gap-1.5">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${brandColors.blue}15` }}
                >
                  <Phone className="w-4 h-4" style={{ color: brandColors.blue }} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-[#141413] dark:text-slate-100">
                    {totals.totalCount.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#b0aea5] dark:text-slate-400">
                    总通话次数
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${brandColors.green}15` }}
                >
                  <Clock className="w-4 h-4" style={{ color: brandColors.green }} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-[#141413] dark:text-slate-100">
                    {formatDuration(totals.totalDuration)}
                  </span>
                  <span className="text-xs text-[#b0aea5] dark:text-slate-400">
                    总通话时长
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${brandColors.orange}15` }}
                >
                  <Users className="w-4 h-4" style={{ color: brandColors.orange }} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-[#141413] dark:text-slate-100">
                    {totals.userCount}
                  </span>
                  <span className="text-xs text-[#b0aea5] dark:text-slate-400">
                    参与员工数
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 工具栏 */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
          {/* 云客账号筛选 */}
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择云客账号" />
            </SelectTrigger>
            <SelectContent>
              {accountOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 校区筛选 */}
          <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
            <SelectTrigger className="w-32">
              <Building2 className="mr-1.5 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="选择校区" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部校区</SelectItem>
              {campusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 时间周期筛选 */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="时间周期" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 统计类型筛选 */}
          <Select value={statType} onValueChange={setStatType}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="统计类型" />
            </SelectTrigger>
            <SelectContent>
              {statTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            刷新
          </Button>
        </div>

        {/* 员工通话统计表格 */}
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/50">
                  <TableRow>
                    <TableHead className="w-16 text-center">排名</TableHead>
                    <TableHead className="w-32">员工姓名</TableHead>
                    <TableHead className="w-32 text-right">通话次数</TableHead>
                    <TableHead className="min-w-[200px]">次数分布</TableHead>
                    <TableHead className="w-32 text-right">通话时长</TableHead>
                    <TableHead className="min-w-[200px]">时长分布</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : mergedUserList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    mergedUserList.map((user, index) => (
                      <TableRow key={user.name}>
                        <TableCell className="text-center">
                          <span className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                            index === 0 && 'bg-yellow-100 text-yellow-700',
                            index === 1 && 'bg-gray-100 text-gray-700',
                            index === 2 && 'bg-orange-100 text-orange-700',
                            index > 2 && 'text-muted-foreground'
                          )}>
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {user.callCount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(user.callCount / maxCallCount) * 100}
                              className="h-2"
                            />
                            <span className="w-12 text-xs text-muted-foreground">
                              {((user.callCount / totals.totalCount) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatDurationShort(user.duration)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={(user.duration / maxDuration) * 100}
                              className="h-2"
                            />
                            <span className="w-12 text-xs text-muted-foreground">
                              {((user.duration / totals.totalDuration) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}

export default ConsultingStatisticsPage
