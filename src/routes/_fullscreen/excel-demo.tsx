import { createFileRoute } from '@tanstack/react-router'
import { ExcelDemoPage } from '@/features/apps/excel-demo'

export const Route = createFileRoute('/_fullscreen/excel-demo')({
  staticData: { title: 'Excel Demo' },
  component: ExcelDemoPage,
})
