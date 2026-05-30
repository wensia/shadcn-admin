import { createFileRoute, redirect } from '@tanstack/react-router'

interface XiaodituiSalarySearchParams {
  activity_id?: number
  start_date?: string
  end_date?: string
  market_id?: number
}

function parsePositiveInt(value: unknown): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : undefined
  return Number.isFinite(parsed) && parsed && parsed > 0 ? parsed : undefined
}

function parseDate(value: unknown): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : undefined
}

export const Route = createFileRoute('/_authenticated/crm/xiaoditui_/salary')({
  staticData: { title: '兼职工资' },
  validateSearch: (
    search: Record<string, unknown>,
  ): XiaodituiSalarySearchParams => ({
    activity_id: parsePositiveInt(search.activity_id),
    start_date: parseDate(search.start_date),
    end_date: parseDate(search.end_date),
    market_id: parsePositiveInt(search.market_id),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/crm/xiaoditui',
      search: {
        tab: 'salary',
        activity_id: search.activity_id,
        start_date: search.start_date,
        end_date: search.end_date,
        market_id: search.market_id,
      },
      replace: true,
    })
  },
})
