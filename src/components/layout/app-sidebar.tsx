/**
 * AppSidebar - Semi Design Nav 侧边栏
 * 使用 Semi Nav 实现导航
 */
import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { Nav, SideSheet } from '@douyinfe/semi-ui-19'
import type { NavProps } from '@douyinfe/semi-ui-19/lib/es/navigation'
import { ChevronsLeft, ChevronsRight, HelpCircle } from 'lucide-react'
import { AnthropicLogo } from '@/assets/anthropic-logo'
import { useAuthStore } from '@/stores/auth-store'
import { useSidebar } from '@/context/sidebar-context'
import { usePermission, PERMISSIONS } from '@/hooks/use-permission'
import {
  crmNavGroups,
  adminNavGroups,
  yunkeNavGroups,
  hrNavGroups,
  toolsNavGroups,
  crmTeams,
  adminTeams,
  yunkeTeams,
  hrTeams,
  toolsTeams,
} from './data/sidebar-data'
import { NavUser } from './nav-user'
import type { NavGroup } from './types'

/**
 * 路由 → 所需权限码映射
 * 未在此映射中的路由默认显示（不需要权限控制）
 */
const ROUTE_PERMISSIONS: Record<string, string> = {
  '/crm/leads': PERMISSIONS.LEADS_LIST,
  '/crm/workbench': PERMISSIONS.LEADS_LIST,
  '/crm/batch-import': PERMISSIONS.LEADS_CREATE,
  '/crm/leads/pool': PERMISSIONS.LEADS_LIST,
  '/crm/call-records': PERMISSIONS.LEADS_LIST,
  '/crm/continuous-call': PERMISSIONS.LEADS_LIST,
  '/crm/leads/assignment-tasks': PERMISSIONS.LEADS_LIST,
  '/crm/lead-creation-logs': PERMISSIONS.LEADS_CREATE,
  '/crm/channel-ledger': PERMISSIONS.LEADS_LIST,
  '/crm/orders': PERMISSIONS.ORDERS_CREATE,
  '/crm/performance-events': PERMISSIONS.ORDERS_CREATE,
  '/crm/students': PERMISSIONS.STUDENTS_LIST,
  '/crm/parents': PERMISSIONS.PARENTS_LIST,
  '/crm/teachers': PERMISSIONS.TEACHERS_LIST,
  '/crm/courses': PERMISSIONS.EDUCATION_SCHEDULE,
  '/crm/packages': PERMISSIONS.EDUCATION_FINANCE,
  '/crm/classes': PERMISSIONS.EDUCATION_SCHEDULE,
  '/crm/lessons': PERMISSIONS.EDUCATION_SCHEDULE,
  '/crm/consumption': PERMISSIONS.EDUCATION_CONSUME,
  '/crm/balances': PERMISSIONS.EDUCATION_BALANCE,
  '/crm/finance': PERMISSIONS.EDUCATION_FINANCE,
  '/crm/teacher-settlements': PERMISSIONS.TEACHER_SETTLEMENT_LIST,
}

const COMMON_HELP_GROUP: NavGroup = {
  title: '帮助',
  icon: HelpCircle,
  items: [
    {
      title: '帮助中心',
      url: '/help-center',
      icon: HelpCircle,
    },
  ],
}

// ─── Group collapse persistence ────────────────────────────────
const COLLAPSED_GROUPS_KEY = 'sidebar_collapsed_groups'
const DEFAULT_COLLAPSED_GROUPS = ['教管部', '行政部']

