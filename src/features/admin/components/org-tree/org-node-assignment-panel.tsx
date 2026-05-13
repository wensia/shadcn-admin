/**
 * 组织节点右侧任命面板
 *
 * 显示当前选中节点的基础信息 + 本节点作用域下的任命列表 +
 * 新增/卸任/交接入口。节点类型决定允许的 role 白名单与 scope 列。
 *
 * Stage 1：只处理"本节点任命"，不做"下挂部门任命"和"任命历史"段（见 Stage 2/3）。
 * 设计文档：docs/dev/organization-admin-page-consolidation.md §7
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  Banner,
  Button,
  Collapse,
  Dropdown,
  Empty,
  Form,
  Modal,
  Popconfirm,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  IconCopy,
  IconDelete,
  IconDownload,
  IconPlus,
  IconQrCode,
  IconRefresh,
} from '@douyinfe/semi-icons'
import { MoreHorizontal } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { copyToClipboard } from '@/lib/utils'
import { adminApi, sourceChannelApi } from '../../api'
import {
  ASSIGNMENT_ROLE_LABELS,
  type AssignmentItem,
  type AssignmentListQuery,
  type AssignmentRole,
  type DirectVisitCampusTokenItem,
  type OrganizationTreeNode,
  type OrgTreeNodeType,
  type PositionItem,
  type QuickCreateEmployeeData,
  type QuickCreateEmployeeResult,
} from '../../types'
import { orgNodeTypeColor, orgNodeTypeLabel } from '../../lib/assignment-format'
import {
  AssignmentTable,
  CreateAssignmentDialog,
  TransferAssignmentDialog,
  type ScopeField,
} from '../assignments'
import { EmployeeEditDialog } from '../employees/employee-edit-dialog'
import { OrgNodeIcon } from './org-tree-icons'

const { Title, Text } = Typography

interface NodeScopeConfig {
  scopeField: ScopeField
  allowedRoles: AssignmentRole[]
  defaultRole: AssignmentRole
}

interface ScopeMember {
  employee_id: string
  name: string
  username: string
  phone: string | null
  email: string | null
  department_name: string | null
  position_name: string | null
}

interface PositionOption {
  id: string
  name: string
  level_display: string
}

interface QuickCreateScope {
  key: string
  scopeType: 'campus' | 'area' | 'district'
  scopeId: string
  scopeName: string
  submitDepartmentId: string
  sourceDepartmentId: string
  departmentName: string
  assignmentScope: {
    field: Extract<ScopeField, 'campus_department_id' | 'area_department_id' | 'district_department_id'>
    id: string
  }
}

interface MemberGroup {
  key: string
  departmentName: string
  items: ScopeMember[]
  createScope?: QuickCreateScope
}

interface QuickCreateEmployeeFormValues {
  name: string
  phone?: string
  email?: string
  position_id: string
  joined_at?: string
}

/** 节点类型 → 该节点可承载的作用域列 + 角色白名单 */
function getNodeScopeConfig(type: OrgTreeNodeType): NodeScopeConfig | null {
  switch (type) {
    case 'campus':
    case 'area_office':
      return {
        scopeField: 'campus_id',
        allowedRoles: ['principal', 'operation_assistant', 'vice_principal'],
        defaultRole: 'principal',
      }
    case 'area':
      return {
        scopeField: 'area_id',
        allowedRoles: ['area_director'],
        defaultRole: 'area_director',
      }
    case 'campus_department':
      return {
        scopeField: 'campus_department_id',
        allowedRoles: ['dept_manager', 'dept_deputy', 'dept_supervisor'],
        defaultRole: 'dept_manager',
      }
    case 'area_department':
      return {
        scopeField: 'area_department_id',
        allowedRoles: [
          'area_manager',
          'teaching_supervisor',
          'dept_manager',
          'dept_deputy',
          'dept_supervisor',
        ],
        defaultRole: 'dept_manager',
      }
    case 'district_department':
      return {
        scopeField: 'district_department_id',
        allowedRoles: ['dept_manager', 'dept_deputy', 'dept_supervisor'],
        defaultRole: 'dept_manager',
      }
    case 'region':
    case 'district':
    default:
      return null
  }
}

function findNodePath(
  nodes: OrganizationTreeNode[],
  id: string,
  path: OrganizationTreeNode[] = [],
): OrganizationTreeNode[] | null {
  for (const node of nodes) {
    const nextPath = [...path, node]
    if (node.id === id) return nextPath
    const childPath = node.children?.length ? findNodePath(node.children, id, nextPath) : null
    if (childPath) return childPath
  }
  return null
}

