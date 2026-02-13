/**
 * AI 配置路由
 * 路径: /admin/ai-config
 */

import { createFileRoute } from '@tanstack/react-router'
import { AIConfigPage } from '@/features/admin/pages/ai-config-page'

export const Route = createFileRoute('/_authenticated/admin/ai-config')({
  component: AIConfigPage
})
