/**
 * 员工身份申请审批路由
 * 路径: /admin/identity-applications
 */

import { createFileRoute } from '@tanstack/react-router'
import { IdentityApplicationsPage } from '@/features/hr/pages/identity-applications-page'

export const Route = createFileRoute('/_authenticated/admin/identity-applications')({
  staticData: { title: '员工身份申请审批' },
  component: () => <IdentityApplicationsPage mode="admin" />,
})
