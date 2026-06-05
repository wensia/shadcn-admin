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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { Button, Empty, Form, Input, Modal, Skeleton } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { adminApi } from '../api'
import type { AreaCreate, CampusCreate, DistrictCreate, OrganizationTreeNode, RegionCreate } from '../types'
import {
  computeOrgStats,
  findAncestorIds,
  findFirstMissingNode,
} from '../components/org-tree/org-stats-helpers'
import { OrgTreeNode } from '../components/org-tree/org-tree-node'
import { OrgNodeAssignmentPanel } from '../components/org-tree/org-node-assignment-panel'

const TREE_WIDTH_STORAGE_KEY = 'admin.organization.tree_width'
const TREE_MIN_WIDTH = 240
const TREE_MAX_WIDTH = 720
const TREE_DEFAULT_WIDTH = 380
type CreateNodeType = 'region' | 'district' | 'area' | 'campus'

const CREATE_TYPE_LABELS: Record<CreateNodeType, string> = {
  region: '大区',
  district: '地区',
  area: '区域',
  campus: '校区',
}

const CREATE_PARENT_LABELS: Record<Exclude<CreateNodeType, 'region'>, string> = {
  district: '所属大区',
  area: '所属地区',
  campus: '所属区域',
}

const CREATE_TYPE_OPTIONS = [
  { value: 'region', label: '大区' },
  { value: 'district', label: '地区' },
  { value: 'area', label: '区域' },
  { value: 'campus', label: '校区' },
]

const DEFAULT_CREATE_FORM_VALUES = {
  sort_order: 0,
  is_active: true,
  auto_create_departments: true,
}

interface CreateParentOptions {
  regions: Array<{ value: string; label: string }>
  districts: Array<{ value: string; label: string }>
  areas: Array<{ value: string; label: string }>
}

interface CreateOrgFormValues {
  type?: CreateNodeType
  parent_id?: string
  name?: string
  description?: string
  address?: string
  contact_phone?: string
  sort_order?: number
  is_active?: boolean
  auto_create_departments?: boolean
}

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

function findNodePath(
  nodes: OrganizationTreeNode[],
  id: string,
  path: OrganizationTreeNode[] = [],
): OrganizationTreeNode[] | null {
  for (const n of nodes) {
    const nextPath = [...path, n]
    if (n.id === id) return nextPath
    if (n.children) {
      const r = findNodePath(n.children, id, nextPath)
      if (r) return r
    }
  }
  return null
}

function getNearestPathNode(
  path: OrganizationTreeNode[] | null,
  type: OrganizationTreeNode['type'],
): OrganizationTreeNode | null {
  if (!path) return null
  for (let i = path.length - 1; i >= 0; i -= 1) {
    if (path[i].type === type) return path[i]
  }
  return null
}

function getDefaultCreateType(path: OrganizationTreeNode[] | null): CreateNodeType {
  const current = path?.[path.length - 1]
  if (!current) return 'region'
  if (current.type === 'region') return 'district'
  if (current.type === 'district' || current.type === 'district_department') return 'area'
  if (
    current.type === 'area' ||
    current.type === 'area_office' ||
    current.type === 'area_department' ||
    current.type === 'campus' ||
    current.type === 'campus_department'
  ) {
    return 'campus'
  }
  return 'region'
}

function getDefaultParentId(
  path: OrganizationTreeNode[] | null,
  type: CreateNodeType,
): string | undefined {
  if (type === 'district') return getNearestPathNode(path, 'region')?.id
  if (type === 'area') return getNearestPathNode(path, 'district')?.id
  if (type === 'campus') return getNearestPathNode(path, 'area')?.id
  return undefined
}

function collectCreateParentOptions(nodes: OrganizationTreeNode[]): CreateParentOptions {
  const options: CreateParentOptions = {
    regions: [],
    districts: [],
    areas: [],
  }

  function walk(list: OrganizationTreeNode[], path: OrganizationTreeNode[]) {
    for (const node of list) {
      const nextPath = [...path, node]
      const region = getNearestPathNode(nextPath, 'region')
      const district = getNearestPathNode(nextPath, 'district')

      if (node.type === 'region') {
        options.regions.push({ value: node.id, label: node.name })
      } else if (node.type === 'district') {
        options.districts.push({
          value: node.id,
          label: region ? `${region.name} / ${node.name}` : node.name,
        })
      } else if (node.type === 'area') {
        const prefix = [region?.name, district?.name].filter(Boolean).join(' / ')
        options.areas.push({
          value: node.id,
          label: prefix ? `${prefix} / ${node.name}` : node.name,
        })
      }

      if (node.children) walk(node.children, nextPath)
    }
  }

  walk(nodes, [])
  return options
}

