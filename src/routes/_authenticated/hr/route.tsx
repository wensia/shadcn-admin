/**
 * 人事管理路由布局
 * 所有已登录用户均可访问 /hr/* 路径
 */

import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/hr')({
  component: HrLayout,
})

function HrLayout() {
  return <Outlet />
}
