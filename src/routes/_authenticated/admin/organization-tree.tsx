/**
 * 组织架构树路由
 * 路径: /admin/organization-tree
 */

import { createFileRoute } from '@tanstack/react-router'
import { OrganizationTreePage } from '@/features/admin/pages/organization-tree-page'

export const Route = createFileRoute('/_authenticated/admin/organization-tree')({
  staticData: { title: '组织架构树' },
  component: OrganizationTreePage
})
