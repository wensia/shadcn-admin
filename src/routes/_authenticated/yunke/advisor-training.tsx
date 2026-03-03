import { createFileRoute } from '@tanstack/react-router'
import { YunkeAdvisorTrainingPage } from '@/features/yunke/pages/yunke-advisor-training-page'

export const Route = createFileRoute('/_authenticated/yunke/advisor-training')({
  component: YunkeAdvisorTrainingPage,
})
