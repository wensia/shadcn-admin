/**
 * 组织架构树节点详情 Drawer
 * 点击任一节点后右侧滑出，展示：
 * - 基础信息
 * - 在任负责人列表（只读）
 * - 未任命告警
 * - 「管理任命」跳转按钮
 */
import { SideSheet, Typography, Tag, Button, Empty, Descriptions } from '@douyinfe/semi-ui-19'
import { ArrowRightLeft, UserPlus, AlertCircle, Users, Briefcase } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { OrganizationTreeNode, AssignmentRole } from '../../types'
import { ASSIGNMENT_ROLE_LABELS } from '../../types'
import {
  orgNodeTypeLabel,
  orgNodeTypeColor,
  roleTagColor,
} from '../../lib/assignment-format'
import { OrgNodeIcon } from './org-tree-icons'
import { getVisibleMissingSingletonRoles } from './org-stats-helpers'

const { Text, Title } = Typography

interface OrgNodeDetailDrawerProps {
  node: OrganizationTreeNode | null
  open: boolean
  onClose: () => void
}

/** 节点 type → 对应的 scope_type（用于跳转到任命页的 URL query）*/
function nodeTypeToScopeType(type: string): string | null {
  switch (type) {
    case 'campus':
    case 'area_office':
      return 'campus'
    case 'area':
      return 'area'
    case 'campus_department':
      return 'campus_department'
    case 'area_department':
      return 'area_department'
    case 'district_department':
      return 'district_department'
    default:
      return null // region/district 不直接映射到任命作用域
  }
}

export function OrgNodeDetailDrawer({ node, open, onClose }: OrgNodeDetailDrawerProps) {
  const navigate = useNavigate()

  if (!node) {
    return (
      <SideSheet visible={open} onCancel={onClose} title="节点详情" width={520}>
        <Empty title="请选择节点" />
      </SideSheet>
    )
  }

  const scopeType = nodeTypeToScopeType(node.type)
  const leaders = node.leaders ?? []
  const missing = getVisibleMissingSingletonRoles(node)

  const handleGoToAssignments = () => {
    if (!scopeType) return
    navigate({
      to: '/admin/organization-assignments',
      search: { scope_type: scopeType, scope_id: node.id } as Record<string, string>,
    })
    onClose()
  }

  return (
    <SideSheet
      visible={open}
      onCancel={onClose}
      width={520}
      title={
        <div className="flex items-center gap-2">
          <OrgNodeIcon type={node.type} />
          <span>{node.name}</span>
          <Tag size="small" color={orgNodeTypeColor(node.type)}>
            {orgNodeTypeLabel(node.type)}
          </Tag>
          {!node.is_active && (
            <Tag size="small" color="grey">
              已停用
            </Tag>
          )}
        </div>
      }
      footer={
        scopeType && (
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>关闭</Button>
            <Button theme="solid" type="primary" icon={<UserPlus className="h-4 w-4" />} onClick={handleGoToAssignments}>
              管理任命
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* 基础信息 */}
        <div>
          <Title heading={6} style={{ marginBottom: 8 }}>
            基础信息
          </Title>
          <Descriptions
            data={[
              { key: '名称', value: node.name },
              { key: '类型', value: orgNodeTypeLabel(node.type) },
              { key: '状态', value: node.is_active ? '启用' : '停用' },
              ...(node.address ? [{ key: '地址', value: node.address }] : []),
              ...(node.contact_phone ? [{ key: '联系电话', value: node.contact_phone }] : []),
              ...(typeof node.employee_count === 'number'
                ? [{ key: '在任员工数', value: String(node.employee_count) }]
                : []),
              ...(typeof node.department_count === 'number'
                ? [{ key: '下挂部门数', value: String(node.department_count) }]
                : []),
              ...((node.children?.length ?? 0) > 0
                ? [{ key: '子单位数', value: String(node.children!.length) }]
                : []),
            ]}
            size="small"
          />
        </div>

        {/* 未任命告警 */}
        {missing.length > 0 && (
          <div
            className="rounded-md p-3 flex items-start gap-2"
            style={{
              background: 'var(--semi-color-danger-light-default)',
              color: 'var(--semi-color-danger)',
            }}
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium">未任命：</div>
              <div>
                {missing
                  .map((r) => ASSIGNMENT_ROLE_LABELS[r as AssignmentRole] ?? r)
                  .join('、')}
              </div>
            </div>
          </div>
        )}

        {/* 在任负责人 */}
        <div>
          <Title heading={6} style={{ marginBottom: 8 }}>
            在任负责人
            <Tag size="small" className="ml-2" color="grey">
              {leaders.length}
            </Tag>
          </Title>
          {leaders.length === 0 ? (
            <Empty
              description={
                <Text type="tertiary" size="small">
                  暂无任命
                </Text>
              }
              style={{ padding: '16px 0' }}
            />
          ) : (
            <div className="space-y-2">
              {leaders.map((l) => (
                <div
                  key={l.assignment_id}
                  className="flex items-center justify-between rounded-md p-2.5"
                  style={{ background: 'var(--semi-color-fill-0)' }}
                >
                  <div className="flex items-center gap-2">
                    <Tag size="small" color={roleTagColor(l.role)}>
                      {l.role_label || l.role}
                    </Tag>
                    {l.rank > 0 && (
                      <Tag size="small" color="grey">
                        副职 #{l.rank}
                      </Tag>
                    )}
                    <Text strong>{l.employee_name}</Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 子单位摘要 */}
        {(node.children?.length ?? 0) > 0 && (
          <div>
            <Title heading={6} style={{ marginBottom: 8 }}>
              下级组织
              <Tag size="small" className="ml-2" color="grey">
                {node.children!.length}
              </Tag>
            </Title>
            <div className="flex flex-wrap gap-2">
              {node.children!.slice(0, 20).map((c) => (
                <Tag
                  key={c.id}
                  color={orgNodeTypeColor(c.type)}
                  prefixIcon={
                    c.type === 'campus' || c.type === 'area_office' ? (
                      <Briefcase className="h-3 w-3" />
                    ) : (
                      <Users className="h-3 w-3" />
                    )
                  }
                >
                  {c.name}
                </Tag>
              ))}
              {node.children!.length > 20 && (
                <Tag color="grey">+{node.children!.length - 20}</Tag>
              )}
            </div>
          </div>
        )}
      </div>

      {!scopeType && (
        <Text type="tertiary" size="small" className="block mt-4">
          大区/地区暂不支持直接任命，请在具体的区域或校区上管理任命。
        </Text>
      )}
    </SideSheet>
  )
}
