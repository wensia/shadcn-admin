/**
 * CRM 模块入口
 * 重定向到咨询工作台
 */

import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/crm/')({
  component: () => <Navigate to="/crm/workbench" />,
})
