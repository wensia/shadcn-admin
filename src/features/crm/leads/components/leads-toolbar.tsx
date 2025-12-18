/**
 * Leads表格工具栏
 * 包含新建、批量操作、筛选、刷新等功能
 */

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Plus, RefreshCw, Download, Filter, MoreHorizontal } from 'lucide-react'

interface LeadsToolbarProps {
  selectedCount: number
  onCreateClick: () => void
  onRefreshClick: () => void
  onExportClick: () => void
  onFilterClick: () => void
  onBatchAssign?: () => void
  onBatchRelease?: () => void
  onBatchUpdateStatus?: () => void
  onBatchDelete?: () => void
}

export function LeadsToolbar({
  selectedCount,
  onCreateClick,
  onRefreshClick,
  onExportClick,
  onFilterClick,
  onBatchAssign,
  onBatchRelease,
  onBatchUpdateStatus,
  onBatchDelete
}: LeadsToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 pb-4">
      {/* 左侧按钮组 */}
      <div className="flex items-center gap-2">
        {/* 新建按钮 */}
        <Button onClick={onCreateClick} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          新建线索
        </Button>

        {/* 批量操作按钮 - 只在有选中时显示 */}
        {selectedCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-2 h-4 w-4" />
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
                  onClick={onBatchDelete}
                  className="text-destructive focus:text-destructive"
                >
                  批量删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 右侧按钮组 */}
      <div className="flex items-center gap-2">
        {/* 高级筛选 */}
        <Button variant="outline" size="sm" onClick={onFilterClick}>
          <Filter className="mr-2 h-4 w-4" />
          筛选
        </Button>

        {/* 刷新 */}
        <Button variant="outline" size="sm" onClick={onRefreshClick}>
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* 导出 */}
        <Button variant="outline" size="sm" onClick={onExportClick}>
          <Download className="mr-2 h-4 w-4" />
          导出
        </Button>
      </div>
    </div>
  )
}
