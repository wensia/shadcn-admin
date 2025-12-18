/**
 * Login别名路由
 * 重定向到 /sign-in
 */

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ search }) => {
    // 重定向到sign-in,保留redirect参数
    throw redirect({
      to: '/sign-in',
      search: search as any
    })
  }
})
