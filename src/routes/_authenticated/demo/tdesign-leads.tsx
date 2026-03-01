import { createFileRoute } from '@tanstack/react-router'
import TDesignLeadsDemo from '@/features/demo/pages/tdesign-leads-demo'

export const Route = createFileRoute('/_authenticated/demo/tdesign-leads')({
  component: TDesignLeadsDemo,
})
