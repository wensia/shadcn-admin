/**
 * 集成配置管理路由
 * 路径: /admin/integrations
 */

import { createFileRoute } from '@tanstack/react-router'
import { IntegrationsPage } from '@/features/admin/pages/integrations-page'

export const Route = createFileRoute('/_authenticated/admin/integrations')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || 'asr',
    }
  },
  component: IntegrationsPage
})
