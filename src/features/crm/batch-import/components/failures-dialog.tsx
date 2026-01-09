/**
 * 失败记录弹窗
 * 从 frontend-vue/src/views/crm/BatchImportView.vue 迁移
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { batchImportApi } from '../api'
import type { BatchImportItem, ImportFailureItem, FailureType } from '../types'
import { failureTypeLabels } from '../types'

interface FailuresDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: BatchImportItem | null
}

// 失败类型样式
const failureTypeVariants: Record<FailureType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  duplicate: 'secondary',
  duplicate_in_file: 'secondary',
  validation_error: 'destructive',
  system_error: 'destructive',
  database_error: 'destructive',
  format_error: 'outline',
  permission_error: 'destructive',
  other: 'outline',
  unknown: 'outline',
}

// 格式化日期时间
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\//g, '/')
  } catch {
    return '-'
  }
}

export function FailuresDialog({ open, onOpenChange, batch }: FailuresDialogProps) {
  const s = useStyleClasses()
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })

  // 重置分页状态
  useEffect(() => {
    if (open && batch) {
      setPagination({ page: 1, pageSize: 20 })
    }
  }, [open, batch])

  // 获取失败记录列表（包含 type_counts）
  const { data: failuresData, isLoading: loadingFailures } = useQuery({
    queryKey: ['batch-import-failures', batch?.id, pagination],
    queryFn: () => batchImportApi.getFailureList(batch!.id, {
      page: pagination.page,
      page_size: pagination.pageSize,
    }),
    enabled: !!batch && open,
  })

  const failureList = failuresData?.data?.items || []
  const totalCount = failuresData?.data?.total || 0
  const typeCounts = failuresData?.data?.type_counts || {}

  // 下载失败记录
  const handleDownload = useCallback(async () => {
    if (!batch) return

    try {
      const blob = await batchImportApi.downloadFailures(batch.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `失败记录_${batch.batch_name}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('下载成功')
    } catch (error: unknown) {
      toast.error((error as Error).message || '下载失败')
    }
  }, [batch])

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>失败记录 - {batch.batch_name}</span>
            <Button variant="outline" size="sm" className={s.height.controlSm} onClick={handleDownload}>
              <Download className={cn("mr-2", s.size.icon)} />
              下载失败记录
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* 失败类型统计 */}
        {Object.keys(typeCounts).length > 0 && (
          <div className={cn("flex flex-wrap pb-3 border-b shrink-0", s.gap.tight)}>
            {Object.entries(typeCounts).map(([type, count]) => (
              <Badge
                key={type}
                variant={failureTypeVariants[type as FailureType] || 'outline'}
                className={cn(s.height.badge, s.text.xs, s.gap.tight)}
              >
                {failureTypeLabels[type as FailureType] || type}
                <span className="font-bold">{count}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* 失败记录表格 */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[60px]">行号</TableHead>
                <TableHead className="w-[100px]">孩子姓名</TableHead>
                <TableHead className="w-[120px]">家长电话</TableHead>
                <TableHead className="w-[90px]">失败类型</TableHead>
                <TableHead className="min-w-[200px]">失败原因</TableHead>
                <TableHead className="w-[150px]">线索创建时间</TableHead>
                <TableHead className="w-[150px]">上次导入时间</TableHead>
                <TableHead className="w-[150px]">上次激活时间</TableHead>
                <TableHead className="w-[150px]">上次回访时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingFailures ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : failureList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    暂无失败记录
                  </TableCell>
                </TableRow>
              ) : (
                failureList.map((item: ImportFailureItem) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.row_number}</TableCell>
                    <TableCell>{item.child_name || '-'}</TableCell>
                    <TableCell>{item.parent_phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={failureTypeVariants[item.failure_type] || 'outline'}>
                        {failureTypeLabels[item.failure_type] || item.failure_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {item.failure_reason}
                        {item.failure_type === 'duplicate_in_file' && item.duplicate_count_in_batch && (
                          <span className="ml-2 text-orange-500">
                            (文件内重复 {item.duplicate_count_in_batch} 次)
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(item.existing_lead_created_at)}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(item.existing_lead_last_import_time)}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(item.existing_lead_activated_at)}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(item.existing_lead_last_followup_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="border-t pt-3 flex items-center justify-between shrink-0">
          <span className={cn("text-muted-foreground", s.text.xs)}>
            共 {totalCount} 条失败记录
          </span>
          <div className={cn("flex items-center", s.gap.tight)}>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => setPagination((p) => ({ ...p, pageSize: Number(v), page: 1 }))}
            >
              <SelectTrigger className={cn("w-[100px]", s.height.controlSm)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className={s.height.controlSm}
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                上一页
              </Button>
              <span className={cn("px-2", s.text.xs)}>
                第 {pagination.page} 页 / 共 {Math.ceil(totalCount / pagination.pageSize) || 1} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                className={s.height.controlSm}
                disabled={pagination.page >= Math.ceil(totalCount / pagination.pageSize)}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
