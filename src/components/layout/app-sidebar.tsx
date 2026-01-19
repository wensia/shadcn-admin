import { useLocation } from '@tanstack/react-router'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
// import { AppTitle } from './app-title'
import {
  crmNavGroups,
  adminNavGroups,
  yunkeNavGroups,
  crmTeams,
  adminTeams,
  yunkeTeams,
} from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

// 折叠按钮组件
function CollapseButton() {
  const { state, toggleSidebar, isMobile } = useSidebar()

  // 移动端不显示折叠按钮
  if (isMobile) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
      onClick={toggleSidebar}
    >
      {state === 'expanded' ? (
        <>
          <ChevronsLeft className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">收起侧边栏</span>
        </>
      ) : (
        <>
          <ChevronsRight className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">展开侧边栏</span>
        </>
      )}
    </Button>
  )
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const location = useLocation()

  // 根据当前路径判断使用哪个导航组
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isYunkeRoute = location.pathname.startsWith('/yunke')

  // 选择对应的导航组和团队配置
  const getNavConfig = () => {
    if (isYunkeRoute) {
      return { navGroups: yunkeNavGroups, teams: yunkeTeams }
    }
    if (isAdminRoute) {
      return { navGroups: adminNavGroups, teams: adminTeams }
    }
    return { navGroups: crmNavGroups, teams: crmTeams }
  }

  const { navGroups, teams } = getNavConfig()

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <CollapseButton />
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
