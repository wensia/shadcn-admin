/**
 * 线索选择弹窗组件
 * 用于在新建到访/缴费记录时选择线索
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RefreshCw, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { leadsApi } from '@/features/crm/leads/api'
import type { LeadListItem } from '@/features/crm/leads/types'
import { leadStatusLabels } from '@/features/crm/leads/types'

export interface SelectedLead {
  id: string
  child_name: string
  parent_phone: string
}

interface LeadSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (lead: SelectedLead) => void
  title?: string
  description?: string
}

export function LeadSelectDialog({
  open,
  onOpenChange,
  onSelect,
  title = '选择线索',
  description = '请选择一条线索'
}: LeadSelectDialogProps) {
  // 状态
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null)
  const [searchText, setSearchText] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 8

  // 获取线索列表
  const { data: leadData, isLoading, refetch } = useQuery({
    queryKey: ['leads-for-select', page, pageSize, searchText],
    queryFn: async () => {
      const response = await leadsApi.getLeads({
        page,
        size: pageSize,
        search: searchText || undefined
      })
      return response.data
    },
    enabled: open
  })

  // 弹框关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSelectedLead(null)
      setSearchText('')
      setPage(1)
    }
  }, [open])

  // 搜索时重置页码
  useEffect(() => {
    setPage(1)
  }, [searchText])

  const handleRefresh = () => {
    setSearchText('')
    setPage(1)
    refetch()
  }

  const handleSelectLead = (lead: LeadListItem) => {
    if (selectedLead?.id === lead.id) {
      setSelectedLead(null)
    } else {
      setSelectedLead(lead)
    }
  }

  const handleConfirm = () => {
    if (selectedLead) {
      onSelect({
        id: selectedLead.id,
        child_name: selectedLead.child_name || '',
        parent_phone: selectedLead.parent_phone || ''
      })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* 搜索栏 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">搜索</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="输入姓名或手机号搜索"
                  className="h-8 text-xs pl-8 w-56"
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              title="刷新"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* 线索表格 */}
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-14 text-xs text-center">选择</TableHead>
                  <TableHead className="w-24 text-xs">学生姓名</TableHead>
                  <TableHead className="w-32 text-xs">联系电话</TableHead>
                  <TableHead className="w-20 text-xs">年级</TableHead>
                  <TableHead className="w-24 text-xs">状态</TableHead>
                  <TableHead className="w-24 text-xs">课程顾问</TableHead>
                  <TableHead className="text-xs">备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : leadData?.items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      暂无线索数据
                    </TableCell>
                  </TableRow>
                ) : (
                  leadData?.items?.map((lead) => {
                    const isSelected = selectedLead?.id === lead.id
                    return (
                      <TableRow
                        key={lead.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-primary/5'
                        )}
                        onClick={() => handleSelectLead(lead)}
                      >
                        <TableCell className="text-center">
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 mx-auto flex items-center justify-center transition-colors',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/30'
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell className={cn('text-xs', isSelected && 'font-semibold text-primary')}>
                          {lead.child_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.parent_phone || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.grade || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs h-5">
                            {leadStatusLabels[lead.status] || lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {lead.advisor_name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {lead.remark || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* 分页 */}
          <div className="flex items-center justify-center gap-4 shrink-0 pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              共 {leadData?.total || 0} 条线索
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </Button>
              <span className="text-xs px-2">
                第 {page} / {Math.max(1, Math.ceil((leadData?.total || 0) / pageSize))} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                disabled={page >= Math.ceil((leadData?.total || 0) / pageSize)}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
            className="h-8 text-xs"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            size="sm"
            className="h-8 text-xs"
            disabled={!selectedLead}
          >
            {selectedLead ? `确定选择 ${selectedLead.child_name || selectedLead.parent_phone}` : '请先选择线索'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
