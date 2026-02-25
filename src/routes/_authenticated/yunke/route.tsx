/**
 * 云客管理模块路由布局
 * /yunke/ai-assistant 对所有登录用户开放
 * 配置了 page access 的路径对授权员工开放
 * 其他 /yunke/* 路径仅超级管理员可访问
 */

import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { ForbiddenError } from '@/features/errors/forbidden'

// 所有用户都可以访问的路径
const PUBLIC_PATHS = ['/yunke/ai-assistant', '/yunke/call-records']

// 需要 page access 检查的路径映射 (URL 前缀 -> page_key)
const PAGE_ACCESS_MAP: Record<string, string> = {}

export const Route = createFileRoute('/_authenticated/yunke')({
  component: YunkeLayout
})

function YunkeLayout() {
  const user = useAuthStore(state => state.user)
  const location = useLocation()

  // 超级管理员直接放行
  if (user?.is_superuser) {
    return <Outlet />
  }

  // 公开路径放行
  const isPublicPath = PUBLIC_PATHS.some(p => location.pathname.startsWith(p))
  if (isPublicPath) {
    return <Outlet />
  }

  // 检查 page access 配置
  const pageKey = Object.entries(PAGE_ACCESS_MAP).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1]
  if (pageKey && user?.accessible_pages?.includes(pageKey)) {
    return <Outlet />
  }

  return <ForbiddenError />
}
