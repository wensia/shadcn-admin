import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { NavigationProgress } from '@/components/navigation-progress'
import { VersionChecker } from '@/components/version-checker'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    return (
      <>
        <NavigationProgress />
        <VersionChecker />
        <Outlet />
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
