/**
 * 批量导入路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { BatchImportPage } from '@/features/crm/batch-import'

export const Route = createFileRoute('/_authenticated/crm/batch-import')({
  component: BatchImportPage,
})
