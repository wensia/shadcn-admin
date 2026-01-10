/**
 * Admin 路由布局
 * 只有超级管理员才能访问 /admin/* 路径
 */

import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ForbiddenError } from '@/features/errors/forbidden'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminLayout
})

function AdminLayout() {
  const user = useAuthStore(state => state.user)

  // 检查是否为超级管理员
  if (!user?.is_superuser) {
    return <ForbiddenError />
  }

  return <Outlet />
}
