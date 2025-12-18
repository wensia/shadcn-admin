/**
 * 简化分页组件
 * 用于手动分页场景 - Mira风格
 */

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon
} from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface SimplePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  selectedCount?: number
  className?: string
}

export function SimplePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  selectedCount = 0,
  className
}: SimplePaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const canPreviousPage = page > 1
  const canNextPage = page < totalPages

  // 计算显示的页码范围
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5 // 最多显示5个页码按钮

    if (totalPages <= maxVisible + 2) {
      // 总页数较少,显示全部
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // 总页数较多,显示部分
      if (page <= 3) {
        // 当前页在前面
        for (let i = 1; i <= maxVisible; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (page >= totalPages - 2) {
        // 当前页在后面
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // 当前页在中间
        pages.push(1)
        pages.push('...')
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      {/* 左侧:记录统计 */}
      <div className="text-xs text-muted-foreground">
        共 {total} 条记录
        {selectedCount > 0 && `，已选择 ${selectedCount} 条`}
      </div>

      {/* 右侧:分页控件 */}
      <div className="flex items-center gap-1.5">
        {/* 每页条数选择器 - Mira风格 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">每页</span>
          <Select value={`${pageSize}`} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-7 w-[65px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100, 200].map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground hidden sm:inline">条</span>
        </div>

        {/* 分隔线 */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* 页码控件 */}
        <div className="flex items-center gap-0.5">
          {/* 首页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canPreviousPage}
            className="h-7 w-7 p-0 hidden sm:flex"
          >
            <DoubleArrowLeftIcon className="h-3.5 w-3.5" />
          </Button>

          {/* 上一页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPreviousPage}
            className="h-7 w-7 p-0"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          </Button>

          {/* 页码按钮 - Mira风格 */}
          <div className="hidden sm:flex items-center gap-0.5">
            {pageNumbers.map((pageNumber, index) => (
              <div key={`${pageNumber}-${index}`}>
                {pageNumber === '...' ? (
                  <span className="px-1.5 text-xs text-muted-foreground">...</span>
                ) : (
                  <Button
                    variant={page === pageNumber ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNumber as number)}
                    className="h-7 min-w-7 px-2 text-xs"
                  >
                    {pageNumber}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 当前页显示(移动端) */}
          <span className="text-xs px-2 sm:hidden">
            {page} / {totalPages}
          </span>

          {/* 下一页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNextPage}
            className="h-7 w-7 p-0"
          >
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Button>

          {/* 末页 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNextPage}
            className="h-7 w-7 p-0 hidden sm:flex"
          >
            <DoubleArrowRightIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
