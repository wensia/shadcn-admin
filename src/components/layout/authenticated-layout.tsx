/**
 * AuthenticatedLayout - 登录后的主布局
 * 使用 Semi Layout + 自定义 SidebarProvider
 */
import { useEffect } from 'react'
import { Outlet, useLocation } from '@tanstack/react-router'
import { Layout } from '@douyinfe/semi-ui-19'
import { getCookie } from '@/lib/cookies'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarProvider, useSidebar } from '@/context/sidebar-context'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TabsManager } from '@/components/layout/tabs-manager'
import { SkipToMain } from '@/components/skip-to-main'

const SIDEBAR_RAIL_WIDTH = 56
const SIDEBAR_PANEL_WIDTH = 260
const AUTO_COLLAPSE_SIDEBAR_PATHS = new Set(['/admin/organization'])

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

function LayoutInner({ children }: AuthenticatedLayoutProps) {
  const { isMobile, open, setOpen, hasUserInteracted } = useSidebar()
  const location = useLocation()
  const isImmersiveAIPage =
    location.pathname === '/crm/ai-assistant' ||
    location.pathname === '/yunke/ai-assistant'
  const shouldAutoCollapseSidebar = AUTO_COLLAPSE_SIDEBAR_PATHS.has(
    location.pathname
  )

  useEffect(() => {
    if (
      isMobile ||
      !open ||
      hasUserInteracted ||
      !shouldAutoCollapseSidebar
    ) {
      return
    }

    setOpen(false, { persist: false, userInitiated: false })
  }, [
    hasUserInteracted,
    isMobile,
    open,
    setOpen,
    shouldAutoCollapseSidebar,
  ])

  if (isImmersiveAIPage) {
    return (
      <Layout
        style={{
          height: '100vh',
          overflow: 'hidden',
          background: 'rgb(255, 255, 255)',
        }}
      >
        {children ?? <Outlet />}
      </Layout>
    )
  }

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {!isMobile && (
        <Layout.Sider
          style={{
            backgroundColor: 'var(--semi-color-bg-1)',
            overflow: 'hidden',
            transition: 'width 0.18s ease',
            width: open ? SIDEBAR_PANEL_WIDTH : SIDEBAR_RAIL_WIDTH,
            flexShrink: 0,
          }}
        >
          <AppSidebar />
        </Layout.Sider>
      )}
      {isMobile && <AppSidebar />}

      <Layout.Content
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--semi-color-bg-0)',
        }}
      >
        {children ?? <TabsManager />}
      </Layout.Content>
    </Layout>
  )
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const location = useLocation()
  const defaultOpen =
    !AUTO_COLLAPSE_SIDEBAR_PATHS.has(location.pathname) &&
    getCookie('sidebar_state') !== 'false'

  return (
    <SearchProvider>
      <LayoutProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <SkipToMain />
          <LayoutInner>{children}</LayoutInner>
        </SidebarProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
