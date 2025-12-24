/**
 * 连续外呼配置路由
 * 路径: /admin/call-config
 */

import { createFileRoute } from '@tanstack/react-router'
import { CallConfigPage } from '@/features/admin/pages/call-config-page'

export const Route = createFileRoute('/_authenticated/admin/call-config')({
  component: CallConfigPage
})
