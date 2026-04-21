/**
 * 钉钉机器人管理路由
 * 路径: /admin/dingtalk-robots
 */

import { createFileRoute } from '@tanstack/react-router'
import { DingtalkRobotsPage } from '@/features/admin/pages/dingtalk-robots-page'

export const Route = createFileRoute('/_authenticated/admin/dingtalk-robots')({
  staticData: { title: '钉钉机器人' },
  component: DingtalkRobotsPage
})
