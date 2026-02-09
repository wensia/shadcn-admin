import { createFileRoute } from '@tanstack/react-router'
import { YunkeAIAssistantPage } from '@/features/yunke/pages/yunke-ai-assistant-page'

export const Route = createFileRoute('/_authenticated/yunke/ai-assistant')({
  component: YunkeAIAssistantPage,
})
