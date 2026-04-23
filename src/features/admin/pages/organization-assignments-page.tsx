/**
 * 组织任命管理页面（Phase A · Stage 1 后保留）
 *
 * 统一视图管理所有组织负责人任命（全量 + Tab 过滤 + 历史记录）。
 * Stage 3 会迁到 /admin/organization/audit；目前保留原路由可用。
 *
 * 日常维护建议使用新路由 /admin/organization（左树右详情主从布局）。
 *
 * 设计文档：docs/dev/organization-admin-page-consolidation.md
 */

import { useEffect, useMemo, useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import {
  Button,
  Tabs,
  TabPane,
  Typography,
  Tag,
} from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh } from '@douyinfe/semi-icons'
import { adminApi } from '../api'
import {
  ASSIGNMENT_ROLE_LABELS,
  type AssignmentItem,
  type AssignmentRole,
} from '../types'
import { showApiErrorToast } from '@/lib/api/error-toast'
import {
  AssignmentTable,
  CreateAssignmentDialog,
  TransferAssignmentDialog,
} from '../components/assignments'

const { Title, Text } = Typography

type TabKey =
  | 'campus'
  | 'area'
  | 'campus_department'
  | 'area_department'
  | 'district_department'
  | 'history'

const TAB_LABELS: Record<TabKey, string> = {
  campus: '校区领导',
  area: '区域级',
  campus_department: '校区部门',
  area_department: '区域部门',
  district_department: '地区部门',
  history: '历史记录',
}

/** 每个 tab 下允许展示/新增的角色 */
const TAB_ROLES: Record<Exclude<TabKey, 'history'>, AssignmentRole[]> = {
  campus: ['principal', 'vice_principal'],
  area: ['area_director'],
  campus_department: ['dept_manager', 'dept_deputy', 'dept_supervisor'],
  area_department: [
    'area_manager',
    'teaching_supervisor',
    'dept_manager',
    'dept_deputy',
    'dept_supervisor',
  ],
  district_department: ['dept_manager', 'dept_deputy', 'dept_supervisor'],
}

/** URL query → Tab key 映射（来自 /admin/organization-tree 的跳转） */
const SCOPE_TYPE_TO_TAB: Record<string, TabKey> = {
  campus: 'campus',
  area: 'area',
  campus_department: 'campus_department',
  area_department: 'area_department',
  district_department: 'district_department',
}

export function OrganizationAssignmentsPage() {
  useDocumentTitle('组织任命管理')
  const queryClient = useQueryClient()

  const search = useSearch({ strict: false }) as {
    scope_type?: string
    scope_id?: string
  }

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (search.scope_type && SCOPE_TYPE_TO_TAB[search.scope_type]) {
      return SCOPE_TYPE_TO_TAB[search.scope_type]
    }
    return 'campus'
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [transferItem, setTransferItem] = useState<AssignmentItem | null>(null)

  const filterScopeId = search.scope_id

  useEffect(() => {
    if (search.scope_type && SCOPE_TYPE_TO_TAB[search.scope_type]) {
      setActiveTab(SCOPE_TYPE_TO_TAB[search.scope_type])
    }
  }, [search.scope_type])

  const activeOnly = activeTab !== 'history'

  const { data: assignments = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-assignments', activeTab, activeOnly],
    queryFn: async () => {
      const params: Record<string, unknown> = { active_only: activeOnly }
      const response = await adminApi.listAssignments(params)
      return response.data || []
    },
  })

  const filteredAssignments = useMemo(() => {
    let list = assignments
    if (activeTab !== 'history') {
      const roles = TAB_ROLES[activeTab as Exclude<TabKey, 'history'>]
      list = list.filter((a) => {
        if (!roles.includes(a.role)) return false
        if (activeTab === 'campus') return a.campus_id != null
        if (activeTab === 'area') return a.area_id != null
        if (activeTab === 'campus_department') return a.campus_department_id != null
        if (activeTab === 'area_department') return a.area_department_id != null
        if (activeTab === 'district_department') return a.district_department_id != null
        return true
      })
    }
    if (filterScopeId) {
      list = list.filter(
        (a) =>
          a.campus_id === filterScopeId ||
          a.area_id === filterScopeId ||
          a.campus_department_id === filterScopeId ||
          a.area_department_id === filterScopeId ||
          a.district_department_id === filterScopeId,
      )
    }
    return list
  }, [assignments, activeTab, filterScopeId])

  const relieveMutation = useMutation({
    mutationFn: (id: string) => adminApi.relieveAssignment(id, {}),
    onSuccess: () => {
      toast.success('卸任成功')
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '卸任失败'),
  })

  const stats = useMemo(() => {
    const activeItems = assignments.filter((a) => a.is_active)
    return {
      total: assignments.length,
      active: activeItems.length,
      byRole: Object.entries(ASSIGNMENT_ROLE_LABELS).map(([role, label]) => ({
        role: role as AssignmentRole,
        label,
        count: activeItems.filter((a) => a.role === role).length,
      })),
    }
  }, [assignments])

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Title heading={3} style={{ margin: 0 }}>
            组织任命管理
          </Title>
          <Text type="tertiary" className="text-sm">
            统一管理校长、区域总、区域经理、教学督导、部门经理等所有组织负责人任命
          </Text>
        </div>
        <div className="flex gap-2">
          <Button icon={<IconRefresh />} onClick={() => refetch()} loading={isFetching}>
            刷新
          </Button>
          <Button
            theme="solid"
            type="primary"
            icon={<IconPlus />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新增任命
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {stats.byRole.map((r) => (
          <div
            key={r.role}
            className="bg-[var(--semi-color-fill-0)] rounded-md p-3 border border-[var(--semi-color-border)]"
          >
            <Text type="tertiary" className="text-xs block">
              {r.label}
            </Text>
            <Text strong className="text-lg">
              {r.count}
            </Text>
          </div>
        ))}
      </div>

      <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as TabKey)} type="line">
        {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
          <TabPane
            key={k}
            itemKey={k}
            tab={
              <span>
                {TAB_LABELS[k]}
                {k !== 'history' && (
                  <Tag size="small" color="grey" className="ml-2">
                    {
                      assignments.filter((a) => {
                        const roles = TAB_ROLES[k as Exclude<TabKey, 'history'>]
                        if (!roles.includes(a.role)) return false
                        if (k === 'campus') return a.campus_id != null
                        if (k === 'area') return a.area_id != null
                        if (k === 'campus_department') return a.campus_department_id != null
                        if (k === 'area_department') return a.area_department_id != null
                        if (k === 'district_department') return a.district_department_id != null
                        return false
                      }).length
                    }
                  </Tag>
                )}
              </span>
            }
          >
            <AssignmentTable
              items={filteredAssignments}
              isLoading={isLoading}
              isHistory={k === 'history'}
              onRelieve={(id) => relieveMutation.mutate(id)}
              onTransfer={(a) => setTransferItem(a)}
            />
          </TabPane>
        ))}
      </Tabs>

      <CreateAssignmentDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
          queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
        }}
      />

      <TransferAssignmentDialog
        open={!!transferItem}
        onClose={() => setTransferItem(null)}
        assignment={transferItem}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
          queryClient.invalidateQueries({ queryKey: ['organization-tree-full'] })
        }}
      />
    </div>
  )
}
