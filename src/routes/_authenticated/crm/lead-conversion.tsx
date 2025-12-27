/**
 * 转化管理路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { LeadConversionPage } from '@/features/crm/lead-conversion'

export const Route = createFileRoute('/_authenticated/crm/lead-conversion')({
  component: LeadConversionPage,
})
