/**
 * Semi Design 统一表格分页组件
 * 提取自 leads-table，供所有 Semi 表格复用
 */

import { Pagination, Select, Typography } from '@douyinfe/semi-ui-19'

const { Text } = Typography

interface SemiTablePaginationProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  selectedCount?: number
  pageSizeOptions?: number[]
}

export function SemiTablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectedCount,
  pageSizeOptions = [10, 20, 50, 100],
}: SemiTablePaginationProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderTop: '1px solid var(--semi-color-border)',
        background: 'var(--semi-color-bg-0)',
        flexShrink: 0,
        fontSize: 13,
      }}
    >
      <div style={{ color: 'var(--semi-color-text-2)' }}>
        {selectedCount != null && selectedCount > 0 && (
          <span>
            已选 <Text strong>{selectedCount}</Text> 条 ·{' '}
          </span>
        )}
        共 <Text strong>{total}</Text> 条数据
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Pagination
          total={total}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          showQuickJumper
        />
        <Select
          value={pageSize}
          onChange={(val) => onPageSizeChange(val as number)}
          position="topLeft"
          style={{ width: 100 }}
          size="small"
        >
          {pageSizeOptions.map((size) => (
            <Select.Option key={size} value={size}>
              {size} 条/页
            </Select.Option>
          ))}
        </Select>
      </div>
    </div>
  )
}
