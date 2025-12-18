/**
 * Leads表格工具栏
 * 包含新建、搜索、筛选、批量操作等功能
 * 支持 Mira/Lyra 风格切换
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Plus, RefreshCw, Download, Filter, MoreHorizontal, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { leadStatusLabels, type LeadStatus } from '../types'

interface LeadsToolbarProps {
  selectedCount: number
  searchValue?: string
  statusFilter?: LeadStatus | ''
  showCreateButton?: boolean
  onCreateClick?: () => void
  onRefreshClick: () => void
  onExportClick: () => void
  onFilterClick: () => void
  onSearchChange?: (value: string) => void
  onStatusFilterChange?: (value: LeadStatus | '') => void
  onBatchAssign?: () => void
  onBatchRelease?: () => void
  onBatchUpdateStatus?: () => void
  onBatchDelete?: () => void
}

export function LeadsToolbar({
  selectedCount,
  searchValue = '',
  statusFilter = '',
  showCreateButton = true,
  onCreateClick,
  onRefreshClick,
  onExportClick,
  onFilterClick,
  onSearchChange,
  onStatusFilterChange,
  onBatchAssign,
  onBatchRelease,
  onBatchUpdateStatus,
  onBatchDelete
}: LeadsToolbarProps) {
  const s = useStyleClasses()

  return (
    <div className="space-y-3 pb-3">
      {/* 第一行: 搜索框和状态筛选 */}
      <div className={cn('flex items-center', s.gap.tight)}>
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索姓名/手机号..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className={cn(s.height.control, s.text.xs, 'pl-8')}
          />
        </div>

        {/* 状态筛选 */}
        <Select value={statusFilter || undefined} onValueChange={(value) => onStatusFilterChange?.(value === '__all__' ? '' : value as LeadStatus)}>
          <SelectTrigger className={cn(s.height.control, s.text.xs, 'w-[140px]')}>
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className={s.text.xs}>全部状态</SelectItem>
            {Object.entries(leadStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value} className={s.text.xs}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 第二行: 操作按钮 */}
      <div className={cn('flex items-center justify-between', s.gap.tight)}>
        {/* 左侧按钮组 */}
        <div className={cn('flex items-center', s.gap.tight)}>
          {/* 新建按钮 */}
          {showCreateButton && (
            <Button onClick={onCreateClick} size="sm" className={cn(s.height.control, s.text.xs)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              新建线索
            </Button>
          )}

          {/* 批量操作按钮 - 只在有选中时显示 */}
          {selectedCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn(s.height.control, s.text.xs)}>
                  <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  批量操作 ({selectedCount})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {onBatchAssign && (
                  <DropdownMenuItem onClick={onBatchAssign} className={s.text.xs}>
                    批量分配
                  </DropdownMenuItem>
                )}
                {onBatchRelease && (
                  <DropdownMenuItem onClick={onBatchRelease} className={s.text.xs}>
                    释放到公海
                  </DropdownMenuItem>
                )}
                {onBatchUpdateStatus && (
                  <DropdownMenuItem onClick={onBatchUpdateStatus} className={s.text.xs}>
                    修改状态
                  </DropdownMenuItem>
                )}
                {onBatchDelete && (
                  <DropdownMenuItem
                    onClick={onBatchDelete}
                    className={cn(s.text.xs, 'text-destructive focus:text-destructive')}
                  >
                    批量删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* 右侧按钮组 */}
        <div className={cn('flex items-center', s.gap.tight)}>
          {/* 高级筛选 */}
          <Button variant="outline" size="sm" onClick={onFilterClick} className={cn(s.height.control, s.text.xs)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            筛选
          </Button>

          {/* 刷新 */}
          <Button variant="outline" size="sm" onClick={onRefreshClick} className={cn(s.height.control, 'w-8 p-0')}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* 导出 */}
          <Button variant="outline" size="sm" onClick={onExportClick} className={cn(s.height.control, s.text.xs)}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            导出
          </Button>
        </div>
      </div>
    </div>
  )
}
