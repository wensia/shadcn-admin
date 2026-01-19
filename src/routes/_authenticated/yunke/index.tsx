/**
 * 云客管理模块入口
 * 重定向到云客仪表盘
 */

import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/yunke/')({
  component: () => <Navigate to="/yunke/dashboard" />
})
