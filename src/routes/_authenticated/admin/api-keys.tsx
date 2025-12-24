/**
 * API密钥管理路由
 * 路径: /admin/api-keys
 */

import { createFileRoute } from '@tanstack/react-router'
import { ApiKeysPage } from '@/features/admin/pages/api-keys-page'

export const Route = createFileRoute('/_authenticated/admin/api-keys')({
  component: ApiKeysPage
})
