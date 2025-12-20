/**
 * InfoGrid 信息表格布局组件
 * 用于在 InfoCard 内部以无边框表格形式展示信息项
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'

interface InfoGridProps {
  cols?: 1 | 2 | 3
  children: React.ReactNode
  className?: string
}

export function InfoGrid({
  cols = 2,
  children,
  className,
}: InfoGridProps) {
  const s = useStyleClasses()

  // 将 children 转换为数组
  const items = React.Children.toArray(children)

  // 根据列数分组（考虑 span=2 的情况）
  const rows: React.ReactNode[][] = []
  let currentRow: React.ReactNode[] = []
  let currentColCount = 0

  items.forEach((item) => {
    // 检查是否是 InfoItem 并获取 span 属性
    const span = React.isValidElement(item) && item.props.span === 2 ? 2 : 1

    // 如果当前行放不下，开始新行
    if (currentColCount + span > cols) {
      if (currentRow.length > 0) {
        rows.push(currentRow)
      }
      currentRow = []
      currentColCount = 0
    }

    currentRow.push(item)
    currentColCount += span
  })

  // 添加最后一行
  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return (
    <table className={cn('w-full', s.text.xs, className)}>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            className={cn(
              'transition-colors',
              rowIndex % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'
            )}
          >
            {row.map((item, colIndex) => {
              const span = React.isValidElement(item) && item.props.span === 2 ? 2 : 1
              return (
                <React.Fragment key={colIndex}>
                  {item}
                </React.Fragment>
              )
            })}
            {/* 填充空单元格以保持对齐 */}
            {row.length < cols && !row.some((item) =>
              React.isValidElement(item) && item.props.span === 2
            ) && (
              <>
                <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap"></td>
                <td className="py-1.5"></td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
