/**
 * DISC性格测试路由
 * 路径: /hr/disc-test
 */

import { createFileRoute } from '@tanstack/react-router'
import { DiscTestPage } from '@/features/admin/pages/disc-test-page'

export const Route = createFileRoute('/_authenticated/hr/disc-test')({
  staticData: { title: 'DISC 测试管理' },
  component: DiscTestPage,
})
