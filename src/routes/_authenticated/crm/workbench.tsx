/**
 * 咨询工作台路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { WorkbenchPage } from '@/features/crm/workbench'

export const Route = createFileRoute('/_authenticated/crm/workbench')({
  staticData: { title: '咨询工作台' },
  component: WorkbenchPage,
})
