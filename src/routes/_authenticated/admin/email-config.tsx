/**
 * 邮件配置路由
 * 路径: /admin/email-config
 */

import { createFileRoute } from '@tanstack/react-router'
import { EmailConfigPage } from '@/features/admin/pages/email-config-page'

export const Route = createFileRoute('/_authenticated/admin/email-config')({
  staticData: { title: '邮件配置' },
  component: EmailConfigPage
})
