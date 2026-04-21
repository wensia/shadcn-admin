/**
 * 云客登录状态页面路由
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeLoginStatusPage } from '@/features/yunke/pages/yunke-login-status-page'

export const Route = createFileRoute('/_authenticated/yunke/login-status')({
  staticData: { title: '登录状态' },
  component: YunkeLoginStatusPage
})
