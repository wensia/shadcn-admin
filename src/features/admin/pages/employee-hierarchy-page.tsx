/**
 * 管理层级页面
 */

import { useDocumentTitle } from '@/hooks/use-document-title'
import { AdminPlaceholderPage } from '../components/admin-placeholder-page'

export function EmployeeHierarchyPage() {
  useDocumentTitle('管理层级')
  return (
    <AdminPlaceholderPage
      title="管理层级"
      description="查看和管理员工的上下级关系"
    />
  )
}
