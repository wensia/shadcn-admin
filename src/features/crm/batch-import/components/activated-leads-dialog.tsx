/**
 * 激活线索弹窗
 * 从 frontend-vue/src/components/crm/ActivatedLeadsModal.vue 迁移
 */

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { batchImportApi } from '../api'
import type { BatchImportItem, ActivatedLeadItem } from '../types'

interface ActivatedLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: BatchImportItem | null
}

// 电话号码脱敏
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

export function ActivatedLeadsDialog({ open, onOpenChange, batch }: ActivatedLeadsDialogProps) {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })

  // 重置分页状态
  useEffect(() => {
    if (open && batch) {
      setPagination({ page: 1, pageSize: 20 })
    }
  }, [open, batch])

  // 获取激活线索列表
  const { data, isLoading } = useQuery({
    queryKey: ['batch-import-activated-leads', batch?.id, pagination],
    queryFn: () => batchImportApi.getActivatedLeads(batch!.id, {
      page: pagination.page,
      page_size: pagination.pageSize,
    }),
    enabled: !!batch && open,
  })

  const leadsList = data?.data?.items || []
  const totalCount = data?.data?.total || 0

  // 下载激活线索
  const handleDownload = useCallback(async () => {
    if (!batch) return

    try {
      const blob = await batchImportApi.downloadActivatedLeads(batch.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `激活线索_${batch.batch_name}.xlsx`
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
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>激活线索 - {batch.batch_name}</span>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              下载激活线索
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* 激活线索表格 */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[60px]">行号</TableHead>
                <TableHead className="w-[100px]">孩子姓名</TableHead>
                <TableHead className="w-[100px]">家长姓名</TableHead>
                <TableHead className="w-[120px]">家长电话</TableHead>
                <TableHead className="w-[80px]">年级</TableHead>
                <TableHead className="w-[100px]">意向课程</TableHead>
                <TableHead className="w-[100px]">课程顾问</TableHead>
                <TableHead className="w-[100px]">所属校区</TableHead>
                <TableHead className="w-[140px]">激活时间</TableHead>
                <TableHead className="w-[160px]">变更信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : leadsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    暂无激活线索
                  </TableCell>
                </TableRow>
              ) : (
                leadsList.map((item: ActivatedLeadItem) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.row_number}</TableCell>
                    <TableCell>{item.child_name || '-'}</TableCell>
                    <TableCell>{item.parent_name || '-'}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{maskPhone(item.parent_phone)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>完整号码已脱敏处理</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{item.grade || '-'}</TableCell>
                    <TableCell>{item.intended_course || '-'}</TableCell>
                    <TableCell>{item.advisor_name || '-'}</TableCell>
                    <TableCell>{item.campus_name || '-'}</TableCell>
                    <TableCell>
                      {item.activated_at
                        ? format(new Date(item.activated_at), 'yyyy-MM-dd HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.status_change && (
                          <Badge variant="outline" className="text-xs">
                            状态: {item.status_change}
                          </Badge>
                        )}
                        {item.campus_change && (
                          <Badge variant="outline" className="text-xs">
                            校区: {item.campus_change}
                          </Badge>
                        )}
                        {item.advisor_change && (
                          <Badge variant="outline" className="text-xs">
                            顾问: {item.advisor_change}
                          </Badge>
                        )}
                        {!item.status_change && !item.campus_change && !item.advisor_change && '-'}
                      </div>
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
            共 {totalCount} 条激活线索
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
