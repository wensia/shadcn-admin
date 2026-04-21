/**
 * 来源渠道管理路由
 * 路径: /admin/source-channels
 */

import { createFileRoute } from '@tanstack/react-router'
import { SourceChannelsPage } from '@/features/admin/pages/source-channels-page'

export const Route = createFileRoute('/_authenticated/admin/source-channels')({
  staticData: { title: '来源渠道管理' },
  component: SourceChannelsPage
})
