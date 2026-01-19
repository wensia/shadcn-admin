/**
 * 云客账号管理页面路由
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeAccountsPage } from '@/features/yunke/pages/yunke-accounts-page'

export const Route = createFileRoute('/_authenticated/yunke/accounts')({
  component: YunkeAccountsPage
})
