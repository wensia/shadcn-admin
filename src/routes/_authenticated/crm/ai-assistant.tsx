/**
 * CRM AI 数据助手页面路由（复用云客 AI 助手页面组件）
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeAIAssistantPage } from '@/features/yunke/pages/yunke-ai-assistant-page'

export const Route = createFileRoute('/_authenticated/crm/ai-assistant')({
  staticData: { title: 'AI 数据助手' },
  component: YunkeAIAssistantPage,
})
