/**
 * 组织架构（主从融合）路由
 * 路径: /admin/organization
 *
 * 合并了旧 /admin/organization-tree（浏览）和
 * /admin/organization-assignments（任命增删改）的日常高频路径。
 * 设计文档：docs/dev/organization-admin-page-consolidation.md
 */

import { createFileRoute } from '@tanstack/react-router'
import { OrganizationPage } from '@/features/admin/pages/organization-page'

export const Route = createFileRoute('/_authenticated/admin/organization')({
  staticData: { title: '组织架构' },
  component: OrganizationPage,
})
