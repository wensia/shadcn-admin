/**
 * 组织任命管理旧路由
 * 路径: /admin/organization-assignments
 *
 * 新版 /admin/organization 已合并组织浏览与任命管理。
 * 该路由仅保留历史链接兼容，进入后直接替换到新版页面。
 */

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/admin/organization-assignments')({
  beforeLoad: () => {
    throw redirect({
      to: '/admin/organization',
      replace: true,
    })
  },
})