function getDepartmentCreateScope(
  departmentNode: OrganizationTreeNode,
  parentNode: OrganizationTreeNode | undefined,
): QuickCreateScope | null {
  if (!departmentNode.department_id || !parentNode) return null

  if (
    departmentNode.type === 'campus_department' &&
    (parentNode.type === 'campus' || parentNode.type === 'area_office')
  ) {
    return {
      key: `${departmentNode.type}:${departmentNode.id}`,
      scopeType: 'campus',
      scopeId: parentNode.id,
      scopeName: parentNode.name,
      submitDepartmentId: departmentNode.id,
      sourceDepartmentId: departmentNode.department_id,
      departmentName: departmentNode.name,
      assignmentScope: {
        field: 'campus_department_id',
        id: departmentNode.id,
      },
    }
  }

  if (departmentNode.type === 'area_department' && parentNode.type === 'area') {
    return {
      key: `${departmentNode.type}:${departmentNode.id}`,
      scopeType: 'area',
      scopeId: parentNode.id,
      scopeName: parentNode.name,
      submitDepartmentId: departmentNode.department_id,
      sourceDepartmentId: departmentNode.department_id,
      departmentName: departmentNode.name,
      assignmentScope: {
        field: 'area_department_id',
        id: departmentNode.id,
      },
    }
  }

  if (departmentNode.type === 'district_department' && parentNode.type === 'district') {
    return {
      key: `${departmentNode.type}:${departmentNode.id}`,
      scopeType: 'district',
      scopeId: parentNode.id,
      scopeName: parentNode.name,
      submitDepartmentId: departmentNode.department_id,
      sourceDepartmentId: departmentNode.department_id,
      departmentName: departmentNode.name,
      assignmentScope: {
        field: 'district_department_id',
        id: departmentNode.id,
      },
    }
  }

  return null
}

export interface OrgNodeAssignmentPanelProps {
  node: OrganizationTreeNode | null
  tree: OrganizationTreeNode[]
  onNodeDeleted?: () => void
}

