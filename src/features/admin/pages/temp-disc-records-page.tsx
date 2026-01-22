/**
 * 临时DISC记录页面
 */

import { useDocumentTitle } from '@/hooks/use-document-title'
import { AdminPlaceholderPage } from '../components/admin-placeholder-page'

export function TempDiscRecordsPage() {
  useDocumentTitle('临时DISC记录')
  return (
    <AdminPlaceholderPage
      title="临时DISC记录"
      description="查看临时DISC测试记录"
    />
  )
}
