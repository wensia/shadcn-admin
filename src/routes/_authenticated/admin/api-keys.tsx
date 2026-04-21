/**
 * API密钥管理路由
 * 路径: /admin/api-keys
 */

import { createFileRoute } from '@tanstack/react-router'
import { ApiKeysPage } from '@/features/admin/pages/api-keys-page'

export const Route = createFileRoute('/_authenticated/admin/api-keys')({
  staticData: { title: 'API Key 管理' },
  component: ApiKeysPage
})
