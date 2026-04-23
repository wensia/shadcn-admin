/**
 * 组织任命管理路由
 * 路径: /admin/organization-assignments
 *
 * 支持从 /admin/organization-tree 点击节点后跳转并携带:
 *   ?scope_type=campus&scope_id=<uuid>
 */

import { createFileRoute } from '@tanstack/react-router'
import { OrganizationAssignmentsPage } from '@/features/admin/pages/organization-assignments-page'

type AssignmentsSearch = {
  scope_type?: string
  scope_id?: string
}

export const Route = createFileRoute('/_authenticated/admin/organization-assignments')({
  staticData: { title: '组织任命管理' },
  validateSearch: (search: Record<string, unknown>): AssignmentsSearch => ({
    scope_type: typeof search.scope_type === 'string' ? search.scope_type : undefined,
    scope_id: typeof search.scope_id === 'string' ? search.scope_id : undefined,
  }),
  component: OrganizationAssignmentsPage,
})
