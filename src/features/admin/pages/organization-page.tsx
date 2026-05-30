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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button, Empty, Input, Skeleton } from '@douyinfe/semi-ui-19'
import { IconSearch } from '@douyinfe/semi-icons'
import { adminApi } from '../api'
import type { OrganizationTreeNode } from '../types'
import { OrgTreeStats } from '../components/org-tree/org-tree-stats'
import { OrgTreeNode } from '../components/org-tree/org-tree-node'
import { OrgNodeAssignmentPanel } from '../components/org-tree/org-node-assignment-panel'

const TREE_WIDTH_STORAGE_KEY = 'admin.organization.tree_width'
const TREE_MIN_WIDTH = 240
const TREE_MAX_WIDTH = 720
const TREE_DEFAULT_WIDTH = 380

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

  // 左侧树宽度（可拖拽 + localStorage 持久化）
  const [treeWidth, setTreeWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return TREE_DEFAULT_WIDTH
    const raw = window.localStorage.getItem(TREE_WIDTH_STORAGE_KEY)
    const n = raw ? parseInt(raw, 10) : NaN
    if (!isNaN(n) && n >= TREE_MIN_WIDTH && n <= TREE_MAX_WIDTH) return n
    return TREE_DEFAULT_WIDTH
  })
  const draggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartWidthRef = useRef(0)

  const handleResizerMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      draggingRef.current = true
      dragStartXRef.current = e.clientX
      dragStartWidthRef.current = treeWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [treeWidth],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const delta = e.clientX - dragStartXRef.current
      const next = Math.max(
        TREE_MIN_WIDTH,
        Math.min(TREE_MAX_WIDTH, dragStartWidthRef.current + delta),
      )
      setTreeWidth(next)
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      // 持久化当前值
      setTreeWidth((w) => {
        try {
          window.localStorage.setItem(TREE_WIDTH_STORAGE_KEY, String(w))
        } catch {
          // localStorage may be unavailable in restricted browser contexts.
        }
        return w
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleResizerDoubleClick = useCallback(() => {
    setTreeWidth(TREE_DEFAULT_WIDTH)
    try {
      window.localStorage.setItem(TREE_WIDTH_STORAGE_KEY, String(TREE_DEFAULT_WIDTH))
    } catch {
      // localStorage may be unavailable in restricted browser contexts.
    }
  }, [])

  const { data: tree = [], isLoading } = useQuery({
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
	      {/* 统计卡片 */}
      {!isLoading && (
        <div className="px-4 pt-2">
          <OrgTreeStats tree={tree} compact />
        </div>
      )}

      {/* 主从主体：左树 + 拖拽条 + 右面板 */}
      <div className="flex-1 flex min-h-0 px-4 pb-4 pt-2">
        {/* 左侧：树 */}
        <div
          className="shrink-0 flex flex-col border border-[var(--semi-color-border)] rounded-md overflow-hidden"
          style={{ width: treeWidth }}
        >
          <div className="p-3 border-b border-[var(--semi-color-border)] flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索组织单位/部门..."
              value={searchTerm}
              onChange={(v) => setSearchTerm(v)}
              style={{ flex: 1 }}
            />
            {searchTerm && (
              <Button
                theme="borderless"
                type="tertiary"
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

        {/* 拖拽条：可拖拽调整左栏宽度；双击重置；持久化到 localStorage */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="调整树宽度"
          title="拖拽调整宽度（双击重置）"
          className="shrink-0 w-[6px] mx-1 cursor-col-resize relative group"
          onMouseDown={handleResizerMouseDown}
          onDoubleClick={handleResizerDoubleClick}
        >
          {/* hover 时加亮中线 */}
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px transition-colors group-hover:w-[2px]"
            style={{ background: 'var(--semi-color-border)' }}
          />
        </div>

        {/* 右侧：任命面板 */}
        <div className="flex-1 min-w-0 border border-[var(--semi-color-border)] rounded-md overflow-hidden">
          <OrgNodeAssignmentPanel
            node={selectedNode}
            tree={tree}
            onNodeDeleted={() => setSelectedId(null)}
          />
        </div>
      </div>
    </div>
  )
}
