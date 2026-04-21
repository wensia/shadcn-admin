/**
 * ASR 配置管理路由
 * 路径: /admin/asr-config
 */

import { createFileRoute } from '@tanstack/react-router'
import { ASRConfigPage } from '@/features/admin/pages/asr-config-page'

export const Route = createFileRoute('/_authenticated/admin/asr-config')({
  staticData: { title: 'ASR 配置' },
  component: ASRConfigPage
})
