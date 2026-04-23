/**
 * 组织架构树节点（递归组件）
 *
 * 展示：类型图标 + 名称 + 类型 tag + 未任命 badge + 员工/部门计数 + 负责人 chips
 * 交互：点击整行打开详情 Drawer；有 children 时点击箭头展开/折叠
 */
import { Tag, Typography, Tooltip } from '@douyinfe/semi-ui-19'
import { ChevronDown, ChevronRight, AlertCircle, Users, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrganizationTreeNode, AssignmentRole } from '../../types'
import { ASSIGNMENT_ROLE_LABELS } from '../../types'
import { OrgNodeIcon } from './org-tree-icons'
import { orgNodeTypeLabel, orgNodeTypeColor, roleTagColor } from '../../lib/assignment-format'

const { Text } = Typography

interface OrgTreeNodeProps {
  node: OrganizationTreeNode
  level: number
  searchTerm: string
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (node: OrganizationTreeNode) => void
  selectedId: string | null
}

export function OrgTreeNode({
  node,
  level,
  searchTerm,
  expandedIds,
  onToggle,
  onSelect,
  selectedId,
}: OrgTreeNodeProps) {
  const hasChildren = (node.children?.length ?? 0) > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const isMatch =
    searchTerm.length > 0 && node.name.toLowerCase().includes(searchTerm.toLowerCase())

  const missing = node.missing_singleton_roles ?? []
  const leaders = node.leaders ?? []
  const shownLeaders = leaders.slice(0, 2)
  const moreLeadersCount = Math.max(0, leaders.length - shownLeaders.length)

  return (
    <div className="select-none">
      <div
        className={cn(
          'group flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors cursor-pointer',
          'hover:bg-[var(--semi-color-fill-0)]',
          isSelected && 'bg-[var(--semi-color-primary-light-default)]',
          isMatch && !isSelected && 'bg-yellow-100 dark:bg-yellow-900/30'
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {/* 展开箭头 */}
        <button
          type="button"
          className="w-5 h-5 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggle(node.id)
          }}
          tabIndex={-1}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
            ) : (
              <ChevronRight className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* 类型图标 */}
        <div
          className={cn(
            'w-7 h-7 rounded flex items-center justify-center shrink-0',
            !node.is_active && 'opacity-40'
          )}
          style={{ background: 'var(--semi-color-fill-1)' }}
        >
          <OrgNodeIcon type={node.type} />
        </div>

        {/* 名称 + 类型 tag */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <Text
            strong
            className={cn('truncate', !node.is_active && 'line-through opacity-60')}
          >
            {node.name}
          </Text>
          <Tag size="small" color={orgNodeTypeColor(node.type)}>
            {orgNodeTypeLabel(node.type)}
          </Tag>

          {!node.is_active && (
            <Tag size="small" color="light-grey">
              已停用
            </Tag>
          )}

          {missing.length > 0 && (
            <Tooltip content={`未任命：${missing.map((r) => ASSIGNMENT_ROLE_LABELS[r as AssignmentRole] ?? r).join('、')}`}>
              <Tag
                size="small"
                color="red"
                prefixIcon={<AlertCircle className="h-3 w-3" />}
              >
                未任命
              </Tag>
            </Tooltip>
          )}
        </div>

        {/* 右侧计数 + 负责人 chips */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {typeof node.employee_count === 'number' && node.employee_count > 0 && (
            <Tooltip content="在任员工数">
              <div
                className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'var(--semi-color-fill-1)', color: 'var(--semi-color-text-1)' }}
              >
                <Users className="h-3 w-3" />
                {node.employee_count}
              </div>
            </Tooltip>
          )}
          {typeof node.department_count === 'number' && node.department_count > 0 && (
            <Tooltip content="下挂部门数">
              <div
                className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                style={{ background: 'var(--semi-color-fill-1)', color: 'var(--semi-color-text-1)' }}
              >
                <Briefcase className="h-3 w-3" />
                {node.department_count}
              </div>
            </Tooltip>
          )}
          {shownLeaders.map((l) => (
            <Tag key={l.assignment_id} size="small" color={roleTagColor(l.role)}>
              {l.role_label || l.role}：{l.employee_name}
            </Tag>
          ))}
          {moreLeadersCount > 0 && (
            <Tag size="small" color="grey">
              +{moreLeadersCount}
            </Tag>
          )}
        </div>
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="border-l ml-[22px]" style={{ borderColor: 'var(--semi-color-border)' }}>
          {node.children!.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              searchTerm={searchTerm}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
