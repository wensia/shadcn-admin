/**
 * SemiDataTable - 通用数据表格组件
 * 封装 Semi Table + useTableScroll + 骨架屏 + SemiTablePagination
 */

import { useMemo, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { Table, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps, RowSelection } from '@douyinfe/semi-ui-19/lib/es/table'
import { createSkeletonData } from '@/lib/table-utils'
import { useTableScroll } from './use-table-scroll'
import { SemiTablePagination } from './table-pagination'

const { Text } = Typography

interface SemiDataTableProps<T extends { id: string }> {
  columns: ColumnProps<T>[]
  data: T[]
  total: number
  page: number
  pageSize: number
  isLoading?: boolean
  scrollX?: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (record: T) => void
  rowSelection?: {
    selectedRowKeys: (string | number)[]
    onChange: (keys: (string | number)[], rows: T[]) => void
    fixed?: 'left' | 'right'
    width?: number
  }
  emptyText?: ReactNode
  /** 骨架屏数据工厂函数 */
  skeletonFactory?: (index: number) => Omit<T, 'id'>
}

export function SemiDataTable<T extends { id: string }>({
  columns,
  data,
  total,
  page,
  pageSize,
  isLoading,
  scrollX,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  rowSelection,
  emptyText = '暂无数据',
  skeletonFactory,
}: SemiDataTableProps<T>) {
  const { wrapperRef, scrollY } = useTableScroll()
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<(string | number)[]>(
    rowSelection?.selectedRowKeys ?? []
  )

  // 使用 ref 持有最新的回调，避免对象引用变化触发 Semi Base.componentDidUpdate 无限循环
  const rowSelectionRef = useRef(rowSelection)
  rowSelectionRef.current = rowSelection

  const onRowClickRef = useRef(onRowClick)
  onRowClickRef.current = onRowClick

  // 同步外部 selectedRowKeys
  useEffect(() => {
    if (rowSelection) {
      setInternalSelectedKeys(rowSelection.selectedRowKeys)
    }
  }, [rowSelection?.selectedRowKeys])

  // 数据/页码变化时清空选中（仅在有选中项时才触发，防止空数组引用变化导致无限循环）
  useEffect(() => {
    setInternalSelectedKeys(prev => {
      if (prev.length === 0) return prev // 已为空，返回同一引用，React 不会重渲染
      rowSelectionRef.current?.onChange([], [])
      return []
    })
  }, [data, page, pageSize])

  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData<T>(pageSize, skeletonFactory) : data
  }, [isLoading, data, pageSize, skeletonFactory])

  const isSkeletonId = (id: string) => id.startsWith('__skeleton__')

  // 稳定的 scroll 对象引用（防止 Semi Table componentDidUpdate 无限 forceUpdate）
  const scrollConfig = useMemo(() => ({ x: scrollX, y: scrollY }), [scrollX, scrollY])

  // 稳定的 onChange 回调
  const stableSelectionChange = useCallback((keys?: (string | number)[], rows?: T[]) => {
    const safeKeys = keys ?? []
    const safeRows = (rows ?? []) as T[]
    setInternalSelectedKeys(safeKeys)
    rowSelectionRef.current?.onChange(safeKeys, safeRows)
  }, [])

  // 稳定的 rowSelection 对象
  const hasRowSelection = !isLoading && !!rowSelection
  const selectionFixed = rowSelection?.fixed
  const selectionWidth = rowSelection?.width
  const tableRowSelection: RowSelection<T> | undefined = useMemo(() => {
    if (!hasRowSelection) return undefined
    return {
      selectedRowKeys: internalSelectedKeys,
      onChange: stableSelectionChange,
      fixed: selectionFixed as 'left' | undefined,
      width: selectionWidth,
    }
  }, [hasRowSelection, internalSelectedKeys, stableSelectionChange, selectionFixed, selectionWidth])

  // 稳定的 onRow 回调
  const handleRow = useCallback((record: T | undefined) => ({
    onClick: () => {
      if (record && !isSkeletonId(record.id)) {
        onRowClickRef.current?.(record)
      }
    },
    style: {
      cursor: record && !isSkeletonId(record.id) ? 'pointer' : 'default',
    } as React.CSSProperties,
  }), [])

  // 稳定的 empty 内容（防止 Semi Table componentDidUpdate 检测到 prop 变化）
  const emptyContent = useMemo(() => (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <Text type="tertiary">{emptyText}</Text>
    </div>
  ), [emptyText])

  // 稳定的 Table style
  const tableStyle = useMemo(() => ({ width: '100%' as const }), [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        ref={wrapperRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          opacity: isLoading ? 0.6 : 1,
          pointerEvents: isLoading ? 'none' : undefined,
          transition: 'opacity 0.2s',
        }}
      >
        <Table<T>
          columns={columns}
          dataSource={displayData}
          rowKey="id"
          loading={false}
          scroll={scrollConfig}
          style={tableStyle}
          rowSelection={tableRowSelection}
          onRow={handleRow}
          pagination={false}
          empty={emptyContent}
        />
      </div>

      <SemiTablePagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        selectedCount={isLoading ? 0 : internalSelectedKeys.length}
      />
    </div>
  )
}
