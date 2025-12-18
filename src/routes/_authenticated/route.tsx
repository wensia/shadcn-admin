/**
 * 认证路由布局
 * 所有需要登录才能访问的路由都应该放在_authenticated目录下
 * 使用beforeLoad实现认证守卫
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated')({
  /**
   * beforeLoad: 在加载路由前执行
   * 用于认证检查和权限验证
   */
  beforeLoad: async ({ location }) => {
    const { isAuthenticated } = useAuthStore.getState()

    // 如果未登录,重定向到登录页
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          // 保存当前路径,登录后可以跳转回来
          redirect: location.href
        }
      })
    }

    // 已登录,继续加载路由
  },

  component: AuthenticatedLayout
})
