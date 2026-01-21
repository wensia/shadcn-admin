/**
 * 云客通话记录列表组件
 * 用于在线索详情中展示该线索的通话记录
 */

import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Phone, PhoneIncoming, PhoneOff, PhoneOutgoing } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { callRecordsApi } from '@/features/yunke/api'
import type { YunkeCallLogItem } from '@/features/yunke/types'

interface YunkeCallLogsProps {
  /** 电话号码 */
  phone: string
  /** 自定义类名 */
  className?: string
}

/**
 * 格式化通话时长
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '-'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

/**
 * 格式化时间
 */
function formatTime(timeStr: string): string {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return timeStr
  }
}

/**
 * 获取通话类型图标和标签
 * @param incomingCall 0=外呼, 1=呼入
 */
function getCallTypeInfo(incomingCall: number) {
  if (incomingCall === 0) {
    return { icon: PhoneOutgoing, label: '外呼', color: 'text-blue-500' }
  }
  if (incomingCall === 1) {
    return { icon: PhoneIncoming, label: '呼入', color: 'text-green-500' }
  }
  return { icon: Phone, label: '-', color: 'text-muted-foreground' }
}

/**
 * 获取通话结果样式
 * @param callStatus 0=未接通, 2=已接通
 * @param callSeconds 通话时长（秒）
 */
function getCallResultStyle(callStatus: number, callSeconds: number) {
  if (callStatus === 2 || callSeconds > 0) {
    return { label: '已接通', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-500/80' }
  }
  return { label: '未接通', variant: 'secondary' as const, className: '' }
}

export function YunkeCallLogs({ phone, className }: YunkeCallLogsProps) {
  const s = useStyleClasses()

  // 查询通话记录
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['yunke-call-logs', phone],
    queryFn: () => callRecordsApi.searchByPhone({ phone, size: 20 }),
    enabled: !!phone,
    staleTime: 30 * 1000, // 30秒内不重新请求
  })

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4', className)}>
        查询失败: {(error as Error)?.message || '未知错误'}
      </div>
    )
  }

  if (!data?.items?.length) {
    return (
      <div className={cn(s.text.xs, 'text-muted-foreground text-center py-4', className)}>
        暂无通话记录
      </div>
    )
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={cn(s.text.xs, 'w-[100px]')}>通话时间</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[60px]')}>类型</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[70px]')}>结果</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[70px]')}>时长</TableHead>
            <TableHead className={cn(s.text.xs, 'w-[80px]')}>员工</TableHead>
            <TableHead className={cn(s.text.xs)}>部门</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item: YunkeCallLogItem) => {
            const typeInfo = getCallTypeInfo(item.incomingCall)
            const resultStyle = getCallResultStyle(item.callStatus, item.callSeconds)
            const TypeIcon = typeInfo.icon
            const hasAnswer = item.callSeconds > 0

            return (
              <TableRow key={item.id}>
                <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                  {formatTime(item.startCallTime)}
                </TableCell>
                <TableCell className={s.text.xs}>
                  <div className="flex items-center gap-1">
                    <TypeIcon className={cn('h-3 w-3', typeInfo.color)} />
                    <span>{typeInfo.label}</span>
                  </div>
                </TableCell>
                <TableCell className={s.text.xs}>
                  <Badge
                    variant={resultStyle.variant}
                    className={cn(s.text.xs, s.roundedBadge, s.height.badge, resultStyle.className)}
                  >
                    {resultStyle.label}
                  </Badge>
                </TableCell>
                <TableCell className={s.text.xs}>
                  <div className="flex items-center gap-1">
                    {hasAnswer ? (
                      <Phone className="h-3 w-3 text-green-500" />
                    ) : (
                      <PhoneOff className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className={hasAnswer ? 'text-green-600' : 'text-muted-foreground'}>
                      {formatDuration(item.callSeconds)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={s.text.xs}>
                  {item.userIdName || '-'}
                </TableCell>
                <TableCell className={cn(s.text.xs, 'text-muted-foreground')}>
                  {item.departmentList !== '该部门不存在' ? item.departmentList : '-'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {data.total > 20 && (
        <div className={cn(s.text.xs, 'text-muted-foreground text-center py-2 border-t')}>
          共 {data.total} 条记录，仅显示最近 20 条
        </div>
      )}
    </div>
  )
}
