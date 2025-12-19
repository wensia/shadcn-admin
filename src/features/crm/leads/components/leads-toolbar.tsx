/**
 * Leads表格工具栏
 * 使用 shadcn-admin tasks 页面相同的筛选组件样式
 * 包含搜索、FacetedFilter筛选、批量操作等功能
 */

import { Cross2Icon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { StandaloneFacetedFilter } from '@/components/data-table/standalone-faceted-filter'
import { DataTableViewOptions } from '@/components/data-table/view-options'
import { Plus, RefreshCw, Download, Filter, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import {
  leadStatusLabels,
  intentionLevelLabels,
  LeadStatus,
  IntentionLevel
} from '../types'
import type { Table } from '@tanstack/react-table'
import type { LeadListItem } from '../types'

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
  onExportClick: () => void
  onFilterClick: () => void
  onSearchChange?: (value: string) => void
  onStatusFilterChange?: (values: LeadStatus[]) => void
  onIntentionFilterChange?: (values: IntentionLevel[]) => void
  onResetFilters?: () => void
  onBatchAssign?: () => void
  onBatchRelease?: () => void
  onBatchUpdateStatus?: () => void
  onBatchDelete?: () => void
}

export function LeadsToolbar({
  table,
  selectedCount,
  searchValue = '',
  statusFilter = [],
  intentionFilter = [],
  showCreateButton = true,
  onCreateClick,
  onRefreshClick,
  onExportClick,
  onFilterClick,
  onSearchChange,
  onStatusFilterChange,
  onIntentionFilterChange,
  onResetFilters,
  onBatchAssign,
  onBatchRelease,
  onBatchUpdateStatus,
  onBatchDelete
}: LeadsToolbarProps) {
  const s = useStyleClasses()

  const isFiltered = searchValue || statusFilter.length > 0 || intentionFilter.length > 0

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2">
        {/* 搜索框 */}
        <Input
          placeholder="搜索姓名/手机号..."
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />

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

        {/* 重置按钮 */}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={onResetFilters}
            className="h-8 px-2 lg:px-3"
          >
            重置
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}

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
        <Button variant="outline" size="sm" onClick={onRefreshClick} className="h-8 w-8 p-0">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>

        {/* 导出 */}
        <Button variant="outline" size="sm" onClick={onExportClick} className="h-8">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          导出
        </Button>

        {/* 列显示控制 */}
        {table && <DataTableViewOptions table={table} />}
      </div>
    </div>
  )
}
