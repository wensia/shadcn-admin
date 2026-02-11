/**
 * 云客管理模块路由布局
 * /yunke/ai-assistant 对所有登录用户开放
 * 其他 /yunke/* 路径仅超级管理员可访问
 */

import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ForbiddenError } from '@/features/errors/forbidden'

// 所有用户都可以访问的路径
const PUBLIC_PATHS = ['/yunke/ai-assistant']

export const Route = createFileRoute('/_authenticated/yunke')({
  component: YunkeLayout
})

function YunkeLayout() {
  const user = useAuthStore(state => state.user)
  const location = useLocation()

  // 公开路径跳过超级管理员检查
  const isPublicPath = PUBLIC_PATHS.some(p => location.pathname.startsWith(p))

  if (!isPublicPath && !user?.is_superuser) {
    return <ForbiddenError />
  }

  return <Outlet />
}
