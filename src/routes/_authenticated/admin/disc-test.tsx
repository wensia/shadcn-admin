/**
 * DISC性格测试路由
 * 路径: /admin/disc-test
 */

import { createFileRoute } from '@tanstack/react-router'
import { DiscTestPage } from '@/features/admin/pages/disc-test-page'

export const Route = createFileRoute('/_authenticated/admin/disc-test')({
  component: DiscTestPage
})
