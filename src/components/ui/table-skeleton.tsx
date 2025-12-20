/**
 * TableSkeleton 通用表格骨架屏组件
 * 用于数据表格加载中状态的占位显示
 */

import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ==================== 骨架屏工具函数 ====================

/**
 * 骨架屏 ID 前缀
 * 用于标识骨架屏占位数据
 */
export const SKELETON_ID_PREFIX = '__skeleton__'

/**
 * 判断是否是骨架屏行
 */
export function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}

/**
 * 生成骨架屏占位数据
 * @param count 生成的行数
 * @param factory 可选的工厂函数，用于生成符合表格类型的占位数据
 */
export function createSkeletonData<T extends { id: string }>(
  count: number,
  factory?: (index: number) => Omit<T, 'id'>
): T[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    ...(factory ? factory(i) : {})
  })) as T[]
}

// ==================== 表格骨架屏组件 ====================

interface TableSkeletonProps {
  /** 行数 */
  rows?: number
  /** 列配置：每列的宽度 */
  columns: Array<{
    /** 列宽 (可以是数字或百分比字符串) */
    width?: number | string
    /** 是否隐藏骨架屏 (如选择列) */
    hidden?: boolean
  }>
  /** 是否显示表头 */
  showHeader?: boolean
  /** 表头文本 */
  headers?: string[]
  /** 自定义类名 */
  className?: string
}

/**
 * 完整表格骨架屏
 * 用于表格完全未加载时显示
 */
export function TableSkeleton({
  rows = 10,
  columns,
  showHeader = true,
  headers,
  className
}: TableSkeletonProps) {
  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col, i) => (
                <TableHead
                  key={i}
                  style={{ width: typeof col.width === 'number' ? col.width : col.width }}
                >
                  {headers?.[i] || ''}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((col, colIndex) => (
                <TableCell
                  key={colIndex}
                  style={{ width: typeof col.width === 'number' ? col.width : col.width }}
                >
                  {col.hidden ? null : (
                    <Skeleton
                      className={cn(
                        'h-4',
                        typeof col.width === 'number'
                          ? `w-[${Math.floor(col.width * 0.7)}px]`
                          : 'w-[70%]'
                      )}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ==================== 行内骨架屏组件 ====================

interface SkeletonCellProps {
  /** 宽度 */
  width?: number | string
  /** 高度 */
  height?: number | string
  /** 是否圆角 (用于 Badge 等) */
  rounded?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 骨架屏单元格
 * 用于行内骨架屏模式，在表格列渲染器中使用
 */
export function SkeletonCell({
  width = '70%',
  height = 16,
  rounded = false,
  className
}: SkeletonCellProps) {
  return (
    <Skeleton
      className={cn(
        rounded ? 'rounded-full' : 'rounded',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  )
}

// ==================== 简化的行内骨架屏 ====================

/**
 * 文本骨架屏 - 用于普通文本列
 */
export function TextSkeleton({ width = '70%' }: { width?: number | string }) {
  return <SkeletonCell width={width} height={16} />
}

/**
 * Badge 骨架屏 - 用于状态标签列
 */
export function BadgeSkeleton({ width = 60 }: { width?: number }) {
  return <SkeletonCell width={width} height={20} rounded />
}

/**
 * 头像骨架屏 - 用于头像列
 */
export function AvatarSkeleton({ size = 32 }: { size?: number }) {
  return <Skeleton className="rounded-full" style={{ width: size, height: size }} />
}
