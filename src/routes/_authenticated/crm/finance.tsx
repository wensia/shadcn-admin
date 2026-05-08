import { createFileRoute } from '@tanstack/react-router'
import { EducationFinancePage } from '@/features/crm/education'

export const Route = createFileRoute('/_authenticated/crm/finance')({
  staticData: { title: '收费管理' },
  component: EducationFinancePage,
})
