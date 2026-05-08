/**
 * 集成配置管理路由
 * 路径: /admin/integrations
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { IntegrationsPage } from '@/features/admin/pages/integrations-page'

export const Route = createFileRoute('/_authenticated/admin/integrations')({
  staticData: { title: '集成配置' },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || 'asr',
    }
  },
  beforeLoad: ({ search }) => {
    if (search.tab === 'yunke') {
      throw redirect({
        to: '/yunke/accounts',
      })
    }
  },
  component: IntegrationsPage
})
