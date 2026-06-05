/**
 * 线索工具栏 - Semi Design 版本
 * 搜索、状态/意向筛选、批量操作
 */
import { IconMore } from '@douyinfe/semi-icons'
import { Button, Dropdown, Select } from '@douyinfe/semi-ui-19'
import {
  leadStatusLabels,
  intentionLevelLabels,
  type LeadStatus,
  type IntentionLevel,
} from '../types'
import { LeadListToolbarControls } from './lead-list-toolbar-controls'

interface LeadsToolbarProps {
  table?: unknown
  selectedCount: number
  searchValue?: string
  statusFilter?: LeadStatus[]
  intentionFilter?: IntentionLevel[]
  onFilterClick: () => void
  onSearchChange?: (value: string) => void
  onSearch?: () => void
  onStatusFilterChange?: (values: LeadStatus[]) => void
  onIntentionFilterChange?: (values: IntentionLevel[]) => void
  onBatchAssign?: () => void
  onCreateAssignmentTask?: () => void
  onBatchRelease?: () => void
  onBatchUpdateStatus?: () => void
  onBatchDelete?: () => void
}

export function LeadsToolbar({
  selectedCount,
  searchValue = '',
  statusFilter = [],
  intentionFilter = [],
  onFilterClick,
  onSearchChange,
  onSearch,
  onStatusFilterChange,
  onIntentionFilterChange,
  onBatchAssign,
  onCreateAssignmentTask,
  onBatchRelease,
  onBatchUpdateStatus,
  onBatchDelete,
}: LeadsToolbarProps) {
  const batchMenuItems = [
    onCreateAssignmentTask && {
      node: 'item' as const,
      name: '创建分配任务',
      onClick: onCreateAssignmentTask,
    },
    onBatchAssign && {
      node: 'item' as const,
      name: '快速分配',
      onClick: onBatchAssign,
    },
    onBatchRelease && {
      node: 'item' as const,
      name: '释放到公海',
      onClick: onBatchRelease,
    },
    onBatchUpdateStatus && {
      node: 'item' as const,
      name: '修改状态',
      onClick: onBatchUpdateStatus,
    },
    onBatchDelete && {
      node: 'item' as const,
      name: '批量删除',
      type: 'danger' as const,
      onClick: onBatchDelete,
    },
  ].filter(Boolean) as Array<{
    node: 'item'
    name: string
    type?: 'danger'
    onClick: () => void
  }>

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <LeadListToolbarControls
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onSearch={onSearch}
        onFilterClick={onFilterClick}
        filterButtonTheme='light'
        enablePhoneLookup
        extraControls={
          <>
            {/* 状态筛选 */}
            <Select
              placeholder='状态'
              multiple
              maxTagCount={2}
              value={statusFilter}
              onChange={(v) =>
                onStatusFilterChange?.((v || []) as LeadStatus[])
              }
              style={{ width: 200 }}
              showClear
            >
              {Object.entries(leadStatusLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>

            {/* 意向等级筛选 */}
            <Select
              placeholder='意向等级'
              multiple
              value={intentionFilter}
              onChange={(v) =>
                onIntentionFilterChange?.((v || []) as IntentionLevel[])
              }
              style={{ width: 160 }}
              showClear
            >
              {Object.entries(intentionLevelLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </>
        }
      />

      {selectedCount > 0 && (
        <Dropdown
          trigger='click'
          clickToHide
          position='bottomRight'
          menu={batchMenuItems}
        >
          <span style={{ display: 'inline-flex' }}>
            <Button icon={<IconMore />} theme='light'>
              批量操作 ({selectedCount})
            </Button>
          </span>
        </Dropdown>
      )}
    </div>
  )
}
