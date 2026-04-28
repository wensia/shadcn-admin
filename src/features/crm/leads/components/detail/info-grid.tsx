/**
 * InfoGrid 信息表格布局组件 - Semi Design 版本
 */

import * as React from 'react'

interface InfoGridProps {
  cols?: 1 | 2 | 3 | 4
  children: React.ReactNode
  className?: string
}

export function InfoGrid({
  cols = 2,
  children,
  className,
}: InfoGridProps) {
  const items = React.Children.toArray(children)

  const rows: React.ReactNode[][] = []
  let currentRow: React.ReactNode[] = []
  let currentColCount = 0

  items.forEach((item) => {
    const props = React.isValidElement<{ span?: number }>(item) ? item.props : {}
    const span = props.span === 2 ? 2 : 1
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

  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return (
    <table className={className} style={{ width: '100%', fontSize: 13 }}>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr
            key={rowIndex}
            style={{
              transition: 'background-color 0.2s',
              backgroundColor: rowIndex % 2 === 0 ? 'var(--semi-color-fill-0)' : 'transparent',
            }}
          >
            {row.map((item, colIndex) => (
              <React.Fragment key={colIndex}>
                {item}
              </React.Fragment>
            ))}
            {row.length < cols && !row.some((item) =>
              React.isValidElement<{ span?: number }>(item) && item.props.span === 2
            ) && (
              <>
                <td style={{ padding: '6px 12px 6px 0', color: 'var(--semi-color-text-2)', whiteSpace: 'nowrap' }}></td>
                <td style={{ padding: '6px 0' }}></td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
