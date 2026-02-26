/**
 * 全屏路由布局
 * 需要登录但不显示侧边栏，适用于沉浸式编辑场景（如在线表格）
 */

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_fullscreen')({
  beforeLoad: async ({ location }) => {
    const { isAuthenticated } = useAuthStore.getState()

    if (!isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },

  component: FullscreenLayout,
})

function FullscreenLayout() {
  return (
    <div className="h-svh w-full overflow-hidden bg-background">
      <Outlet />
    </div>
  )
}