export function OrgNodeAssignmentPanel({ node, tree, onNodeDeleted }: OrgNodeAssignmentPanelProps) {
  const queryClient = useQueryClient()
  const quickCreateFormRef = useRef<FormApi | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [departmentAssignmentGroup, setDepartmentAssignmentGroup] = useState<MemberGroup | null>(null)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [quickCreateGroup, setQuickCreateGroup] = useState<MemberGroup | null>(null)
  const [quickCreateResult, setQuickCreateResult] = useState<QuickCreateEmployeeResult | null>(null)
  const [editingMember, setEditingMember] = useState<ScopeMember | null>(null)
  const [directVisitCampusId, setDirectVisitCampusId] = useState<string | null>(null)
  const [directVisitQr, setDirectVisitQr] = useState<{ link: string; url: string } | null>(null)
  const [transferItem, setTransferItem] = useState<AssignmentItem | null>(null)

  const config = useMemo(
    () => (node ? getNodeScopeConfig(node.type) : null),
    [node],
  )

  const listQuery = useMemo<AssignmentListQuery | null>(() => {
    if (!node || !config) return null
    return { [config.scopeField]: node.id, active_only: true } as AssignmentListQuery
  }, [node, config])

  const queryKey = useMemo(
    () => ['admin-assignments', 'scoped', listQuery] as const,
    [listQuery],
  )

  const {
    data: assignments = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!listQuery) return []
      const response = await adminApi.listAssignments(listQuery)
      return response.data || []
    },
    enabled: !!listQuery,
  })

  const relieveMutation = useMutation({
    mutationFn: (id: string) => adminApi.relieveAssignment(id, {}),
    onSuccess: () => {
      toast.success('卸任成功')
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '卸任失败'),
  })

  // 删除部门（仅员工为空时允许）
  const deleteDeptMutation = useMutation({
    mutationFn: async () => {
      if (!node) return
      if (node.type === 'campus_department') {
        return adminApi.deleteCampusDepartment(node.id)
      }
      if (node.type === 'area_department') {
        return adminApi.deleteAreaDepartment(node.id)
      }
      if (node.type === 'district_department') {
        return adminApi.deleteDistrictDepartment(node.id)
      }
      throw new Error('该节点类型不支持删除')
    },
    onSuccess: () => {
      toast.success('部门已删除')
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
      onNodeDeleted?.()
    },
    onError: (error: Error) => showApiErrorToast(error, '删除失败'),
  })

  const isDeptNode =
    node?.type === 'campus_department' ||
    node?.type === 'area_department' ||
    node?.type === 'district_department'
  const assignmentActionLabel = isDeptNode ? '添加负责人' : '新增任命'
  const employeeCount = node?.employee_count ?? 0
  const canDelete = isDeptNode && employeeCount === 0
  const selectedPath = useMemo(
    () => (node ? findNodePath(tree, node.id) : null),
    [node, tree],
  )
  const directVisitOperationAssistant = node?.type === 'campus'
    ? node.leaders?.find((item) => item.role === 'operation_assistant' && item.rank === 0)
    : null
  const directVisitCampus = node?.type === 'campus'
    ? {
        id: node.id,
        name: node.name,
        is_active: node.is_active,
        operation_assistant_id: directVisitOperationAssistant?.employee_id ?? null,
        operation_assistant_name: directVisitOperationAssistant?.employee_name ?? null,
      }
    : null
  const directVisitVisible = !!directVisitCampus && directVisitCampusId === directVisitCampus.id

  // 部门成员列表（仅在叶子部门节点或 campus/area 节点上查）
  const memberScopeType: 'campus_department' | 'area_department' | 'district_department' | 'campus' | 'area' | null =
    node?.type === 'campus_department' ? 'campus_department'
    : node?.type === 'area_department' ? 'area_department'
    : node?.type === 'district_department' ? 'district_department'
    : node?.type === 'campus' || node?.type === 'area_office' ? 'campus'
    : node?.type === 'area' ? 'area'
    : null
  const memberScopeId = node?.id

  const { data: members = [], isLoading: membersLoading } = useQuery<ScopeMember[]>({
    queryKey: ['scope-members', memberScopeType, memberScopeId],
    queryFn: async () => {
      if (!memberScopeType || !memberScopeId) return []
      const response = await adminApi.listScopeMembers({
        scope_type: memberScopeType,
        scope_id: memberScopeId,
      })
      return response.data || []
    },
    enabled: !!memberScopeType && !!memberScopeId,
  })

  const { data: directVisitTokensData, isLoading: isDirectVisitTokensLoading } = useQuery({
    queryKey: ['admin-direct-visit-campus-tokens'],
    queryFn: () => sourceChannelApi.getDirectVisitCampusTokens(),
    enabled: directVisitVisible,
  })

  const directVisitTokenItem: DirectVisitCampusTokenItem | undefined = directVisitCampus
    ? directVisitTokensData?.items.find((item) => item.campus_id === directVisitCampus.id)
    : undefined

  const directVisitLink = directVisitTokenItem?.token
    ? `${window.location.origin}/direct-visit?token=${encodeURIComponent(directVisitTokenItem.token)}`
    : ''
  const directVisitQrDataUrl = directVisitQr?.link === directVisitLink ? directVisitQr.url : ''
  const directVisitOperationAssistantId = directVisitTokenItem
    ? directVisitTokenItem.operation_assistant_id ?? null
    : directVisitCampus?.operation_assistant_id ?? null
  const hasDirectVisitOperationAssistant = Boolean(directVisitOperationAssistantId)

  const generateDirectVisitMutation = useMutation({
    mutationFn: (campusId: string) => sourceChannelApi.createDirectVisitCampusToken(campusId),
    onSuccess: async () => {
      toast.success('直访码已生成')
      await queryClient.invalidateQueries({ queryKey: ['admin-direct-visit-campus-tokens'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '生成直访码失败'),
  })

  const rotateDirectVisitMutation = useMutation({
    mutationFn: (campusId: string) => sourceChannelApi.rotateDirectVisitCampusToken(campusId),
    onSuccess: async () => {
      toast.success('直访码已更新')
      await queryClient.invalidateQueries({ queryKey: ['admin-direct-visit-campus-tokens'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '更新直访码失败'),
  })

  useEffect(() => {
    let cancelled = false
    if (!directVisitLink) {
      return
    }

    QRCode.toDataURL(directVisitLink, {
      width: 240,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((url) => { if (!cancelled) setDirectVisitQr({ link: directVisitLink, url }) })
      .catch(() => { if (!cancelled) setDirectVisitQr(null) })

    return () => { cancelled = true }
  }, [directVisitLink])

  const quickCreateScopes = useMemo(() => {
    if (!node) return []
    const scopes: QuickCreateScope[] = []

    const addDepartmentNode = (
      departmentNode: OrganizationTreeNode,
      parentNode: OrganizationTreeNode | undefined,
    ) => {
      const scope = getDepartmentCreateScope(departmentNode, parentNode)
      if (scope) scopes.push(scope)
    }

    if (node.type === 'campus' || node.type === 'area_office') {
      for (const child of node.children ?? []) {
        if (child.type === 'campus_department') addDepartmentNode(child, node)
      }
      return scopes
    }

    if (node.type === 'area') {
      for (const child of node.children ?? []) {
        if (child.type === 'area_department') addDepartmentNode(child, node)
      }
      return scopes
    }

    if (isDeptNode && selectedPath) {
      addDepartmentNode(node, selectedPath[selectedPath.length - 2])
    }

    return scopes
  }, [isDeptNode, node, selectedPath])

  const memberGroups = useMemo(() => {
    const groups = new Map<string, MemberGroup>()
    const groupsByDepartmentName = new Map<string, MemberGroup>()

    for (const scope of quickCreateScopes) {
      const group: MemberGroup = {
        key: scope.key,
        departmentName: scope.departmentName,
        items: [],
        createScope: scope,
      }
      groups.set(group.key, group)
      groupsByDepartmentName.set(scope.departmentName, group)
    }

    for (const member of members) {
      const departmentName = member.department_name || (isDeptNode ? node?.name : null) || '未分配部门'
      const group = groupsByDepartmentName.get(departmentName)

      if (group) {
        group.items.push(member)
      } else {
        const fallbackGroup: MemberGroup = {
          key: `unresolved:${departmentName}`,
          departmentName,
          items: [member],
        }
        groups.set(fallbackGroup.key, fallbackGroup)
        groupsByDepartmentName.set(departmentName, fallbackGroup)
      }
    }

    return Array.from(groups.values()).sort((a, b) => {
      const countDiff = b.items.length - a.items.length
      if (countDiff !== 0) return countDiff
      return a.departmentName.localeCompare(b.departmentName, 'zh-CN')
    })
  }, [isDeptNode, members, node?.name, quickCreateScopes])

  const assignmentLabelsByGroupAndEmployee = useMemo(() => {
    const result = new Map<string, Map<string, string[]>>()
    const addLeaders = (groupKey: string, leaders?: OrganizationTreeNode['leaders']) => {
      if (!leaders?.length) return
      const employeeMap = result.get(groupKey) ?? new Map<string, string[]>()
      for (const leader of leaders) {
        const label = leader.role_label ?? ASSIGNMENT_ROLE_LABELS[leader.role as AssignmentRole] ?? leader.role
        const labels = employeeMap.get(leader.employee_id) ?? []
        if (!labels.includes(label)) labels.push(label)
        employeeMap.set(leader.employee_id, labels)
      }
      result.set(groupKey, employeeMap)
    }

    if (!node) return result
    if (isDeptNode) {
      addLeaders(`${node.type}:${node.id}`, node.leaders)
    }
    for (const child of node.children ?? []) {
      if (
        child.type === 'campus_department' ||
        child.type === 'area_department' ||
        child.type === 'district_department'
      ) {
        addLeaders(`${child.type}:${child.id}`, child.leaders)
      }
    }
    return result
  }, [isDeptNode, node])

  const quickCreateScope = quickCreateGroup?.createScope ?? null
  const departmentAssignmentScope = departmentAssignmentGroup?.createScope?.assignmentScope ?? null
  const assignmentDialogOpen = createOpen || !!departmentAssignmentScope
  const assignmentDialogScope = departmentAssignmentScope ?? (config ? { field: config.scopeField, id: node?.id ?? '' } : null)
  const assignmentDialogRoles = departmentAssignmentScope
    ? (['dept_manager', 'dept_deputy', 'dept_supervisor'] satisfies AssignmentRole[])
    : config?.allowedRoles
  const assignmentDialogDefaultRole = departmentAssignmentScope ? 'dept_manager' : config?.defaultRole
  const assignmentDialogTitle = departmentAssignmentScope
    ? `添加${departmentAssignmentGroup?.departmentName ?? ''}负责人`
    : assignmentActionLabel

  const { data: quickCreatePositions = [], isLoading: quickCreatePositionsLoading } = useQuery<PositionOption[]>({
    queryKey: ['org-member-quick-create-positions', quickCreateScope],
    queryFn: async () => {
      if (!quickCreateScope) return []
      if (quickCreateScope.scopeType === 'campus') {
        const response = await adminApi.getCampusDepartmentPositionsSimple(
          quickCreateScope.submitDepartmentId,
        )
        return response.data || []
      }

      const response = await adminApi.getPositions({ size: 200, is_active: true })
      const positions = (response.data?.items || []) as PositionItem[]
      const scopedPositions = positions.filter((position) =>
        position.department_ids?.includes(quickCreateScope.sourceDepartmentId),
      )
      return (scopedPositions.length > 0 ? scopedPositions : positions).map((position) => ({
        id: position.id,
        name: position.name,
        level_display: position.level_display,
      }))
    },
    enabled: quickCreateOpen && !!quickCreateScope,
  })

  const quickCreateMutation = useMutation({
    mutationFn: (data: QuickCreateEmployeeData) => adminApi.quickCreateEmployee(data),
    onSuccess: (response) => {
      toast.success('员工创建成功')
      setQuickCreateOpen(false)
      setQuickCreateResult(response.data ?? null)
      quickCreateFormRef.current?.reset()
      queryClient.invalidateQueries({ queryKey: ['scope-members'] })
      queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '创建失败'),
  })

  const leaveEmployeeMutation = useMutation({
    mutationFn: ({ employeeId }: { employeeId: string; employeeName: string }) =>
      adminApi.updateEmployeeStatus(employeeId, { is_active: false }),
    onSuccess: (_response, variables) => {
      toast.success(`已将 ${variables.employeeName} 设为离职`)
      queryClient.invalidateQueries({ queryKey: ['scope-members'] })
      queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
      queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '离职操作失败'),
  })

  const openQuickCreate = (group: MemberGroup) => {
    if (!group.createScope) {
      toast.warning('无法识别该部门的组织范围')
      return
    }
    setQuickCreateGroup(group)
    setQuickCreateOpen(true)
  }

  const openDepartmentAssignment = (group: MemberGroup) => {
    if (!group.createScope) {
      toast.warning('无法识别该部门的组织范围')
      return
    }
    setCreateOpen(false)
    setDepartmentAssignmentGroup(group)
  }

  const closeQuickCreate = () => {
    setQuickCreateOpen(false)
    quickCreateFormRef.current?.reset()
  }

  const closeAssignmentDialog = () => {
    setCreateOpen(false)
    setDepartmentAssignmentGroup(null)
  }

  const closeDirectVisit = () => {
    setDirectVisitCampusId(null)
    setDirectVisitQr(null)
  }

  const openEditMember = (member: ScopeMember) => {
    setEditingMember(member)
  }

  const handleCopyDirectVisitLink = async () => {
    if (!directVisitLink) return
    const success = await copyToClipboard(directVisitLink)
    if (success) {
      toast.success('直访链接已复制')
    } else {
      toast.error('复制失败')
    }
  }

  const handleDownloadDirectVisitQr = () => {
    if (!directVisitQrDataUrl || !directVisitCampus) return
    const link = document.createElement('a')
    link.href = directVisitQrDataUrl
    link.download = `${directVisitCampus.name}-直访码.png`
    link.click()
  }

  const handleRotateDirectVisitToken = () => {
    if (!directVisitCampus) return
    Modal.confirm({
      title: '更新直访码',
      content: '更新后旧二维码将无法继续访问，需要重新张贴新二维码。',
      okText: '更新',
      cancelText: '取消',
      onOk: () => rotateDirectVisitMutation.mutate(directVisitCampus.id),
    })
  }

  const handleQuickCreateSubmit = (values: Record<string, unknown>) => {
    if (!quickCreateScope) {
      toast.warning('请选择部门')
      return
    }

    const formValues = values as unknown as QuickCreateEmployeeFormValues
    const data: QuickCreateEmployeeData = {
      name: formValues.name,
      phone: formValues.phone || undefined,
      email: formValues.email || undefined,
      joined_at: formValues.joined_at || undefined,
      scope_type: quickCreateScope.scopeType,
      department_id: quickCreateScope.submitDepartmentId,
      position_id: formValues.position_id,
    }

    if (quickCreateScope.scopeType === 'campus') data.campus_id = quickCreateScope.scopeId
    if (quickCreateScope.scopeType === 'area') data.area_id = quickCreateScope.scopeId
    if (quickCreateScope.scopeType === 'district') data.district_id = quickCreateScope.scopeId

    quickCreateMutation.mutate(data)
  }

  const handleLeaveEmployee = (member: ScopeMember) => {
    leaveEmployeeMutation.mutate({
      employeeId: member.employee_id,
      employeeName: member.name,
    })
  }

  const confirmLeaveEmployee = (member: ScopeMember) => {
    Modal.confirm({
      title: `确认将「${member.name}」设为离职？`,
      content: '离职后员工账号会停用，并从当前部门成员和组织任命中移除。',
      okText: '离职',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => handleLeaveEmployee(member),
    })
  }

  const invalidateAfterMutation = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
    queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
  }

  if (!node) {
    return (
      <div className="flex items-center justify-center h-full text-center px-8">
        <Empty
          title="请选择一个组织节点"
          description="在左侧树中选择校区、区域或部门，在此管理其负责人任命"
        />
      </div>
    )
  }

  const missing = node.missing_singleton_roles ?? []

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 头部：节点基础信息 */}
      <div className="px-4 py-2 border-b border-[var(--semi-color-border)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-x-3 gap-y-1 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <OrgNodeIcon type={node.type} />
              <Title
                heading={6}
                style={{ margin: 0, maxWidth: 220, lineHeight: '24px' }}
                ellipsis={{ showTooltip: true }}
              >
                {node.name}
              </Title>
            </div>
            <Tag size="small" color={orgNodeTypeColor(node.type)}>
              {orgNodeTypeLabel(node.type)}
            </Tag>
            {!node.is_active && (
              <Tag size="small" color="grey">
                已停用
              </Tag>
            )}
            {typeof node.employee_count === 'number' && (
              <div className="flex items-center gap-1">
                <Text type="tertiary" size="small">在任员工</Text>
                <Text strong size="small">{node.employee_count}</Text>
              </div>
            )}
            {typeof node.department_count === 'number' && (
              <div className="flex items-center gap-1">
                <Text type="tertiary" size="small">下挂部门</Text>
                <Text strong size="small">{node.department_count}</Text>
              </div>
            )}
            {node.address && (
              <Text
                type="tertiary"
                size="small"
                ellipsis={{ showTooltip: true }}
                style={{ maxWidth: 180 }}
              >
                {node.address}
              </Text>
            )}
            {node.contact_phone && (
              <Text type="tertiary" size="small">
                {node.contact_phone}
              </Text>
            )}
            {missing.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Text type="warning" size="small">
                  未任命：
                </Text>
                {missing.map((r) => (
                  <Tag key={r} size="small" color="orange">
                    {ASSIGNMENT_ROLE_LABELS[r as AssignmentRole] ?? r}
                  </Tag>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {node.type === 'campus' && (
              <Button
                theme="outline"
                type="primary"
                size="small"
                icon={<IconQrCode />}
                disabled={!node.is_active}
                onClick={() => setDirectVisitCampusId(node.id)}
              >
                直访码
              </Button>
            )}
            {config && (
              <Button
                theme="solid"
                type="primary"
                size="small"
                icon={<IconPlus />}
                onClick={() => {
                  setDepartmentAssignmentGroup(null)
                  setCreateOpen(true)
                }}
              >
                {assignmentActionLabel}
              </Button>
            )}
            {isDeptNode && (
              canDelete ? (
                <Popconfirm
                  title="确认删除该部门？"
                  content="删除后不可恢复。负责人任命会自动卸任。"
                  onConfirm={() => deleteDeptMutation.mutate()}
                  okText="删除"
                  cancelText="取消"
                  okType="danger"
                >
                  <Button
                    type="danger"
                    size="small"
                    icon={<IconDelete />}
                    loading={deleteDeptMutation.isPending}
                  >
                    删除部门
                  </Button>
                </Popconfirm>
              ) : (
                <Button
                  type="danger"
                  size="small"
                  icon={<IconDelete />}
                  disabled
                  title={`该部门下有 ${employeeCount} 名员工，需先全部转出或停用`}
                >
                  删除部门
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 任命列表主体 */}
      <div className="flex-1 p-4">
        {!config ? (
          <Empty
            title="此节点类型不承载任命"
            description={
              node.type === 'region' || node.type === 'district'
                ? `${orgNodeTypeLabel(node.type)}本身不设独立负责人；展开到下属节点后可管理任命`
                : undefined
            }
            style={{ padding: '48px 0' }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <Text type="tertiary" size="small">
                在任负责人
              </Text>
              <Button
                size="small"
                theme="borderless"
                icon={<IconRefresh />}
                loading={isFetching}
                onClick={() => refetch()}
              >
                刷新
              </Button>
            </div>
            <AssignmentTable
              items={assignments}
              isLoading={isLoading}
              isHistory={false}
              onRelieve={(id) => relieveMutation.mutate(id)}
              onTransfer={(a) => setTransferItem(a)}
              hideScope
              emptyTitle={isDeptNode ? '暂无负责人' : '暂无任命'}
              emptyDescription={`点击右上角"${assignmentActionLabel}"按钮开始`}
            />
          </>
        )}

        {/* 部门成员列表 */}
        {memberScopeType && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Text type="tertiary" size="small">
                    部门成员
                  </Text>
                  <Tag size="small" color="grey">
                    {members.length}
                  </Tag>
                </div>
                <Text type="tertiary" size="small">
                  岗位来自员工身份；任命只表示职责和权限，不会修改岗位。
                </Text>
              </div>
            </div>
            {membersLoading ? (
              <Text type="tertiary" size="small">加载中...</Text>
            ) : memberGroups.length === 0 ? (
              <Empty
                title="暂无成员"
                description={
                  isDeptNode
                    ? '该部门下暂无在任员工'
                    : '该单位下暂无直接在任员工'
                }
                style={{ padding: '16px 0' }}
              />
            ) : (
              <Collapse
                key={node.id}
                expandIconPosition="left"
                keepDOM
                style={{
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: 'var(--semi-color-bg-0)',
                }}
              >
                {memberGroups.map((group) => (
                  <Collapse.Panel
                    key={group.key}
                    itemKey={group.key}
                    header={
                      <div className="flex w-full min-w-0 items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Text
                            strong
                            ellipsis={{ showTooltip: true }}
                            style={{ maxWidth: 220 }}
                          >
                            {group.departmentName}
                          </Text>
                          <Tag size="small" color="grey">
                            {group.items.length}
                          </Tag>
                        </div>
                        {group.createScope && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              size="small"
                              theme="light"
                              type="tertiary"
                              style={{ border: '1px solid var(--semi-color-border)' }}
                              onClick={(event) => {
                                event.stopPropagation()
                                openDepartmentAssignment(group)
                              }}
                            >
                              添加负责人
                            </Button>
                            <Button
                              size="small"
                              theme="light"
                              type="primary"
                              style={{ border: '1px solid var(--semi-color-border)' }}
                              onClick={(event) => {
                                event.stopPropagation()
                                openQuickCreate(group)
                              }}
                            >
                              添加员工
                            </Button>
                          </div>
                        )}
                      </div>
                    }
                  >
                    {group.items.length === 0 ? (
                      <Empty
                        title="暂无成员"
                        description="可点击右上角添加员工"
                        style={{ padding: '16px 0' }}
                      />
                    ) : (
                      <div className="flex flex-col divide-y">
                        {group.items.map((m) => {
                          const assignmentLabels = assignmentLabelsByGroupAndEmployee
                            .get(group.key)
                            ?.get(m.employee_id) ?? []
                          return (
                            <div
                              key={m.employee_id}
                              className="flex items-center gap-3 px-3 py-2 text-sm"
                            >
                              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                <Text strong>{m.name}</Text>
                                {m.position_name && (
                                  <Tag size="small" color="blue">
                                    岗位：{m.position_name}
                                  </Tag>
                                )}
                                {assignmentLabels.map((label) => (
                                  <Tag key={label} size="small" color="green">
                                    任命：{label}
                                  </Tag>
                                ))}
                              </div>
                              <div
                                className="hidden md:flex flex-col items-end text-xs shrink-0"
                                style={{ color: 'var(--semi-color-text-2)' }}
                              >
                                {m.phone && <span>{m.phone}</span>}
                                {m.email && (
                                  <span className="truncate max-w-[200px]">{m.email}</span>
                                )}
                              </div>
                              <Dropdown
                                trigger="click"
                                position="bottomRight"
                                clickToHide
                                render={
                                  <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => openEditMember(m)}>
                                      编辑员工信息
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => confirmLeaveEmployee(m)}>
                                      离职
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                }
                              >
                                <Button
                                  size="small"
                                  theme="borderless"
                                  type="tertiary"
                                  icon={<MoreHorizontal size={16} />}
                                  loading={
                                    leaveEmployeeMutation.isPending &&
                                    leaveEmployeeMutation.variables?.employeeId === m.employee_id
                                  }
                                  title="更多操作"
                                />
                              </Dropdown>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Collapse.Panel>
                ))}
              </Collapse>
            )}
          </div>
        )}
      </div>

      {assignmentDialogScope && assignmentDialogRoles && assignmentDialogDefaultRole && (
        <CreateAssignmentDialog
          open={assignmentDialogOpen}
          onClose={closeAssignmentDialog}
          onSuccess={invalidateAfterMutation}
          initialRole={assignmentDialogDefaultRole}
          initialScope={assignmentDialogScope}
          roleWhitelist={assignmentDialogRoles}
          lockScope
          title={assignmentDialogTitle}
        />
      )}

      <Modal
        title={quickCreateScope ? `添加员工到 ${quickCreateScope.departmentName}` : '添加员工'}
        visible={quickCreateOpen}
        onCancel={closeQuickCreate}
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeQuickCreate}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              loading={quickCreateMutation.isPending}
              onClick={() => quickCreateFormRef.current?.submitForm()}
            >
              创建
            </Button>
          </div>
        }
      >
        {quickCreateScope && (
          <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
            {quickCreateScope.scopeName} / {quickCreateScope.departmentName}
          </Text>
        )}
        <Form
          key={quickCreateScope?.key}
          getFormApi={(api) => { quickCreateFormRef.current = api }}
          onSubmit={handleQuickCreateSubmit}
          labelPosition="top"
        >
          <Form.Input
            field="name"
            label="姓名"
            placeholder="请输入姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Input field="phone" label="手机号" placeholder="可选" />
            <Form.Input field="email" label="邮箱" placeholder="可选" />
          </div>
          <Form.Select
            field="position_id"
            label="职位"
            placeholder="请选择职位"
            optionList={quickCreatePositions.map((position) => ({
              label: `${position.name} (${position.level_display})`,
              value: position.id,
            }))}
            loading={quickCreatePositionsLoading}
            disabled={!quickCreateScope}
            filter
            rules={[{ required: true, message: '请选择职位' }]}
            style={{ width: '100%' }}
          />
          <Form.DatePicker
            field="joined_at"
            label="入职日期"
            type="date"
            placeholder="默认今天"
            style={{ width: '100%' }}
          />
        </Form>
      </Modal>

      <Modal
        title="员工创建成功"
        visible={!!quickCreateResult}
        onCancel={() => setQuickCreateResult(null)}
        width={480}
        footer={
          <Button theme="solid" type="primary" onClick={() => setQuickCreateResult(null)}>
            关闭
          </Button>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
          员工「{quickCreateResult?.name}」已创建成功，请记录以下登录信息。
        </Text>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 12,
            borderRadius: 6,
            background: 'var(--semi-color-fill-0)',
          }}
        >
          <div>
            <Text strong size="small">用户名：</Text>
            <Text code>{quickCreateResult?.username}</Text>
          </div>
          <div>
            <Text strong size="small">初始密码：</Text>
            <Text code>{quickCreateResult?.password}</Text>
          </div>
        </div>
      </Modal>

      <EmployeeEditDialog
        open={!!editingMember}
        employeeId={editingMember?.employee_id ?? null}
        lookupKeyword={editingMember?.username || editingMember?.name}
        onClose={() => setEditingMember(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['scope-members'] })
          queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
          queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
          queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
          queryClient.invalidateQueries({ queryKey: ['admin-employee-identities'] })
        }}
      />

      <Modal
        title={directVisitCampus ? `${directVisitCampus.name} · 直访码` : '直访码'}
        visible={directVisitVisible}
        onCancel={closeDirectVisit}
        footer={null}
        style={{ maxWidth: 520 }}
      >
        {directVisitCampus && (
          isDirectVisitTokensLoading ? (
            <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : !directVisitCampus.is_active ? (
            <Banner
              type="warning"
              fullMode={false}
              closeIcon={null}
              title="校区已停用"
              description="停用校区不能生成直访码。"
            />
          ) : !hasDirectVisitOperationAssistant && !directVisitTokenItem?.token ? (
            <Banner
              type="warning"
              fullMode={false}
              closeIcon={null}
              title="未任命运营助理"
              description="请先在组织任命中为该校区任命运营助理，再生成直访码。"
            />
          ) : !directVisitTokenItem?.token ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Banner
                type="info"
                fullMode={false}
                closeIcon={null}
                title="尚未生成直访码"
                description="生成后家长可扫码进入手机端直访登记页。"
              />
              <Button
                theme="solid"
                icon={<IconQrCode />}
                loading={generateDirectVisitMutation.isPending}
                onClick={() => generateDirectVisitMutation.mutate(directVisitCampus.id)}
              >
                生成直访码
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingBottom: 20 }}>
              {!hasDirectVisitOperationAssistant && (
                <Banner
                  type="warning"
                  fullMode={false}
                  closeIcon={null}
                  title="未任命运营助理"
                  description="当前只能查看已有直访码；补齐运营助理后才能更新直访码。"
                />
              )}

              <div
                style={{
                  width: 240,
                  height: 240,
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                }}
              >
                {directVisitQrDataUrl ? (
                  <img src={directVisitQrDataUrl} alt="校区直访二维码" width={220} height={220} />
                ) : (
                  <Spin />
                )}
              </div>

              <div
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid var(--semi-color-border)',
                  borderRadius: 8,
                  background: 'var(--semi-color-fill-0)',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                  wordBreak: 'break-all',
                }}
              >
                {directVisitLink}
              </div>

              {directVisitTokenItem.updated_at && (
                <Text type="tertiary" size="small">
                  更新时间：{new Date(directVisitTokenItem.updated_at).toLocaleString('zh-CN')}
                </Text>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                <Button icon={<IconCopy />} onClick={handleCopyDirectVisitLink}>
                  复制链接
                </Button>
                <Button icon={<IconDownload />} onClick={handleDownloadDirectVisitQr}>
                  下载二维码
                </Button>
              </div>

              <Button
                type="warning"
                theme="outline"
                icon={<IconRefresh />}
                loading={generateDirectVisitMutation.isPending || rotateDirectVisitMutation.isPending}
                disabled={!hasDirectVisitOperationAssistant}
                onClick={handleRotateDirectVisitToken}
                block
              >
                更新直访码
              </Button>
            </div>
          )
        )}
      </Modal>

      <TransferAssignmentDialog
        open={!!transferItem}
        onClose={() => setTransferItem(null)}
        assignment={transferItem}
        onSuccess={invalidateAfterMutation}
      />
    </div>
  )
}
