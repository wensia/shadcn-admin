/**
 * AuthenticatedLayout - 登录后的主布局
 * 使用 Semi Layout + 自定义 SidebarProvider
 */
import { Layout } from '@douyinfe/semi-ui-19'
import { getCookie } from '@/lib/cookies'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarProvider, useSidebar } from '@/context/sidebar-context'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TabsManager } from '@/components/layout/tabs-manager'
import { SkipToMain } from '@/components/skip-to-main'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

function LayoutInner({ children }: AuthenticatedLayoutProps) {
  const { isMobile, open } = useSidebar()

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {!isMobile && (
        <Layout.Sider
          style={{
            backgroundColor: 'var(--semi-color-bg-1)',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            width: open ? 240 : 60,
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
  const defaultOpen = getCookie('sidebar_state') !== 'false'

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
