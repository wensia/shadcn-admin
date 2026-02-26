/**
 * DISC性格测试路由
 * 路径: /hr/disc-test
 */

import { createFileRoute } from '@tanstack/react-router'
import { DiscTestPage } from '@/features/admin/pages/disc-test-page'

export const Route = createFileRoute('/_authenticated/hr/disc-test')({
  component: DiscTestPage,
})
