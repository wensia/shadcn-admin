/**
 * DISC性格测试页面
 */

import { useDocumentTitle } from '@/hooks/use-document-title'
import { AdminPlaceholderPage } from '../components/admin-placeholder-page'

export function DiscTestPage() {
  useDocumentTitle('DISC性格测试')
  return (
    <AdminPlaceholderPage
      title="DISC性格测试"
      description="DISC性格测试管理"
    />
  )
}
