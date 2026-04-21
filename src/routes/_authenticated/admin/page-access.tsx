/**
 * 页面访问权限配置路由
 * 路径: /admin/page-access
 */

import { createFileRoute } from '@tanstack/react-router'
import { PageAccessConfigPage } from '@/features/admin/pages/page-access-config-page'

export const Route = createFileRoute('/_authenticated/admin/page-access')({
  staticData: { title: '页面访问权限' },
  component: PageAccessConfigPage
})
