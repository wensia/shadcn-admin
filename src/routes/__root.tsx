import { useEffect } from 'react'
import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { NavigationProgress } from '@/components/navigation-progress'
import { VersionChecker } from '@/components/version-checker'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'

const APP_TITLE = 'RMF CRM'

/**
 * 根据当前路由 matches 的 staticData.title 自动设置浏览器标签 title。
 * 约定：每个叶子路由的 createFileRoute 里添加 `staticData: { title: 'xxx' }`。
 * 没声明就退化为 APP_TITLE。
 * 页面组件里如果动态调用 useDocumentTitle（比如基于详情数据），会在 useEffect 里覆盖本值。
 */
function AutoDocumentTitle() {
  const title = useRouterState({
    select: (s) => {
      for (let i = s.matches.length - 1; i >= 0; i--) {
        const data = s.matches[i]?.staticData as
          | { title?: string | ((match: unknown) => string) }
          | undefined
        if (data?.title) {
          return typeof data.title === 'function'
            ? data.title(s.matches[i])
            : data.title
        }
      }
      return ''
    },
  })
  useEffect(() => {
    document.title = title ? `${APP_TITLE}-${title}` : APP_TITLE
  }, [title])
  return null
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    return (
      <>
        <AutoDocumentTitle />
        <NavigationProgress />
        <VersionChecker />
        <Outlet />
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