function getCollapsedGroups(): string[] {
  try {
    const stored = localStorage.getItem(COLLAPSED_GROUPS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function isFirstVisit(): boolean {
  return localStorage.getItem(COLLAPSED_GROUPS_KEY) === null
}

function saveCollapsedGroups(groups: string[]) {
  try {
    localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(groups))
  } catch {
    /* ignore */
  }
}

function getInitialOpenKeys(groups: NavGroup[], currentPath: string): string[] {
  const activeGroup = groups.find((group) =>
    group.items.some((item) => item.url === currentPath)
  )

  if (activeGroup) {
    return [`group-${activeGroup.title}`]
  }

  if (isFirstVisit()) {
    const first = groups.find(
      (group) => !DEFAULT_COLLAPSED_GROUPS.includes(group.title)
    )
    return first ? [`group-${first.title}`] : []
  }

  const collapsed = getCollapsedGroups()
  const firstOpen = groups.find((group) => !collapsed.includes(group.title))
  return firstOpen ? [`group-${firstOpen.title}`] : []
}

// ─── Main Component ────────────────────────────────────────────
export function AppSidebar() {
  const { open, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()

  const { hasPermission } = usePermission()
  const isSuperUser = useAuthStore((s) => s.user?.is_superuser ?? false)

  // 根据当前路径选择导航配置，并按权限过滤菜单项
  const { navGroups, teams } = useMemo(() => {
    const p = location.pathname
    let groups: NavGroup[], teamList
    if (p.startsWith('/yunke')) {
      groups = yunkeNavGroups
      teamList = yunkeTeams
    } else if (p.startsWith('/hr')) {
      groups = hrNavGroups
      teamList = hrTeams
    } else if (p.startsWith('/admin')) {
      groups = adminNavGroups
      teamList = adminTeams
    } else if (p.startsWith('/tools')) {
      groups = toolsNavGroups
      teamList = toolsTeams
    } else {
      groups = crmNavGroups
      teamList = crmTeams
    }

    // 按权限过滤菜单项
    const filtered = groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const url = 'url' in item ? item.url : undefined
          if (!url) return true
          const requiredPerm = ROUTE_PERMISSIONS[url as string]
          if (!requiredPerm) return true
          return hasPermission(requiredPerm)
        }),
      }))
      .filter((group) => group.items.length > 0)
      // 超管专属：非超管隐藏「工具」导航组
      .filter((group) => group.title !== '工具' || isSuperUser)

    return { navGroups: [...filtered, COMMON_HELP_GROUP], teams: teamList }
  }, [location.pathname, hasPermission, isSuperUser])

  const isCollapsed = !open && !isMobile
  // ─── Open keys (分组展开状态) ──────────────────────────────
  const [openKeys, setOpenKeys] = useState<string[]>(() =>
    getInitialOpenKeys(navGroups, location.pathname)
  )

  const availableOpenKeys = useMemo(
    () => navGroups.map((group) => `group-${group.title}`),
    [navGroups]
  )

  const resolvedOpenKeys = useMemo(() => {
    if (isCollapsed) return []
    return openKeys.filter((key) => availableOpenKeys.includes(key))
  }, [availableOpenKeys, isCollapsed, openKeys])

  const handleOpenChange = useCallback<NonNullable<NavProps['onOpenChange']>>(
    ({ openKeys: rawOpenKeys }) => {
      const nextOpenKeys = (rawOpenKeys ?? []).map(String)
      const newlyOpened = nextOpenKeys.filter((key) => !openKeys.includes(key))
      const result =
        newlyOpened.length > 0 ? newlyOpened.slice(-1) : nextOpenKeys.slice(-1)
      setOpenKeys(result)
      const allKeys = navGroups.map((g) => `group-${g.title}`)
      const collapsed = allKeys
        .filter((key) => !result.includes(key))
        .map((key) => key.replace('group-', ''))
      saveCollapsedGroups(collapsed)
    },
    [navGroups, openKeys]
  )

  // ─── Selected keys ────────────────────────────────────────
  const selectedKeys = useMemo(() => [location.pathname], [location.pathname])

  // ─── Navigation selection ─────────────────────────────────
  const handleSelect = useCallback<NonNullable<NavProps['onSelect']>>(
    ({ itemKey }) => {
      const key = itemKey == null ? '' : String(itemKey)
      if (!key || key.startsWith('group-') || key.startsWith('item-')) return

      navigate({ to: key })
      if (isMobile) {
        setOpenMobile(false)
      }
    },
    [isMobile, navigate, setOpenMobile]
  )

  // ─── Sidebar content ─────────────────────────────────────
  const sidebarContent = (
    <Nav
      isCollapsed={isCollapsed}
      selectedKeys={selectedKeys}
      openKeys={resolvedOpenKeys}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
      onCollapseChange={(collapsed: boolean) => setOpen(!collapsed)}
      style={{ height: '100%', userSelect: 'none' }}
    >
      <Nav.Header
        logo={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <AnthropicLogo className='size-7' />
            {!isMobile && (
              <div
                style={{
                  maxHeight: isCollapsed ? 36 : 0,
                  marginTop: isCollapsed ? 6 : 0,
                  opacity: isCollapsed ? 1 : 0,
                  overflow: 'hidden',
                  transition:
                    'max-height 0.25s ease, opacity 0.15s ease 0.08s, margin-top 0.25s ease',
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(true)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    cursor: 'pointer',
                    color: 'var(--semi-color-text-2)',
                    borderRadius: 6,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--semi-color-fill-0)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <ChevronsRight style={{ width: 16, height: 16 }} />
                </div>
              </div>
            )}
          </div>
        }
        text={teams[0]?.name || 'RMF CRM'}
      >
        {!isCollapsed && !isMobile && (
          <div
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              cursor: 'pointer',
              color: 'var(--semi-color-text-2)',
              borderRadius: 6,
              transition: 'background-color 0.2s',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-0)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <ChevronsLeft style={{ width: 16, height: 16 }} />
          </div>
        )}
      </Nav.Header>

      {navGroups.map((group) => (
        <Nav.Sub
          key={group.title}
          itemKey={`group-${group.title}`}
          text={group.title}
          icon={
            isCollapsed && group.icon ? (
              <span className='inline-flex'>
                <group.icon size={16} />
              </span>
            ) : undefined
          }
        >
          {group.items.map((item) => (
            <Nav.Item
              key={item.url || item.title}
              itemKey={item.url || `item-${item.title}`}
              text={item.title}
              icon={
                item.icon ? (
                  <span className='inline-flex'>
                    <item.icon size={16} />
                  </span>
                ) : undefined
              }
            />
          ))}
        </Nav.Sub>
      ))}

      <Nav.Footer
        style={{
          borderTop: '1px solid var(--semi-color-border)',
          paddingTop: 8,
        }}
      >
        <NavUser collapsed={isCollapsed} />
      </Nav.Footer>
    </Nav>
  )

  // 移动端: SideSheet 抽屉
  if (isMobile) {
    return (
      <SideSheet
        visible={openMobile}
        onCancel={() => setOpenMobile(false)}
        placement='left'
        width={280}
        closable={false}
        bodyStyle={{ padding: 0, height: '100%' }}
        style={{ padding: 0 }}
      >
        {sidebarContent}
      </SideSheet>
    )
  }

  // 桌面: 直接渲染
  return sidebarContent
}
