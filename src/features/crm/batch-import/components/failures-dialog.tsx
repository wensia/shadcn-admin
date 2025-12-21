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

export function FailuresDialog({ open, onOpenChange, batch }: FailuresDialogProps) {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })

  // 重置分页状态
  useEffect(() => {
    if (open && batch) {
      setPagination({ page: 1, pageSize: 20 })
    }
  }, [open, batch])

  // 获取失败记录列表
  const { data: failuresData, isLoading: loadingFailures } = useQuery({
    queryKey: ['batch-import-failures', batch?.id, pagination],
    queryFn: () => batchImportApi.getFailureList(batch!.id, {
      page: pagination.page,
      page_size: pagination.pageSize,
    }),
    enabled: !!batch && open,
  })

  // 获取失败类型统计
  const { data: typeCountsData } = useQuery({
    queryKey: ['batch-import-failure-types', batch?.id],
    queryFn: () => batchImportApi.getFailureTypeCounts(batch!.id),
    enabled: !!batch && open,
  })

  const failureList = failuresData?.data?.items || []
  const totalCount = failuresData?.data?.total || 0
  const typeCounts = typeCountsData?.data || {}

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
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>失败记录 - {batch.batch_name}</span>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              下载失败记录
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* 失败类型统计 */}
        {Object.keys(typeCounts).length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3 border-b shrink-0">
            {Object.entries(typeCounts).map(([type, count]) => (
              <Badge
                key={type}
                variant={failureTypeVariants[type as FailureType] || 'outline'}
                className="gap-1"
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
                <TableHead className="w-[80px]">行号</TableHead>
                <TableHead className="w-[120px]">孩子姓名</TableHead>
                <TableHead className="w-[140px]">家长电话</TableHead>
                <TableHead className="w-[100px]">失败类型</TableHead>
                <TableHead>失败原因</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingFailures ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : failureList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
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
                        {item.failure_type === 'duplicate' && item.existing_lead_created_at && (
                          <span className="ml-2 text-blue-500">
                            (已存在于系统，创建于 {item.existing_lead_created_at})
                          </span>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="border-t pt-3 flex items-center justify-between shrink-0">
          <span className="text-sm text-muted-foreground">
            共 {totalCount} 条失败记录
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => setPagination((p) => ({ ...p, pageSize: Number(v), page: 1 }))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} 条/页
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                上一页
              </Button>
              <span className="px-2 text-sm">
                第 {pagination.page} 页 / 共 {Math.ceil(totalCount / pagination.pageSize) || 1} 页
              </span>
              <Button
                variant="outline"
                size="sm"
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
