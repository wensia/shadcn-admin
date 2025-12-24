/**
 * Webhook钩子路由
 * 路径: /admin/webhook-hooks
 */

import { createFileRoute } from '@tanstack/react-router'
import { WebhookHooksPage } from '@/features/admin/pages/webhook-hooks-page'

export const Route = createFileRoute('/_authenticated/admin/webhook-hooks')({
  component: WebhookHooksPage
})
