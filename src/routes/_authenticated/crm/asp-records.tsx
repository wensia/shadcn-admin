/**
 * ASP 测评记录路由
 */

import { createFileRoute } from '@tanstack/react-router'
import { AspRecordsPage } from '@/features/asp/pages/asp-records-page'

interface AspRecordsSearchParams {
  page?: number
  size?: number
  name?: string
  phone?: string
  stage?: string
}

export const Route = createFileRoute('/_authenticated/crm/asp-records')({
  staticData: { title: 'ASP 测评记录' },
  component: AspRecordsPage,
  validateSearch: (
    search: Record<string, unknown>
  ): AspRecordsSearchParams => {
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
      name: typeof search.name === 'string' ? search.name : undefined,
      phone: typeof search.phone === 'string' ? search.phone : undefined,
      stage: typeof search.stage === 'string' ? search.stage : undefined,
    }
  },
})
