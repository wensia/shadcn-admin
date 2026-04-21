/**
 * 快捷外呼路由
 */
import { createFileRoute } from '@tanstack/react-router'
import { ContinuousCallPage } from '@/features/crm/continuous-call'

export const Route = createFileRoute('/_authenticated/crm/continuous-call')({
  staticData: { title: '连续外呼' },
  component: ContinuousCallPage,
})
