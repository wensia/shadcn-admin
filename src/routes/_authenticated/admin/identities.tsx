/**
 * 员工身份管理路由
 * 路径: /admin/identities
 */

import { createFileRoute } from '@tanstack/react-router'
import { IdentitiesPage } from '@/features/admin/pages/identities-page'

export const Route = createFileRoute('/_authenticated/admin/identities')({
  staticData: { title: '员工身份管理' },
  component: IdentitiesPage
})
