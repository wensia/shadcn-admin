/**
 * DataTableLayout - 数据表页面通用布局壳
 * 标题行 + 工具栏 + 筛选标签 + 表格区域
 */

import type { ReactNode } from 'react'
import { Button, Typography } from '@douyinfe/semi-ui-19'
import { IconRefresh } from '@douyinfe/semi-icons'
import { FilterTagsBar, type FilterTag } from './filter-tags-bar'

const { Title, Text } = Typography

interface DataTableLayoutProps {
  /** 页面标题 */
  title: string
  /** 数据总条数 */
  total?: number
  /** 标题右侧的操作按钮区域 */
  headerActions?: ReactNode
  /** 刷新回调（显示刷新图标按钮） */
  onRefresh?: () => void
  /** 刷新中状态 */
  isRefreshing?: boolean
  /** 工具栏区域 */
  toolbar?: ReactNode
  /** 筛选标签 */
  filterTags?: FilterTag[]
  /** 清除全部筛选 */
  onClearAllFilters?: () => void
  /** 表格区域（children） */
  children: ReactNode
}

export function DataTableLayout({
  title,
  total,
  headerActions,
  onRefresh,
  isRefreshing,
  toolbar,
  filterTags,
  onClearAllFilters,
  children,
}: DataTableLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* 头部区域 */}
      <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
        {/* 标题行 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <Title heading={5} style={{ margin: 0 }}>
              {title}
            </Title>
            {total != null && (
              <Text type="tertiary" size="small">
                共 {total} 条
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {headerActions}
            {onRefresh && (
              <Button
                icon={<IconRefresh />}
                theme="borderless"
                onClick={onRefresh}
                loading={isRefreshing}
                title="刷新数据"
              />
            )}
          </div>
        </div>

        {/* 工具栏 */}
        {toolbar}

        {/* 筛选标签栏 */}
        {filterTags && onClearAllFilters && (
          <FilterTagsBar tags={filterTags} onClearAll={onClearAllFilters} />
        )}
      </div>

      {/* 表格区域 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          padding: '10px 20px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            borderRadius: 8,
            border: '1px solid var(--semi-color-border)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--semi-color-bg-0)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
