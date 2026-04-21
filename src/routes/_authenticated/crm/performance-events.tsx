/**
 * 业绩结果路由
 */

import { createFileRoute } from '@tanstack/react-router'
import { PerformanceEventsPage } from '@/features/crm/performance-events'

interface PerformanceEventsSearchParams {
  page?: number
  size?: number
  keyword?: string
  event_type?: string
  campus_id?: string
  advisor_id?: string
  date_from?: string
  date_to?: string
  highlight?: string
}

export const Route = createFileRoute('/_authenticated/crm/performance-events')({
  staticData: { title: '业绩事件' },
  component: PerformanceEventsPage,
  validateSearch: (
    search: Record<string, unknown>
  ): PerformanceEventsSearchParams => {
    const page =
      typeof search.page === 'number'
        ? search.page
        : typeof search.page === 'string'
          ? Number.parseInt(search.page, 10)
          : undefined
    const size =
      typeof search.size === 'number'
        ? search.size
        : typeof search.size === 'string'
          ? Number.parseInt(search.size, 10)
          : undefined

    return {
      page: Number.isFinite(page) && page && page > 0 ? page : undefined,
      size: Number.isFinite(size) && size && size > 0 ? size : undefined,
      keyword: typeof search.keyword === 'string' ? search.keyword : undefined,
      event_type:
        typeof search.event_type === 'string' ? search.event_type : undefined,
      campus_id:
        typeof search.campus_id === 'string' ? search.campus_id : undefined,
      advisor_id:
        typeof search.advisor_id === 'string' ? search.advisor_id : undefined,
      date_from:
        typeof search.date_from === 'string' ? search.date_from : undefined,
      date_to: typeof search.date_to === 'string' ? search.date_to : undefined,
      highlight:
        typeof search.highlight === 'string' ? search.highlight : undefined,
    }
  },
})
