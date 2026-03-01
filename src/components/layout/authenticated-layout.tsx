/**
 * AuthenticatedLayout - 登录后的主布局
 * 使用 Semi Layout + 自定义 SidebarProvider 替代 shadcn SidebarProvider
 */

import { Layout } from '@douyinfe/semi-ui-19'
import { getCookie } from '@/lib/cookies'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarProvider, useSidebar } from '@/context/sidebar-context'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { TabsManager } from '@/components/layout/tabs-manager'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

function LayoutInner({ children }: AuthenticatedLayoutProps) {
  const { isMobile, open } = useSidebar()

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      {/* 桌面端: Sider 包裹 Nav; 移动端: SideSheet 由 AppSidebar 内部处理 */}
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
      {/* 移动端: AppSidebar 渲染 SideSheet（不占布局空间） */}
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
