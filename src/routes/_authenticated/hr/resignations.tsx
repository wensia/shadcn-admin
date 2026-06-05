/**
 * 离职审批兼容路由
 * 路径: /hr/resignations
 */

import { createFileRoute } from '@tanstack/react-router'
import { HrApprovalsPage } from '@/features/hr/pages/hr-approvals-page'

export const Route = createFileRoute('/_authenticated/hr/resignations')({
  staticData: { title: '人事审批' },
  validateSearch: (search: Record<string, unknown>) => ({
    type: search.type === 'identity' || search.type === 'resignations'
      ? search.type
      : search.tab === 'identity' || search.tab === 'resignations'
        ? search.tab
        : 'resignations',
    status: typeof search.status === 'string' ? search.status : 'all',
    page: search.page,
    size: search.size,
  }),
  component: () => <HrApprovalsPage defaultType="resignations" />,
})
