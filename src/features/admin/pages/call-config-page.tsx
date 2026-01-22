/**
 * 连续外呼配置页面
 */

import { useDocumentTitle } from '@/hooks/use-document-title'
import { AdminPlaceholderPage } from '../components/admin-placeholder-page'

export function CallConfigPage() {
  useDocumentTitle('连续外呼配置')
  return (
    <AdminPlaceholderPage
      title="连续外呼配置"
      description="配置连续外呼相关参数"
    />
  )
}
