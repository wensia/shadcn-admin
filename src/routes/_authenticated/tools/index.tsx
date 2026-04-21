import { createFileRoute } from '@tanstack/react-router'
import { ToolsHubPage } from '@/features/tools/hub/tools-hub'

export const Route = createFileRoute('/_authenticated/tools/')({
  staticData: { title: '工具中心' },
  component: ToolsHubPage,
})
