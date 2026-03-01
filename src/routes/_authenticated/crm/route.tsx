import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DailyNoticeDialog } from '@/features/crm/components/daily-notice-dialog'

export const Route = createFileRoute('/_authenticated/crm')({
  component: CrmLayout,
})

function CrmLayout() {
  return (
    <>
      <Outlet />
      <DailyNoticeDialog />
    </>
  )
}
