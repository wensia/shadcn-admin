import { createFileRoute } from '@tanstack/react-router'
import { YunkeAIAssistantPage } from '@/features/yunke/pages/yunke-ai-assistant-page'

export const Route = createFileRoute('/_authenticated/yunke/ai-assistant')({
  staticData: { title: 'AI 数据助手' },
  component: YunkeAIAssistantPage,
})
