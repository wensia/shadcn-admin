/**
 * 员工身份申请路由
 * 路径: /hr/identity-applications
 */

import { createFileRoute } from '@tanstack/react-router'
import { IdentityApplicationsPage } from '@/features/hr/pages/identity-applications-page'

export const Route = createFileRoute('/_authenticated/hr/identity-applications')({
  staticData: { title: '员工身份申请' },
  component: IdentityApplicationsPage,
})
