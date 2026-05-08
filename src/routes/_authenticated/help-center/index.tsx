import { createFileRoute } from '@tanstack/react-router'
import { HelpCenterPage } from '@/features/help-center'

interface HelpCenterSearch {
  doc?: string
}

export const Route = createFileRoute('/_authenticated/help-center/')({
  staticData: { title: '帮助中心' },
  component: HelpCenterPage,
  validateSearch: (search: Record<string, unknown>): HelpCenterSearch => ({
    doc: typeof search.doc === 'string' ? search.doc : undefined,
  }),
})
