/**
 * 云客账号管理路由
 * 路径: /admin/yunke-accounts
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeAccountsPage } from '@/features/admin/pages/yunke-accounts-page'

export const Route = createFileRoute('/_authenticated/admin/yunke-accounts')({
  staticData: { title: '云客账号' },
  component: YunkeAccountsPage
})
