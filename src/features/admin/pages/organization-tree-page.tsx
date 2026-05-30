/**
 * 组织架构树页面
 *
 * 展示真实的组织架构层级：
 * Region → District → Area → (Area Office) → Campus → Department
 *
 * 每个节点显示：名称 + 类型标签 + 负责人 + 员工数 + 部门数 + 未任命告警
 * 点击任一节点 → 右侧 Drawer 显示详情 + 跳转到任命管理
 *
 * 注：员工个人间的上下级汇报关系在 /admin/employee-hierarchy
 */

import { useMemo, useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button, Input, Typography, Card, Skeleton, Empty } from '@douyinfe/semi-ui-19'
import { IconRefresh } from '@douyinfe/semi-icons'
import { adminApi } from '../api'
import type { OrganizationTreeNode } from '../types'
import { OrgTreeStats } from '../components/org-tree/org-tree-stats'
import { OrgTreeNode } from '../components/org-tree/org-tree-node'
import { OrgNodeDetailDrawer } from '../components/org-tree/org-node-detail-drawer'

const { Text } = Typography

/** 深拷贝裁剪：保留搜索命中或其祖先节点 */
function filterTree(
  nodes: OrganizationTreeNode[],
  term: string,
): OrganizationTreeNode[] {
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

/** 收集默认展开的节点 ID：展开到 area 层 */
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

/** 搜索时自动展开所有祖先 */
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

export function OrganizationTreePage() {
  useDocumentTitle('组织架构树')

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set())
  const [userTouchedExpansion, setUserTouchedExpansion] = useState(false)

  const { data: tree = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['organization-tree-full'],
    queryFn: async () => {
      const response = await adminApi.getOrganizationTree()
      return response.data || []
    },
  })

  // 默认展开到 area 层；搜索时展开所有命中路径
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
    setDrawerOpen(true)
  }

  const filteredTree = useMemo(() => filterTree(tree, searchTerm), [tree, searchTerm])
  const selectedNode = useMemo(
    () => (selectedId ? findNode(tree, selectedId) : null),
    [tree, selectedId],
  )

  return (
    <div className="h-full overflow-y-auto">
    <Main>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">组织架构树</h2>
          <Text type="tertiary">
            大区 → 地区 → 区域 → 校区 → 部门，以及各级在任负责人一览
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
      {!isLoading && <OrgTreeStats tree={tree} />}

      {/* 搜索框 */}
      <div className="mt-4 flex items-center gap-2">
        <Input
          prefix={<Search className="h-4 w-4" />}
          placeholder="搜索组织单位/部门名称..."
          value={searchTerm}
          onChange={(v) => setSearchTerm(v)}
          style={{ maxWidth: 384 }}
        />
        {searchTerm && (
          <Button
            theme="borderless"
            type="tertiary"
            icon={<X className="h-4 w-4" />}
            onClick={() => setSearchTerm('')}
          >
            清除
          </Button>
        )}
      </div>

      {/* 树 */}
      <Card className="mt-4" title="组织架构" headerExtraContent={
        <Text type="tertiary" size="small">
          点击节点查看详情，点击箭头展开/折叠
        </Text>
      }>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} placeholder={<Skeleton.Paragraph rows={1} />} loading={true}>
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
      </Card>

      <OrgNodeDetailDrawer
        node={selectedNode}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </Main>
    </div>
  )
}
