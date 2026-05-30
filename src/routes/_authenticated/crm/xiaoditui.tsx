import { createFileRoute } from '@tanstack/react-router'
import { XiaoditangPage } from '@/features/crm/xiaoditui'

export type XiaodituiTabKey =
  | 'activity'
  | 'lead-details'
  | 'parttime'
  | 'salary'
  | 'collection-calendar'
  | 'watermark-camera'
  | 'total'

export interface XiaodituiSearchParams {
  tab: XiaodituiTabKey
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

function parseTab(value: unknown): XiaodituiTabKey {
  const allowedTabs: XiaodituiTabKey[] = [
    'activity',
    'lead-details',
    'parttime',
    'salary',
    'collection-calendar',
    'watermark-camera',
    'total',
  ]
  return allowedTabs.includes(value as XiaodituiTabKey)
    ? (value as XiaodituiTabKey)
    : 'activity'
}

export const Route = createFileRoute('/_authenticated/crm/xiaoditui')({
  staticData: { title: '小地推' },
  validateSearch: (search: Record<string, unknown>): XiaodituiSearchParams => ({
    tab: parseTab(search.tab),
    activity_id: parsePositiveInt(search.activity_id),
    start_date: parseDate(search.start_date),
    end_date: parseDate(search.end_date),
    market_id: parsePositiveInt(search.market_id),
  }),
  component: XiaoditangPage,
})
