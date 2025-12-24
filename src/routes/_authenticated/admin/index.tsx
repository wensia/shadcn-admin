/**
 * Admin 路由入口
 * 路径: /admin -> 重定向到 /admin/dashboard
 */

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/')({
  beforeLoad: () => {
    throw redirect({
      to: '/admin/dashboard',
    })
  },
})
