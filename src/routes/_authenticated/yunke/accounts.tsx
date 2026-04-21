/**
 * 云客账号管理页面路由
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeAccountsPage } from '@/features/yunke/pages/yunke-accounts-page'

export const Route = createFileRoute('/_authenticated/yunke/accounts')({
  staticData: { title: '云客账号' },
  component: YunkeAccountsPage
})
