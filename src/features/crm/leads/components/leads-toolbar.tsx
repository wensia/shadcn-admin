/**
 * Leads表格工具栏
 * 使用 shadcn-admin tasks 页面相同的筛选组件样式
 * 包含搜索、FacetedFilter筛选、批量操作等功能
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StandaloneFacetedFilter } from '@/components/data-table/standalone-faceted-filter'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import { Plus, RefreshCw, Filter, MoreHorizontal, X, Eye, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { toast } from 'sonner'
import {
  leadStatusLabels,
  intentionLevelLabels,
  LeadStatus,
  IntentionLevel
} from '../types'
import type { Table } from '@tanstack/react-table'
import type { LeadListItem, Lead } from '../types'
import { leadsApi } from '../api'
import { LeadInfoDisplay } from './detail/lead-info-display'

// 状态筛选选项
const statusOptions = Object.entries(leadStatusLabels).map(([value, label]) => ({
  label,
  value
}))

// 意向等级筛选选项
const intentionOptions = Object.entries(intentionLevelLabels).map(([value, label]) => ({
  label,
  value
}))

interface LeadsToolbarProps {
  table?: Table<LeadListItem>
  selectedCount: number
  searchValue?: string
  statusFilter?: LeadStatus[]
  intentionFilter?: IntentionLevel[]
  showCreateButton?: boolean
  onCreateClick?: () => void
  onRefreshClick: () => void
  onFilterClick: () => void
  onSearchChange?: (value: string) => void
  onStatusFilterChange?: (values: LeadStatus[]) => void
  onIntentionFilterChange?: (values: IntentionLevel[]) => void
  onBatchAssign?: () => void
  onBatchRelease?: () => void
  onBatchUpdateStatus?: () => void
  onBatchDelete?: () => void
}

// 验证是否为有效的11位手机号
const isValidPhone = (value: string) => /^1[3-9]\d{9}$/.test(value)

export function LeadsToolbar({
  table,
  selectedCount,
  searchValue = '',
  statusFilter = [],
  intentionFilter = [],
  showCreateButton = true,
  onCreateClick,
  onRefreshClick,
  onFilterClick,
  onSearchChange,
  onStatusFilterChange,
  onIntentionFilterChange,
  onBatchAssign,
  onBatchRelease,
  onBatchUpdateStatus,
  onBatchDelete
}: LeadsToolbarProps) {
  const s = useStyleClasses()

  // 手机号查询详情相关状态
  const [showLeadDialog, setShowLeadDialog] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupLead, setLookupLead] = useState<Lead | null>(null)

  // 查看手机号对应的线索详情
  const handlePhoneLookup = async () => {
    if (!isValidPhone(searchValue)) return

    setIsLookingUp(true)
    try {
      // 先通过手机号搜索线索
      const searchResult = await leadsApi.searchLeadsByPhone(searchValue)
      if (searchResult && searchResult.length > 0) {
        // 获取完整的线索详情
        const leadDetail = await leadsApi.getLead(searchResult[0].id)
        setLookupLead(leadDetail)
        setShowLeadDialog(true)
      } else {
        toast.info('未找到该手机号对应的线索')
      }
    } catch (error: any) {
      toast.error(error?.message || '查询失败')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2">
        {/* 搜索框和快捷查看按钮 */}
        <div className="flex items-center gap-1">
          <div className="relative">
            <Input
              placeholder="搜索姓名/手机号..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className={cn("h-8 w-[150px] lg:w-[250px]", searchValue && "pr-8")}
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="清空搜索"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* 手机号快捷查看按钮 */}
          {isValidPhone(searchValue) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={handlePhoneLookup}
              disabled={isLookingUp}
              title="查看该手机号的线索详情"
            >
              {isLookingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* FacetedFilter 筛选按钮组 */}
        <div className="flex gap-x-2">
          <StandaloneFacetedFilter
            title="状态"
            options={statusOptions}
            selectedValues={new Set(statusFilter)}
            onSelectedChange={(values) => onStatusFilterChange?.(Array.from(values) as LeadStatus[])}
          />
          <StandaloneFacetedFilter
            title="意向等级"
            options={intentionOptions}
            selectedValues={new Set(intentionFilter)}
            onSelectedChange={(values) => onIntentionFilterChange?.(Array.from(values) as IntentionLevel[])}
          />
        </div>

        {/* 高级筛选按钮 */}
        <Button variant="outline" size="sm" onClick={onFilterClick} className="h-8">
          <Filter className="mr-1.5 h-3.5 w-3.5" />
          高级筛选
        </Button>
      </div>

      {/* 右侧按钮组 */}
      <div className="flex items-center space-x-2">
        {/* 新建按钮 */}
        {showCreateButton && (
          <Button onClick={onCreateClick} size="sm" className="h-8">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新建线索
          </Button>
        )}

        {/* 批量操作按钮 - 只在有选中时显示 */}
        {selectedCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
                批量操作 ({selectedCount})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {onBatchAssign && (
                <DropdownMenuItem onClick={onBatchAssign}>
                  批量分配
                </DropdownMenuItem>
              )}
              {onBatchRelease && (
                <DropdownMenuItem onClick={onBatchRelease}>
                  释放到公海
                </DropdownMenuItem>
              )}
              {onBatchUpdateStatus && (
                <DropdownMenuItem onClick={onBatchUpdateStatus}>
                  修改状态
                </DropdownMenuItem>
              )}
              {onBatchDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onBatchDelete}
                >
                  批量删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 刷新 */}
        <Button variant="outline" size="icon" onClick={onRefreshClick} title="刷新">
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* 列显示控制 */}
        {table && <DataTableViewOptions table={table} />}
      </div>

      {/* 手机号查看线索详情弹窗 */}
      <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(s.text.base, 'font-semibold')}>
              线索详情 - {lookupLead?.child_name || lookupLead?.parent_phone || ''}
            </DialogTitle>
          </DialogHeader>
          {lookupLead && (
            <LeadInfoDisplay
              lead={lookupLead}
              compact={false}
              showBackupContact={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
