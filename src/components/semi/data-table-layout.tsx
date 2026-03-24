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
  /** 工具栏上方的额外内容（如统计卡片），独立于 toolbar+刷新按钮 行 */
  topContent?: ReactNode
  /** 工具栏区域（与刷新按钮同行显示） */
  toolbar?: ReactNode
  /** 筛选标签 */
  filterTags?: FilterTag[]
  /** 清除全部筛选 */
  onClearAllFilters?: () => void
  /** 表格区域（children） */
  children: ReactNode
  /** 允许页面纵向滚动，适合仪表盘类页面 */
  allowPageScroll?: boolean
  /** 内容区域的最小高度，仅在 allowPageScroll=true 时生效 */
  contentMinHeight?: number | string
  /** 允许内容区域随内容自然撑开，适合仪表盘类长页面 */
  contentOverflowVisible?: boolean
}

export function DataTableLayout({
  title,
  total,
  headerActions,
  onRefresh,
  isRefreshing,
  topContent,
  toolbar,
  filterTags,
  onClearAllFilters,
  children,
  allowPageScroll = false,
  contentMinHeight = 560,
  contentOverflowVisible = false,
}: DataTableLayoutProps) {
  const shouldExpandContent = allowPageScroll && contentOverflowVisible

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowX: 'hidden',
        overflowY: allowPageScroll ? 'auto' : 'hidden',
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
          {headerActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {headerActions}
            </div>
          )}
        </div>

        {/* 工具栏上方额外内容（统计卡片等） */}
        {topContent}

        {/* 工具栏 + 刷新按钮 */}
        {(toolbar || onRefresh) && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>{toolbar}</div>
            {onRefresh && (
              <Button
                icon={<IconRefresh />}
                theme="light"
                onClick={onRefresh}
                loading={isRefreshing}
                title="刷新数据"
                style={{ flexShrink: 0, marginTop: 1 }}
              />
            )}
          </div>
        )}

        {/* 筛选标签栏 */}
        {filterTags && onClearAllFilters && (
          <FilterTagsBar tags={filterTags} onClearAll={onClearAllFilters} />
        )}
      </div>

      {/* 表格区域 */}
      <div
        style={{
          flex: shouldExpandContent ? '0 0 auto' : 1,
          minHeight: allowPageScroll ? contentMinHeight : 0,
          overflow: shouldExpandContent ? 'visible' : 'hidden',
          padding: '10px 20px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: shouldExpandContent ? '0 0 auto' : 1,
            minHeight: shouldExpandContent ? 'auto' : 0,
            overflow: shouldExpandContent ? 'visible' : 'hidden',
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
