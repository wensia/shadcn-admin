import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/tools')({
  beforeLoad: async () => {
    const { user } = useAuthStore.getState()

    if (!user?.is_superuser) {
      throw redirect({ to: '/' })
    }
  },
  component: ToolsLayout,
})

function ToolsLayout() {
  return <Outlet />
}