export function OrganizationPage() {
  useDocumentTitle('组织架构')
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set())
  const [userTouchedExpansion, setUserTouchedExpansion] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createType, setCreateType] = useState<CreateNodeType>('region')
  const createFormRef = useRef<FormApi | null>(null)

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
  const selectedPath = useMemo(
    () => (selectedId ? findNodePath(tree, selectedId) : null),
    [tree, selectedId],
  )
  const selectedNode = useMemo(
    () => (selectedPath ? selectedPath[selectedPath.length - 1] : null),
    [selectedPath],
  )

  const stats = useMemo(() => computeOrgStats(tree), [tree])
  const createParentOptions = useMemo(() => collectCreateParentOptions(tree), [tree])

  const parentOptions = useMemo(() => {
    if (createType === 'district') return createParentOptions.regions
    if (createType === 'area') return createParentOptions.districts
    if (createType === 'campus') return createParentOptions.areas
    return []
  }, [createParentOptions, createType])

  const {
    mutate: createOrg,
    isPending: isCreatingOrg,
  } = useMutation({
    mutationFn: async (values: CreateOrgFormValues) => {
      const type = values.type
      const name = values.name?.trim()
      if (!type || !name) {
        throw new Error('请填写完整的新建信息')
      }

      const base = {
        name,
        description: values.description?.trim() || undefined,
        sort_order: values.sort_order ?? 0,
        is_active: values.is_active ?? true,
      }

      if (type === 'region') {
        return adminApi.createRegion(base as RegionCreate)
      }

      if (!values.parent_id) {
        throw new Error(`请选择${CREATE_PARENT_LABELS[type]}`)
      }

      if (type === 'district') {
        return adminApi.createDistrict({
          ...base,
          region_id: values.parent_id,
        } as DistrictCreate)
      }

      if (type === 'area') {
        return adminApi.createArea({
          ...base,
          district_id: values.parent_id,
        } as AreaCreate)
      }

      return adminApi.createCampus({
        ...base,
        area_id: values.parent_id,
        address: values.address?.trim() || undefined,
        contact_phone: values.contact_phone?.trim() || undefined,
        auto_create_departments: values.auto_create_departments ?? true,
      } as CampusCreate)
    },
    onSuccess: async (response, values) => {
      const type = values.type ?? createType
      const createdId = response.data?.id
      const listQueryKey = {
        region: 'admin-regions',
        district: 'admin-districts',
        area: 'admin-areas',
        campus: 'admin-campuses',
      }[type]

      toast.success(`${CREATE_TYPE_LABELS[type]}创建成功`)
      setCreateDialogOpen(false)
      setSearchTerm('')
      queryClient.invalidateQueries({ queryKey: [listQueryKey] })
      await queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })

      if (values.parent_id) {
        const parentPath = findNodePath(tree, values.parent_id)
        if (parentPath) {
          setUserTouchedExpansion(true)
          setManualExpanded((prev) => {
            const next = new Set(prev)
            for (const id of expandedIds) next.add(id)
            for (const node of parentPath) next.add(node.id)
            return next
          })
        }
      }

      if (createdId) {
        setSelectedId(createdId)
      }
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  const openCreateDialog = useCallback(() => {
    const nextType = getDefaultCreateType(selectedPath)
    const parentId = getDefaultParentId(selectedPath, nextType)
    setCreateType(nextType)
    setCreateDialogOpen(true)
    setTimeout(() => {
      createFormRef.current?.reset()
      createFormRef.current?.setValues({
        ...DEFAULT_CREATE_FORM_VALUES,
        type: nextType,
        parent_id: parentId,
      })
    }, 0)
  }, [selectedPath])

  const handleCreateTypeChange = useCallback((value: unknown) => {
    const nextType = value as CreateNodeType
    const parentId = getDefaultParentId(selectedPath, nextType)
    setCreateType(nextType)
    createFormRef.current?.setValues({
      type: nextType,
      parent_id: parentId,
    })
  }, [selectedPath])

  const handleCreateSubmit = useCallback((values: CreateOrgFormValues) => {
    createOrg({
      ...values,
      type: createType,
    })
  }, [createOrg, createType])

  const handleJumpToMissing = useCallback(() => {
    const target = findFirstMissingNode(tree)
    if (!target) return
    const ancestors = findAncestorIds(tree, target.id)
    if (ancestors.length > 0) {
      setUserTouchedExpansion(true)
      setManualExpanded((prev) => {
        const next = new Set(prev)
        // 把当前已展开（含 default）一并保留，再叠加祖先路径
        for (const id of expandedIds) next.add(id)
        for (const id of ancestors) next.add(id)
        return next
      })
    }
    setSelectedId(target.id)
  }, [tree, expandedIds])

  return (
    <div className="flex flex-col h-full">
      {/* 主从主体：左树 + 拖拽条 + 右面板 */}
      <div className="flex-1 flex min-h-0 px-4 pb-4 pt-3">
        {/* 左侧：树 */}
        <div
          className="shrink-0 flex flex-col border border-[var(--semi-color-border)] rounded-md overflow-hidden"
          style={{ width: treeWidth }}
        >
          <div className="px-3 pt-3 pb-2 border-b border-[var(--semi-color-border)] space-y-2">
            {/* 标题 + stats 副文（已折入树面板顶部） */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-sm font-semibold leading-none">组织架构</div>
              {!isLoading && (
                <div
                  className="text-[11px] leading-none tabular-nums truncate"
                  style={{
                    color: 'var(--semi-color-text-2)',
                    fontFeatureSettings: '"tnum" 1',
                  }}
                  title={`大区 ${stats.region_count} · 地区 ${stats.district_count} · 区域 ${stats.area_count} · 校区 ${stats.campus_count + stats.area_office_count} · 部门 ${stats.department_count} · 在任 ${stats.leader_count} · 员工 ${stats.employee_count}`}
                >
                  <span>{stats.region_count}</span>
                  <span style={{ color: 'var(--semi-color-text-3)' }}>·</span>
                  <span>{stats.district_count}</span>
                  <span style={{ color: 'var(--semi-color-text-3)' }}>·</span>
                  <span>{stats.area_count}</span>
                  <span style={{ color: 'var(--semi-color-text-3)' }}>·</span>
                  <span>
                    {stats.campus_count + stats.area_office_count}
                  </span>
                  <span style={{ color: 'var(--semi-color-text-3)' }}>·</span>
                  <span>{stats.department_count}</span>
                  <span
                    className="mx-1"
                    style={{ color: 'var(--semi-color-text-3)' }}
                  >
                    /
                  </span>
                  <span>{stats.leader_count}</span>
                  <span style={{ color: 'var(--semi-color-text-3)' }}>·</span>
                  <span>{stats.employee_count.toLocaleString('zh-CN')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
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
              <Button
                theme="solid"
                type="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={openCreateDialog}
              >
                新建
              </Button>
            </div>
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
            missingLeaderCount={stats.missing_leader_count}
            onJumpToMissing={handleJumpToMissing}
            onNodeDeleted={() => setSelectedId(null)}
          />
        </div>
      </div>

      <Modal
        title={`新建${CREATE_TYPE_LABELS[createType]}`}
        visible={createDialogOpen}
        onCancel={() => setCreateDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              loading={isCreatingOrg}
              onClick={() => createFormRef.current?.submitForm()}
            >
              保存
            </Button>
          </div>
        }
        width={760}
        style={{ maxWidth: 'calc(100vw - 48px)' }}
      >
        <Form
          getFormApi={(api) => { createFormRef.current = api }}
          onSubmit={handleCreateSubmit}
          labelPosition="top"
          initValues={{
            ...DEFAULT_CREATE_FORM_VALUES,
            type: createType,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              columnGap: 16,
            }}
          >
            <Form.Select
              field="type"
              label="类型"
              placeholder="请选择类型"
              optionList={CREATE_TYPE_OPTIONS}
              rules={[{ required: true, message: '请选择类型' }]}
              onChange={handleCreateTypeChange}
              style={{ width: '100%' }}
            />
            {createType !== 'region' && (
              <Form.Select
                field="parent_id"
                label={CREATE_PARENT_LABELS[createType]}
                placeholder={`请选择${CREATE_PARENT_LABELS[createType]}`}
                optionList={parentOptions}
                rules={[{ required: true, message: `请选择${CREATE_PARENT_LABELS[createType]}` }]}
                style={{ width: '100%' }}
              />
            )}
            <Form.Input
              field="name"
              label={`${CREATE_TYPE_LABELS[createType]}名称`}
              placeholder={`请输入${CREATE_TYPE_LABELS[createType]}名称`}
              rules={[
                { required: true, message: `请输入${CREATE_TYPE_LABELS[createType]}名称` },
                { max: 50, message: '名称最多50个字符' },
              ]}
            />
            {createType === 'campus' && (
              <>
                <Form.Input
                  field="address"
                  label="地址"
                  placeholder="请输入校区地址"
                  rules={[{ max: 200, message: '地址最多200个字符' }]}
                />
                <Form.Input
                  field="contact_phone"
                  label="联系电话"
                  placeholder="请输入联系电话"
                  rules={[{ max: 20, message: '联系电话最多20个字符' }]}
                />
              </>
            )}
            <Form.TextArea
              field="description"
              label="描述"
              placeholder="请输入描述信息"
              autosize={{ minRows: 2, maxRows: 4 }}
              rules={[{ max: 500, message: '描述最多500个字符' }]}
            />
            <Form.InputNumber
              field="sort_order"
              label="排序值"
              min={0}
              style={{ width: '100%' }}
            />
            <Form.Switch field="is_active" label="启用状态" />
            {createType === 'campus' && (
              <Form.Switch field="auto_create_departments" label="自动配置部门" />
            )}
          </div>
        </Form>
      </Modal>
    </div>
  )
}
