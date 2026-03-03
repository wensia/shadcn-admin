/**
 * TabsManager - 多标签页管理组件
 * 实现类似浏览器/IDE的tab页面导航功能
 * 使用Outlet渲染当前路由组件，保持与TanStack Router兼容
 */

import { useEffect, useRef } from 'react'
import { useNavigate, useLocation, Outlet } from '@tanstack/react-router'
import { X, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dropdown, Button as SemiButton } from '@douyinfe/semi-ui-19'
import { useTabsStore, type TabInfo } from '@/stores/tabs-store'
import { getRouteConfig } from '@/lib/route-components'


/**
 * 单个Tab项组件
 */
function TabItem({
  tab,
  isActive,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseAll,
}: {
  tab: TabInfo
  isActive: boolean
  onActivate: () => void
  onClose: () => void
  onCloseOthers: () => void
  onCloseAll: () => void
}) {
  return (
    <Dropdown
      trigger='contextMenu'
      position='bottomLeft'
      clickToHide
      render={
        <Dropdown.Menu>
          {tab.closable && (
            <>
              <Dropdown.Item onClick={onClose}>
                关闭当前
              </Dropdown.Item>
              <Dropdown.Divider />
            </>
          )}
          <Dropdown.Item onClick={onCloseOthers}>
            关闭其他
          </Dropdown.Item>
          <Dropdown.Item onClick={onCloseAll}>
            关闭全部
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <div
        className={cn(
          'group flex h-9 shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 text-sm transition-colors',
          isActive
            ? 'border-primary bg-background text-foreground'
            : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
        onClick={onActivate}
      >
        <LayoutDashboard className='h-4 w-4 shrink-0' />
        <span className='max-w-[120px] truncate'>{tab.title}</span>
        {tab.closable && (
          <SemiButton
            theme='borderless'
            className={cn(
              '!ml-1 !h-auto !min-w-0 !rounded-sm !p-0.5 opacity-0 transition-opacity hover:!bg-muted group-hover:opacity-100',
              isActive && 'opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            <X className='h-3.5 w-3.5' />
          </SemiButton>
        )}
      </div>
    </Dropdown>
  )
}

/**
 * TabsManager主组件
 */
/**
 * 获取路径所属的模块前缀
 * 每个顶级路径独立一组 tabs，互不混用
 */
function getModuleGroup(path: string): string {
  if (path.startsWith('/yunke')) return 'yunke'
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/hr')) return 'hr'
  return 'crm'
}

export function TabsManager() {
  const navigate = useNavigate()
  const location = useLocation()
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  // 用于跟踪是否是内部导航触发的变化，避免无限循环
  const isInternalNavigation = useRef(false)
  // 使用空字符串初始化，确保首次渲染时会处理当前路径
  const lastPathRef = useRef('')

  const {
    tabs,
    activeTabId,
    removeTab,
    removeOtherTabs,
    removeAllTabs,
    setActiveTab,
  } = useTabsStore()

  // 根据当前路径过滤同模块的 tabs
  const currentGroup = getModuleGroup(location.pathname)
  const visibleTabs = tabs.filter(tab => getModuleGroup(tab.path) === currentGroup)

  // 监听URL变化，同步tab状态（只处理外部导航，如侧边栏点击）
  useEffect(() => {
    const currentPath = location.pathname

    // 如果是内部导航触发的，跳过处理
    if (isInternalNavigation.current) {
      isInternalNavigation.current = false
      lastPathRef.current = currentPath
      return
    }

    // 如果路径没变化，跳过
    if (currentPath === lastPathRef.current) {
      return
    }

    lastPathRef.current = currentPath

    // 使用store的getState获取最新状态，避免依赖activeTabId导致循环
    const store = useTabsStore.getState()
    const existingTab = store.getTabByPath(currentPath)

    if (existingTab) {
      // 已存在则激活（不触发导航）
      if (existingTab.id !== store.activeTabId) {
        store.setActiveTab(existingTab.id)
      }
    } else {
      // 不存在则添加新tab
      const config = getRouteConfig(currentPath)
      if (config) {
        store.addTab({
          title: config.title,
          path: currentPath,
          closable: currentPath !== '/',
        })
      }
    }
  }, [location.pathname]) // 只依赖pathname，避免循环

  // 滚动到激活的tab
  useEffect(() => {
    if (tabsContainerRef.current && activeTabId) {
      const activeElement = tabsContainerRef.current.querySelector(
        `[data-tab-id="${activeTabId}"]`
      )
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center' })
      }
    }
  }, [activeTabId])

  const handleActivateTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab && tab.path !== location.pathname) {
      setActiveTab(tabId)
      isInternalNavigation.current = true
      lastPathRef.current = tab.path
      navigate({ to: tab.path })
    } else if (tab) {
      setActiveTab(tabId)
    }
  }

  const handleCloseTab = (tabId: string) => {
    const tabToClose = tabs.find((t) => t.id === tabId)
    if (!tabToClose?.closable) return

    removeTab(tabId)

    // 如果关闭的是当前tab，需要导航到新的激活tab
    if (tabId === activeTabId) {
      const store = useTabsStore.getState()
      const newActiveTab = store.tabs.find((t) => t.id === store.activeTabId)
      if (newActiveTab && newActiveTab.path !== location.pathname) {
        isInternalNavigation.current = true
        lastPathRef.current = newActiveTab.path
        navigate({ to: newActiveTab.path })
      }
    }
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Tab栏 */}
      <div className='shrink-0 border-b bg-muted/30'>
        <div className='w-full overflow-x-auto'>
          <div
            ref={tabsContainerRef}
            className='flex h-10 items-end'
          >
            {visibleTabs.map((tab) => (
              <div key={tab.id} data-tab-id={tab.id}>
                <TabItem
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onActivate={() => handleActivateTab(tab.id)}
                  onClose={() => handleCloseTab(tab.id)}
                  onCloseOthers={() => removeOtherTabs(tab.id)}
                  onCloseAll={() => removeAllTabs()}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab内容区域 - 使用Outlet渲染当前路由组件 */}
      {/* flex flex-col 确保子元素高度受约束，overflow-hidden 让内部组件控制滚动 */}
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <Outlet />
      </div>
    </div>
  )
}
