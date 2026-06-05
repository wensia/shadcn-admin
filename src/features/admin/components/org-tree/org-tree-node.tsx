/**
 * 组织架构树节点（递归组件）
 *
 * 展示：类型图标 + 名称 + 类型 tag + 未任命 badge + 员工/部门计数 + 负责人 chips
 * 交互：点击整行打开详情 Drawer；有 children 时点击箭头展开/折叠
 *
 * 对于 campus/area/district 级节点：其子节点会被拆成两组
 *   - 组织单位子节点（campus/area/area_office）— 正常展示
 *   - 部门子节点（*_department）— 归到一个可折叠的「部门 (N)」分组下
 * 这样用户看区域展开不会被大量部门淹没下面的校区列表
 */
import { useState } from 'react'
import { Tag, Typography, Tooltip } from '@douyinfe/semi-ui-19'
import { ChevronDown, ChevronRight, AlertCircle, Users, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrganizationTreeNode, AssignmentRole, OrgTreeNodeType } from '../../types'
import { ASSIGNMENT_ROLE_LABELS } from '../../types'
import { OrgNodeIcon } from './org-tree-icons'
import { orgNodeTypeLabel, orgNodeTypeColor, roleTagColor } from '../../lib/assignment-format'
import {
  getVisibleMissingSingletonRoles,
  hasVisibleMissingSingletonRoles,
} from './org-stats-helpers'

const { Text } = Typography

const DEPT_TYPES = new Set<OrgTreeNodeType>([
  'campus_department',
  'area_department',
  'district_department',
])
const CONTAINER_TYPES = new Set<OrgTreeNodeType>(['region', 'district', 'area', 'campus', 'area_office'])

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

  const missing = getVisibleMissingSingletonRoles(node)
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
            <Tag size="small" color="grey">
              已停用
            </Tag>
          )}

          {missing.length > 0 && (
            <Tooltip content={`未任命：${missing.map((r) => ASSIGNMENT_ROLE_LABELS[r as AssignmentRole] ?? r).join('、')}`}>
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded"
                style={{
                  background: 'var(--semi-color-danger-light-default)',
                  color: 'var(--semi-color-danger)',
                }}
              >
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
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
        <NodeChildren
          node={node}
          level={level}
          searchTerm={searchTerm}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      )}
    </div>
  )
}

/**
 * 子节点渲染：把部门子节点聚合到一个可折叠分组里
 */
function NodeChildren({
  node,
  level,
  searchTerm,
  expandedIds,
  onToggle,
  onSelect,
  selectedId,
}: OrgTreeNodeProps) {
  const children = node.children ?? []
  const deptChildren = children.filter((c) => DEPT_TYPES.has(c.type))
  const unitChildren = children.filter((c) => CONTAINER_TYPES.has(c.type))
  // 搜索时展开整个分组（用户期望看到命中路径）
  const groupDefaultOpen = searchTerm.length > 0
  const [deptGroupOpen, setDeptGroupOpen] = useState(groupDefaultOpen)

  return (
    <div className="border-l ml-[22px]" style={{ borderColor: 'var(--semi-color-border)' }}>
      {/* 先渲染组织单位子节点 */}
      {unitChildren.map((child) => (
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
      {/* 再渲染部门分组（可折叠） */}
      {deptChildren.length > 0 && (
        <DeptGroup
          depts={deptChildren}
          level={level + 1}
          searchTerm={searchTerm}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedId={selectedId}
          isOpen={deptGroupOpen || searchTerm.length > 0}
          onToggleGroup={() => setDeptGroupOpen((v) => !v)}
        />
      )}
    </div>
  )
}

function DeptGroup({
  depts,
  level,
  searchTerm,
  expandedIds,
  onToggle,
  onSelect,
  selectedId,
  isOpen,
  onToggleGroup,
}: {
  depts: OrganizationTreeNode[]
  level: number
  searchTerm: string
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (node: OrganizationTreeNode) => void
  selectedId: string | null
  isOpen: boolean
  onToggleGroup: () => void
}) {
  const deptEmployeeSum = depts.reduce((sum, d) => sum + (d.employee_count ?? 0), 0)
  const missingCount = depts.filter(hasVisibleMissingSingletonRoles).length

  return (
    <div>
      {/* 分组 header（可点击折叠） */}
      <div
        className="group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer hover:bg-[var(--semi-color-fill-0)]"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={onToggleGroup}
      >
        <span className="w-5 h-5 flex items-center justify-center shrink-0">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
          ) : (
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
          )}
        </span>
        <div
          className="w-7 h-7 rounded flex items-center justify-center shrink-0"
          style={{ background: 'var(--semi-color-fill-1)' }}
        >
          <Briefcase className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Text type="tertiary" className="truncate">
            部门
          </Text>
          <Tag size="small" color="grey">
            {depts.length}
          </Tag>
          {deptEmployeeSum > 0 && (
            <div
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'var(--semi-color-fill-1)', color: 'var(--semi-color-text-1)' }}
            >
              <Users className="h-3 w-3" />
              {deptEmployeeSum}
            </div>
          )}
          {missingCount > 0 && (
            <Tooltip content={`${missingCount} 个部门缺负责人`}>
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded relative"
                style={{
                  background: 'var(--semi-color-danger-light-default)',
                  color: 'var(--semi-color-danger)',
                }}
              >
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 分组展开：渲染每个部门节点 */}
      {isOpen && (
        <div className="border-l ml-[22px]" style={{ borderColor: 'var(--semi-color-border)' }}>
          {depts.map((d) => (
            <OrgTreeNode
              key={d.id}
              node={d}
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
