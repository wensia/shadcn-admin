import { createFileRoute } from '@tanstack/react-router'
import TDesignLeadsDemo from '@/features/demo/pages/tdesign-leads-demo'

export const Route = createFileRoute('/_authenticated/demo/tdesign-leads')({
  staticData: { title: '线索 Demo' },
  component: TDesignLeadsDemo,
})
