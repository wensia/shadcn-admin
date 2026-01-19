/**
 * 云客账号凭证管理页面路由
 */

import { createFileRoute } from '@tanstack/react-router'
import { YunkeCredentialsPage } from '@/features/yunke/pages/yunke-credentials-page'

export const Route = createFileRoute('/_authenticated/yunke/credentials')({
  component: YunkeCredentialsPage
})
