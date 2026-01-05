/**
 * Leads页面路由
 * 路径: /crm/leads
 */

import { createFileRoute } from '@tanstack/react-router'
import { LeadsPage } from '@/features/crm/leads/leads-page'

// 定义搜索参数类型
interface LeadsSearchParams {
  grade?: string
  status?: string
  intention_level?: string
  source_channel_id?: string
  campus_id?: string
  search?: string
}

export const Route = createFileRoute('/_authenticated/crm/leads/')({
  component: LeadsPage,
  validateSearch: (search: Record<string, unknown>): LeadsSearchParams => {
    return {
      grade: typeof search.grade === 'string' ? search.grade : undefined,
      status: typeof search.status === 'string' ? search.status : undefined,
      intention_level: typeof search.intention_level === 'string' ? search.intention_level : undefined,
      source_channel_id: typeof search.source_channel_id === 'string' ? search.source_channel_id : undefined,
      campus_id: typeof search.campus_id === 'string' ? search.campus_id : undefined,
      search: typeof search.search === 'string' ? search.search : undefined,
    }
  }
})
