/**
 * 日控报表 Tab
 * 展示每个课程顾问的诺到、到访、缴费统计
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { getDailyControlReport, type AdvisorDailyControlStats } from '../api'
import { brandColors } from '../theme'

// 获取校区列表的 API
import { apiClient } from '@/lib/api/client'

interface ReportTabProps {
  dateFrom?: string
  dateTo?: string
}

export function ReportTab({ dateFrom, dateTo }: ReportTabProps) {
  const s = useStyleClasses()
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all')

  // 获取校区列表
  const { data: campusesData } = useQuery({
    queryKey: ['campuses-for-report'],
    queryFn: async () => {
      const response = await apiClient.get('/organization/campuses/simple')
      return response.data || []
    },
  })

  const campuses = campusesData || []

  // 获取报表数据
  const { data: reportData, isLoading, isError } = useQuery({
    queryKey: ['daily-control-report', selectedCampusId, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | undefined> = {
        date_from: dateFrom,
        date_to: dateTo,
      }
      if (selectedCampusId && selectedCampusId !== 'all') {
        params.campus_id = selectedCampusId
      }
      return getDailyControlReport(params)
    },
  })

  const stats = reportData?.stats || []
  const summary = {
    totalAdvisors: reportData?.total_advisors || 0,
    totalPromised: reportData?.total_promised || 0,
    totalVisited: reportData?.total_visited || 0,
    totalPaymentCount: reportData?.total_payment_count || 0,
    totalPaymentAmount: reportData?.total_payment_amount || 0,
  }

  // 计算到访率
  const getVisitRate = (promised: number, visited: number) => {
    const total = promised + visited
    if (total === 0) return '-'
    return `${Math.round((visited / total) * 100)}%`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="rounded-lg border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        加载失败，请重试
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={cn(s.text.sm, 'text-muted-foreground')}>校区：</span>
            <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="全部校区" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部校区</SelectItem>
                {campuses.map((campus: { id: string; name: string }) => (
                  <SelectItem key={campus.id} value={campus.id}>
                    {campus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 汇总统计 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={cn(s.text.xs, 'text-muted-foreground')}>顾问数</span>
            <span className={cn(s.text.sm, 'font-semibold')}>{summary.totalAdvisors}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(s.text.xs)}
              style={{ color: brandColors.orange }}
            >
              诺到
            </span>
            <span className={cn(s.text.sm, 'font-semibold')}>{summary.totalPromised}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(s.text.xs)}
              style={{ color: brandColors.blue }}
            >
              到访
            </span>
            <span className={cn(s.text.sm, 'font-semibold')}>{summary.totalVisited}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(s.text.xs)}
              style={{ color: brandColors.green }}
            >
              缴费
            </span>
            <span className={cn(s.text.sm, 'font-semibold')}>{summary.totalPaymentCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(s.text.xs, 'text-muted-foreground')}>金额</span>
            <span className={cn(s.text.sm, 'font-semibold text-orange-600')}>
              ¥{Number(summary.totalPaymentAmount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className={cn(s.text.xs, 'font-semibold w-[120px]')}>顾问姓名</TableHead>
              <TableHead className={cn(s.text.xs, 'font-semibold w-[120px]')}>所属校区</TableHead>
              <TableHead className={cn(s.text.xs, 'font-semibold w-[80px] text-center')}>
                <span style={{ color: brandColors.orange }}>诺到</span>
              </TableHead>
              <TableHead className={cn(s.text.xs, 'font-semibold w-[80px] text-center')}>
                <span style={{ color: brandColors.blue }}>到访</span>
              </TableHead>
              <TableHead className={cn(s.text.xs, 'font-semibold w-[80px] text-center')}>到访率</TableHead>
              <TableHead className={cn(s.text.xs, 'font-semibold w-[80px] text-center')}>
                <span style={{ color: brandColors.green }}>缴费笔数</span>
              </TableHead>
              <TableHead className={cn(s.text.xs, 'font-semibold w-[120px] text-right')}>缴费金额</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              stats.map((row: AdvisorDailyControlStats) => (
                <TableRow key={row.advisor_id} className="hover:bg-muted/30">
                  <TableCell className={cn(s.text.sm, 'font-medium')}>
                    {row.advisor_name}
                  </TableCell>
                  <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                    {row.campus_name || '-'}
                  </TableCell>
                  <TableCell className={cn(s.text.sm, 'text-center font-medium')}>
                    <span style={{ color: row.promised_count > 0 ? brandColors.orange : undefined }}>
                      {row.promised_count}
                    </span>
                  </TableCell>
                  <TableCell className={cn(s.text.sm, 'text-center font-medium')}>
                    <span style={{ color: row.visited_count > 0 ? brandColors.blue : undefined }}>
                      {row.visited_count}
                    </span>
                  </TableCell>
                  <TableCell className={cn(s.text.xs, 'text-center text-muted-foreground')}>
                    {getVisitRate(row.promised_count, row.visited_count)}
                  </TableCell>
                  <TableCell className={cn(s.text.sm, 'text-center font-medium')}>
                    <span style={{ color: row.payment_count > 0 ? brandColors.green : undefined }}>
                      {row.payment_count}
                    </span>
                  </TableCell>
                  <TableCell className={cn(s.text.sm, 'text-right font-medium')}>
                    {row.payment_amount > 0 ? (
                      <span className="text-orange-600">
                        ¥{Number(row.payment_amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
