/**
 * 通话记录表格列定义
 */

import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Play, FileText, Phone, PhoneOff } from 'lucide-react'
import { isSkeletonRow } from '@/components/ui/table-skeleton'
import { formatTime } from '@/lib/utils/time'
import type { CallRecord } from '../../types'

/**
 * 格式化通话时长
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '-'

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

/**
 * 获取通话类型标签
 */
function getCallTypeLabel(type: string | null): { label: string; variant: 'default' | 'secondary' } {
  switch (type) {
    case 's':
    case 'outbound':
      return { label: '外呼', variant: 'default' }
    case 'i':
    case 'inbound':
      return { label: '呼入', variant: 'secondary' }
    default:
      return { label: type || '-', variant: 'secondary' }
  }
}

/**
 * 获取通话结果样式
 */
function getCallResultStyle(result: string | null, duration: number | null): {
  label: string
  variant: 'default' | 'success' | 'secondary' | 'destructive'
} {
  // 如果有通话时长，说明接通了
  if (duration && duration > 0) {
    return { label: '已接通', variant: 'success' }
  }

  // 根据结果判断
  switch (result?.toLowerCase()) {
    case 'answered':
    case '接通':
      return { label: '已接通', variant: 'success' }
    case 'noanswer':
    case '未接听':
      return { label: '未接听', variant: 'secondary' }
    case 'busy':
    case '占线':
      return { label: '占线', variant: 'secondary' }
    case 'rejected':
    case '拒接':
      return { label: '拒接', variant: 'destructive' }
    default:
      return { label: result || '未知', variant: 'secondary' }
  }
}

interface CreateColumnsOptions {
  onPlayRecord?: (record: CallRecord) => void
  onViewTranscript?: (record: CallRecord) => void
}

export function createCallRecordsColumns(options: CreateColumnsOptions = {}): ColumnDef<CallRecord>[] {
  const { onPlayRecord, onViewTranscript } = options

  return [
    {
      accessorKey: 'call_time',
      header: '通话时间',
      size: 150,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-4 w-28" />
        }
        return (
          <span className="text-sm whitespace-nowrap">
            {formatTime(row.original.call_time)}
          </span>
        )
      },
    },
    {
      accessorKey: 'staff_name',
      header: '员工',
      size: 100,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-4 w-16" />
        }
        return (
          <span className="font-medium">
            {row.original.staff_name || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: 'callee',
      header: '客户号码',
      size: 130,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-4 w-24" />
        }
        return (
          <span className="font-mono text-sm">
            {row.original.callee || row.original.caller || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: 'customer_name',
      header: '客户名称',
      size: 100,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-4 w-20" />
        }
        return row.original.customer_name || '-'
      },
    },
    {
      accessorKey: 'call_type',
      header: '类型',
      size: 80,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-5 w-12 rounded-full" />
        }
        const { label, variant } = getCallTypeLabel(row.original.call_type)
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      accessorKey: 'duration',
      header: '时长',
      size: 90,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-4 w-16" />
        }
        const duration = row.original.duration
        const hasAnswer = duration && duration > 0

        return (
          <div className="flex items-center gap-1.5">
            {hasAnswer ? (
              <Phone className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <PhoneOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={hasAnswer ? 'text-green-600' : 'text-muted-foreground'}>
              {formatDuration(duration)}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'call_result',
      header: '结果',
      size: 90,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-5 w-14 rounded-full" />
        }
        const { label, variant } = getCallResultStyle(row.original.call_result, row.original.duration)
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      accessorKey: 'department',
      header: '部门',
      size: 100,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-4 w-20" />
        }
        return (
          <span className="text-sm text-muted-foreground">
            {row.original.department || '-'}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '操作',
      size: 100,
      cell: ({ row }) => {
        if (isSkeletonRow(row.original.id)) {
          return <Skeleton className="h-8 w-16" />
        }

        const record = row.original
        const hasRecording = record.has_recording
        const hasTranscript = record.transcript && record.transcript.length > 0

        return (
          <div className="flex items-center gap-1">
            {hasRecording && onPlayRecord && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPlayRecord(record)}
                title="播放录音"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            {hasTranscript && onViewTranscript && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewTranscript(record)}
                title="查看转写"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            {!hasRecording && !hasTranscript && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        )
      },
    },
  ]
}
