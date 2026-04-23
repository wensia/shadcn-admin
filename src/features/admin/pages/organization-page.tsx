/**
 * 组织架构（主从融合）页面
 *
 * 左侧：组织树；右侧：选中节点的任命面板。
 * 日常高频操作（给节点加/换负责人）在同屏完成，替代旧的
 * /admin/organization-tree + /admin/organization-assignments 跨页面流程。
 *
 * Stage 1：
 *   - 本节点就地维护（新增 / 卸任 / 交接）
 *   - 未包含"下挂部门任命"段（Stage 2）
 *   - URL 选中持久化暂未实现（Stage 2）
 *
 * 设计文档：docs/dev/organization-admin-page-consolidation.md
 */

import { useMemo, useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { Button, Empty, Input, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import { IconRefresh } from '@douyinfe/semi-icons'
import { adminApi } from '../api'
import type { OrganizationTreeNode } from '../types'
import { OrgTreeStats } from '../components/org-tree/org-tree-stats'
import { OrgTreeNode } from '../components/org-tree/org-tree-node'
import { OrgNodeAssignmentPanel } from '../components/org-tree/org-node-assignment-panel'

const { Text } = Typography

function filterTree(nodes: OrganizationTreeNode[], term: string): OrganizationTreeNode[] {
  if (!term) return nodes
  const lower = term.toLowerCase()
  function visit(node: OrganizationTreeNode): OrganizationTreeNode | null {
    const selfMatch = node.name.toLowerCase().includes(lower)
    const childMatches: OrganizationTreeNode[] = []
    if (node.children) {
      for (const c of node.children) {
        const r = visit(c)
        if (r) childMatches.push(r)
      }
    }
    if (selfMatch || childMatches.length > 0) {
      return { ...node, children: childMatches }
    }
    return null
  }
  const out: OrganizationTreeNode[] = []
  for (const n of nodes) {
    const r = visit(n)
    if (r) out.push(r)
  }
  return out
}

function defaultExpandedIds(nodes: OrganizationTreeNode[]): Set<string> {
  const out = new Set<string>()
  function walk(list: OrganizationTreeNode[]) {
    for (const n of list) {
      if (n.type === 'region' || n.type === 'district' || n.type === 'area') {
        out.add(n.id)
      }
      if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

function allAncestorIds(nodes: OrganizationTreeNode[]): Set<string> {
  const out = new Set<string>()
  function walk(list: OrganizationTreeNode[]) {
    for (const n of list) {
      out.add(n.id)
      if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

function findNode(
  nodes: OrganizationTreeNode[],
  id: string,
): OrganizationTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const r = findNode(n.children, id)
      if (r) return r
    }
  }
  return null
}

export function OrganizationPage() {
  useDocumentTitle('组织架构')

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set())
  const [userTouchedExpansion, setUserTouchedExpansion] = useState(false)

  const { data: tree = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['organization-tree-full'],
    queryFn: async () => {
      const response = await adminApi.getOrganizationTree()
      return response.data || []
    },
  })

  const expandedIds = useMemo(() => {
    if (searchTerm) {
      return allAncestorIds(filterTree(tree, searchTerm))
    }
    if (userTouchedExpansion) {
      return manualExpanded
    }
    return defaultExpandedIds(tree)
  }, [tree, searchTerm, userTouchedExpansion, manualExpanded])

  const handleToggle = (id: string) => {
    setUserTouchedExpansion(true)
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setManualExpanded(next)
  }

  const handleSelect = (node: OrganizationTreeNode) => {
    setSelectedId(node.id)
  }

  const filteredTree = useMemo(() => filterTree(tree, searchTerm), [tree, searchTerm])
  const selectedNode = useMemo(
    () => (selectedId ? findNode(tree, selectedId) : null),
    [tree, selectedId],
  )

  return (
    <div className="flex flex-col h-full">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--semi-color-border)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">组织架构</h2>
          <Text type="tertiary" size="small">
            大区 → 地区 → 区域 → 校区 → 部门；选中节点后在右侧管理任命
          </Text>
        </div>
        <Button
          theme="outline"
          icon={<IconRefresh spin={isRefetching} />}
          onClick={() => refetch()}
          disabled={isRefetching}
        />
      </div>

      {/* 统计卡片 */}
      {!isLoading && (
        <div className="px-4 pt-3">
          <OrgTreeStats tree={tree} />
        </div>
      )}

      {/* 主从主体：左树 + 右面板 */}
      <div className="flex-1 flex min-h-0 px-4 pb-4 pt-3 gap-3">
        {/* 左侧：树 */}
        <div className="w-[380px] shrink-0 flex flex-col border border-[var(--semi-color-border)] rounded-md overflow-hidden">
          <div className="p-3 border-b border-[var(--semi-color-border)] flex items-center gap-2">
            <Input
              prefix={<Search className="h-4 w-4" />}
              placeholder="搜索组织单位/部门..."
              value={searchTerm}
              onChange={(v) => setSearchTerm(v)}
              style={{ flex: 1 }}
            />
            {searchTerm && (
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                icon={<X className="h-4 w-4" />}
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    placeholder={<Skeleton.Paragraph rows={1} />}
                    loading={true}
                  >
                    <div />
                  </Skeleton>
                ))}
              </div>
            ) : filteredTree.length === 0 ? (
              <Empty title={searchTerm ? '未找到匹配的组织单位' : '暂无组织数据'} />
            ) : (
              <div className="space-y-0.5">
                {filteredTree.map((node) => (
                  <OrgTreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    searchTerm={searchTerm}
                    expandedIds={expandedIds}
                    onToggle={handleToggle}
                    onSelect={handleSelect}
                    selectedId={selectedId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：任命面板 */}
        <div className="flex-1 min-w-0 border border-[var(--semi-color-border)] rounded-md overflow-hidden">
          <OrgNodeAssignmentPanel node={selectedNode} />
        </div>
      </div>
    </div>
  )
}
