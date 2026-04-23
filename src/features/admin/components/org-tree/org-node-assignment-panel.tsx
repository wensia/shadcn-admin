/**
 * 组织节点右侧任命面板
 *
 * 显示当前选中节点的基础信息 + 本节点作用域下的任命列表 +
 * 新增/卸任/交接入口。节点类型决定允许的 role 白名单与 scope 列。
 *
 * Stage 1：只处理"本节点任命"，不做"下挂部门任命"和"任命历史"段（见 Stage 2/3）。
 * 设计文档：docs/dev/organization-admin-page-consolidation.md §7
 */

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Descriptions,
  Empty,
  Tag,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh } from '@douyinfe/semi-icons'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { adminApi } from '../../api'
import {
  ASSIGNMENT_ROLE_LABELS,
  type AssignmentItem,
  type AssignmentListQuery,
  type AssignmentRole,
  type OrganizationTreeNode,
  type OrgTreeNodeType,
} from '../../types'
import { orgNodeTypeColor, orgNodeTypeLabel } from '../../lib/assignment-format'
import {
  AssignmentTable,
  CreateAssignmentDialog,
  TransferAssignmentDialog,
  type ScopeField,
} from '../assignments'
import { OrgNodeIcon } from './org-tree-icons'

const { Title, Text } = Typography

interface NodeScopeConfig {
  scopeField: ScopeField
  allowedRoles: AssignmentRole[]
  defaultRole: AssignmentRole
}

/** 节点类型 → 该节点可承载的作用域列 + 角色白名单 */
function getNodeScopeConfig(type: OrgTreeNodeType): NodeScopeConfig | null {
  switch (type) {
    case 'campus':
    case 'area_office':
      return {
        scopeField: 'campus_id',
        allowedRoles: ['principal', 'vice_principal'],
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

export interface OrgNodeAssignmentPanelProps {
  node: OrganizationTreeNode | null
}

export function OrgNodeAssignmentPanel({ node }: OrgNodeAssignmentPanelProps) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [transferItem, setTransferItem] = useState<AssignmentItem | null>(null)

  const config = node ? getNodeScopeConfig(node.type) : null

  const listQuery = useMemo<AssignmentListQuery | null>(() => {
    if (!node || !config) return null
    return { [config.scopeField]: node.id, active_only: true } as AssignmentListQuery
  }, [node, config])

  const queryKey = useMemo(
    () => ['admin-assignments', 'scoped', config?.scopeField, node?.id],
    [config?.scopeField, node?.id],
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
      <div className="p-4 border-b border-[var(--semi-color-border)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <OrgNodeIcon type={node.type} />
            <Title heading={5} style={{ margin: 0 }} ellipsis={{ showTooltip: true }}>
              {node.name}
            </Title>
            <Tag size="small" color={orgNodeTypeColor(node.type)}>
              {orgNodeTypeLabel(node.type)}
            </Tag>
            {!node.is_active && (
              <Tag size="small" color="light-grey">
                已停用
              </Tag>
            )}
          </div>
          {config && (
            <Button
              theme="solid"
              type="primary"
              size="small"
              icon={<IconPlus />}
              onClick={() => setCreateOpen(true)}
            >
              新增任命
            </Button>
          )}
        </div>

        <div className="mt-3">
          <Descriptions
            size="small"
            row
            data={[
              ...(typeof node.employee_count === 'number'
                ? [{ key: '在任员工', value: String(node.employee_count) }]
                : []),
              ...(typeof node.department_count === 'number'
                ? [{ key: '下挂部门', value: String(node.department_count) }]
                : []),
              ...(node.address ? [{ key: '地址', value: node.address }] : []),
              ...(node.contact_phone
                ? [{ key: '联系电话', value: node.contact_phone }]
                : []),
            ]}
          />
        </div>

        {missing.length > 0 && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
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
              emptyTitle="暂无任命"
              emptyDescription='点击右上角"新增任命"按钮开始'
            />
          </>
        )}
      </div>

      {config && (
        <CreateAssignmentDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSuccess={invalidateAfterMutation}
          initialRole={config.defaultRole}
          initialScope={{ field: config.scopeField, id: node.id }}
          roleWhitelist={config.allowedRoles}
          lockScope
        />
      )}

      <TransferAssignmentDialog
        open={!!transferItem}
        onClose={() => setTransferItem(null)}
        assignment={transferItem}
        onSuccess={invalidateAfterMutation}
      />
    </div>
  )
}
