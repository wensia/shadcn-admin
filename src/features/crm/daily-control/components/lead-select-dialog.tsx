/**
 * 线索选择弹窗组件
 * 用于在新建到访/缴费记录时选择线索
 * 需要输入完整手机号（11位）才能搜索
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { leadStatusLabels } from '@/features/crm/leads/types'

export interface SelectedLead {
  id: string
  child_name: string
  parent_phone: string
}

// 搜索结果类型（使用 checkPhoneDuplicate 返回的格式）
interface SearchResultItem {
  id: string
  child_name: string
  parent_name: string
  parent_phone?: string
  status: string
  advisor_name?: string
  owner_campus_name?: string
  created_by_name?: string
  created_at?: string
  no_permission?: boolean
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
  description = '请输入完整手机号搜索线索'
}: LeadSelectDialogProps) {
  // 状态
  const [selectedLead, setSelectedLead] = useState<SearchResultItem | null>(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [searchPhone, setSearchPhone] = useState('')

  // 判断是否为有效的完整手机号（11位数字）
  const isValidPhone = (phone: string) => /^1\d{10}$/.test(phone)

  // 通过手机号搜索线索（使用 checkPhoneDuplicate，可查询包括公海在内的所有线索）
  const { data: searchData, isLoading, isFetched } = useQuery({
    queryKey: ['check-phone-for-select', searchPhone],
    queryFn: async () => {
      const response = await leadsApi.checkPhoneDuplicate(searchPhone)
      return response.data
    },
    enabled: open && isValidPhone(searchPhone)
  })

  // 弹框关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSelectedLead(null)
      setPhoneInput('')
      setSearchPhone('')
    }
  }, [open])

  // 处理搜索
  const handleSearch = () => {
    if (isValidPhone(phoneInput)) {
      setSearchPhone(phoneInput)
      setSelectedLead(null)
    }
  }

  // 按回车搜索
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelectLead = (lead: SearchResultItem) => {
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
        parent_phone: selectedLead.parent_phone || searchPhone || ''
      })
      onOpenChange(false)
    }
  }

  // checkPhoneDuplicate 返回 duplicate_leads 数组
  const searchResults = searchData?.duplicate_leads || []
  const hasSearched = isFetched && isValidPhone(searchPhone)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 max-h-[70vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
          {/* 搜索栏 */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 11))}
                onKeyDown={handleKeyDown}
                placeholder="请输入完整手机号（11位）"
                className="h-9 pl-9"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!isValidPhone(phoneInput) || isLoading}
              className="h-9"
            >
              {isLoading ? '搜索中...' : '搜索'}
            </Button>
          </div>

          {/* 提示信息或搜索结果 */}
          {!hasSearched ? (
            <div className="flex-1 flex items-center justify-center border rounded-md bg-muted/30">
              <p className="text-sm text-muted-foreground">
                请输入完整的11位手机号进行搜索
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-14 text-xs text-center">选择</TableHead>
                    <TableHead className="w-24 text-xs">学生姓名</TableHead>
                    <TableHead className="w-32 text-xs">联系电话</TableHead>
                    <TableHead className="w-24 text-xs">状态</TableHead>
                    <TableHead className="w-24 text-xs">课程顾问</TableHead>
                    <TableHead className="text-xs">校区</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                        搜索中...
                      </TableCell>
                    </TableRow>
                  ) : searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                        未找到匹配的线索
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((lead) => {
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
                            {lead.parent_phone || searchPhone || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs h-5">
                              {leadStatusLabels[lead.status as keyof typeof leadStatusLabels] || lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {lead.advisor_name || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {lead.owner_campus_name || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* 搜索结果统计 */}
          {hasSearched && searchResults.length > 0 && (
            <div className="text-xs text-muted-foreground text-center shrink-0">
              找到 {searchResults.length} 条线索
            </div>
          )}
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
