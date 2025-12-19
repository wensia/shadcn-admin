/**
 * Tab导航状态管理Store
 * 使用Zustand + localStorage持久化
 * 实现多tab页面导航功能
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hasRouteComponent } from '@/lib/route-components'

/**
 * Tab信息接口
 */
export interface TabInfo {
  id: string
  title: string
  path: string
  closable: boolean
  icon?: string
}

/**
 * Tab状态接口
 */
interface TabsState {
  // 状态
  tabs: TabInfo[]
  activeTabId: string | null

  // Actions
  addTab: (tab: Omit<TabInfo, 'id'>) => void
  removeTab: (tabId: string) => void
  removeOtherTabs: (tabId: string) => void
  removeAllTabs: () => void
  setActiveTab: (tabId: string) => void
  setActiveTabByPath: (path: string) => void
  getTabByPath: (path: string) => TabInfo | undefined
  updateTabTitle: (tabId: string, title: string) => void
}

/**
 * 生成Tab ID
 */
function generateTabId(path: string): string {
  return `tab-${path.replace(/\//g, '-')}-${Date.now()}`
}

/**
 * 首页Tab配置
 */
const HOME_TAB: TabInfo = {
  id: 'tab-home',
  title: 'Dashboard',
  path: '/',
  closable: false,
}

/**
 * Tab状态Store
 * 使用persist中间件实现localStorage持久化
 */
export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      // 初始状态 - 默认包含首页tab
      tabs: [HOME_TAB],
      activeTabId: HOME_TAB.id,

      /**
       * 添加新Tab或激活已存在的Tab
       */
      addTab: (tabData) => {
        const { tabs } = get()

        // 检查是否已存在相同path的tab
        const existingTab = tabs.find(t => t.path === tabData.path)

        if (existingTab) {
          // 已存在则激活
          set({ activeTabId: existingTab.id })
          return
        }

        // 创建新tab
        const newTab: TabInfo = {
          id: generateTabId(tabData.path),
          ...tabData,
        }

        set({
          tabs: [...tabs, newTab],
          activeTabId: newTab.id,
        })
      },

      /**
       * 关闭Tab
       */
      removeTab: (tabId) => {
        const { tabs, activeTabId } = get()

        const tabToRemove = tabs.find(t => t.id === tabId)

        // 不允许关闭不可关闭的tab
        if (!tabToRemove || !tabToRemove.closable) {
          return
        }

        const tabIndex = tabs.findIndex(t => t.id === tabId)
        const newTabs = tabs.filter(t => t.id !== tabId)

        // 如果关闭的是当前激活的tab，需要切换到其他tab
        let newActiveTabId = activeTabId
        if (activeTabId === tabId) {
          // 优先切换到右边的tab，否则切换到左边
          if (tabIndex < newTabs.length) {
            newActiveTabId = newTabs[tabIndex].id
          } else if (newTabs.length > 0) {
            newActiveTabId = newTabs[newTabs.length - 1].id
          } else {
            newActiveTabId = null
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })
      },

      /**
       * 关闭其他Tab（保留当前和不可关闭的）
       */
      removeOtherTabs: (tabId) => {
        const { tabs } = get()
        const newTabs = tabs.filter(t => t.id === tabId || !t.closable)

        set({
          tabs: newTabs,
          activeTabId: tabId,
        })
      },

      /**
       * 关闭所有可关闭的Tab
       */
      removeAllTabs: () => {
        const { tabs } = get()
        const newTabs = tabs.filter(t => !t.closable)

        set({
          tabs: newTabs,
          activeTabId: newTabs.length > 0 ? newTabs[0].id : null,
        })
      },

      /**
       * 设置当前激活的Tab
       */
      setActiveTab: (tabId) => {
        const { tabs } = get()
        const tab = tabs.find(t => t.id === tabId)

        if (tab) {
          set({ activeTabId: tabId })
        }
      },

      /**
       * 根据路径设置激活的Tab
       */
      setActiveTabByPath: (path) => {
        const { tabs } = get()
        const tab = tabs.find(t => t.path === path)

        if (tab) {
          set({ activeTabId: tab.id })
        }
      },

      /**
       * 根据路径获取Tab
       */
      getTabByPath: (path) => {
        const { tabs } = get()
        return tabs.find(t => t.path === path)
      },

      /**
       * 更新Tab标题
       */
      updateTabTitle: (tabId, title) => {
        const { tabs } = get()
        const newTabs = tabs.map(t =>
          t.id === tabId ? { ...t, title } : t
        )

        set({ tabs: newTabs })
      },
    }),
    {
      name: 'tabs-storage',
      version: 1,
      // 迁移旧版本数据
      migrate: (persistedState, version) => {
        // 旧版本数据（无版本号）直接返回，由merge函数处理验证
        return persistedState as TabsState
      },
      // 合并恢复的数据，进行验证和清理
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TabsState> | undefined

        if (!persisted || !persisted.tabs) {
          return currentState
        }

        // 过滤无效的tab路径，只保留有对应路由配置的tab
        let validTabs = persisted.tabs.filter(t =>
          t.path === '/' || hasRouteComponent(t.path)
        )

        // 确保首页tab存在且配置正确
        const homeTabIndex = validTabs.findIndex(t => t.path === '/')
        if (homeTabIndex === -1) {
          // 首页tab不存在，添加到开头
          validTabs = [HOME_TAB, ...validTabs]
        } else {
          // 确保首页tab的配置正确（id固定，不可关闭）
          validTabs[homeTabIndex] = {
            ...validTabs[homeTabIndex],
            id: 'tab-home',
            closable: false,
          }
        }

        // 验证activeTabId是否有效
        let activeTabId = persisted.activeTabId || 'tab-home'
        const activeTabExists = validTabs.some(t => t.id === activeTabId)
        if (!activeTabExists) {
          activeTabId = 'tab-home'
        }

        return {
          ...currentState,
          tabs: validTabs,
          activeTabId,
        }
      },
    }
  )
)

/**
 * 便捷hook - 获取当前激活的Tab
 */
export const useActiveTab = () =>
  useTabsStore((state) => {
    const { tabs, activeTabId } = state
    return tabs.find(t => t.id === activeTabId)
  })

/**
 * 便捷hook - 获取所有Tab
 */
export const useTabs = () => useTabsStore((state) => state.tabs)

/**
 * 便捷hook - 获取当前激活Tab的路径
 */
export const useActiveTabPath = () =>
  useTabsStore((state) => {
    const { tabs, activeTabId } = state
    const activeTab = tabs.find(t => t.id === activeTabId)
    return activeTab?.path || '/'
  })
