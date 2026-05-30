/**
 * Tab导航状态管理Store
 * 使用Zustand + localStorage持久化
 * 实现多tab页面导航功能
 */
import { create } from 'zustand'
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from 'zustand/middleware'
import { getRouteConfig, hasRouteComponent } from '@/lib/route-components'

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
  removeAllTabs: (group?: string) => void
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
 * 每个模块最大Tab数量
 */
const MAX_TABS = 6

/**
 * 获取路径所属的模块分组
 * 顶部 Tab 按模块独立缓存，避免隐藏模块的 Tab 被当前模块操作误清理
 */
export function getTabGroup(path: string): string {
  if (path.startsWith('/yunke')) return 'yunke'
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/hr')) return 'hr'
  if (path.startsWith('/tools')) return 'tools'
  return 'crm'
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

const tabsStorage: StateStorage = {
  getItem: (name) => {
    const stored = localStorage.getItem(name)
    if (stored !== null) return stored

    const legacyStored = sessionStorage.getItem(name)
    if (legacyStored !== null) {
      localStorage.setItem(name, legacyStored)
      sessionStorage.removeItem(name)
    }
    return legacyStored
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value)
    sessionStorage.removeItem(name)
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
    sessionStorage.removeItem(name)
  },
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
        const existingTab = tabs.find((t) => t.path === tabData.path)

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

        let newTabs = [...tabs, newTab]
        const newTabGroup = getTabGroup(newTab.path)

        // 超出当前模块最大数量时，关闭同模块最早的可关闭tab
        while (
          newTabs.filter((t) => getTabGroup(t.path) === newTabGroup).length >
          MAX_TABS
        ) {
          const firstClosable = newTabs.find(
            (t) => t.closable && getTabGroup(t.path) === newTabGroup
          )
          if (!firstClosable) break
          newTabs = newTabs.filter((t) => t.id !== firstClosable.id)
        }

        set({
          tabs: newTabs,
          activeTabId: newTab.id,
        })
      },

      /**
       * 关闭Tab
       */
      removeTab: (tabId) => {
        const { tabs, activeTabId } = get()

        const tabToRemove = tabs.find((t) => t.id === tabId)

        // 不允许关闭不可关闭的tab
        if (!tabToRemove || !tabToRemove.closable) {
          return
        }

        const newTabs = tabs.filter((t) => t.id !== tabId)

        // 如果关闭的是当前激活的tab，需要切换到其他tab
        let newActiveTabId = activeTabId
        if (activeTabId === tabId) {
          const tabGroup = getTabGroup(tabToRemove.path)
          const groupTabs = tabs.filter((t) => getTabGroup(t.path) === tabGroup)
          const groupTabIndex = groupTabs.findIndex((t) => t.id === tabId)
          const newGroupTabs = newTabs.filter(
            (t) => getTabGroup(t.path) === tabGroup
          )

          // 优先切换到右边的tab，否则切换到左边
          if (groupTabIndex < newGroupTabs.length) {
            newActiveTabId = newGroupTabs[groupTabIndex].id
          } else if (newGroupTabs.length > 0) {
            newActiveTabId = newGroupTabs[newGroupTabs.length - 1].id
          } else if (newTabs.length > 0) {
            newActiveTabId = newTabs[0].id
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
        const targetTab = tabs.find((t) => t.id === tabId)

        if (!targetTab) {
          return
        }

        const targetGroup = getTabGroup(targetTab.path)
        const newTabs = tabs.filter(
          (t) =>
            getTabGroup(t.path) !== targetGroup || t.id === tabId || !t.closable
        )

        set({
          tabs: newTabs,
          activeTabId: tabId,
        })
      },

      /**
       * 关闭所有可关闭的Tab
       */
      removeAllTabs: (group) => {
        const { tabs, activeTabId } = get()
        const newTabs = tabs.filter(
          (t) =>
            !t.closable ||
            (group !== undefined && getTabGroup(t.path) !== group)
        )

        let newActiveTabId = activeTabId
        if (!newActiveTabId || !newTabs.some((t) => t.id === newActiveTabId)) {
          const fallbackTab =
            group !== undefined
              ? newTabs.find((t) => getTabGroup(t.path) === group)
              : newTabs[0]
          newActiveTabId = fallbackTab?.id ?? newTabs[0]?.id ?? null
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })
      },

      /**
       * 设置当前激活的Tab
       */
      setActiveTab: (tabId) => {
        const { tabs } = get()
        const tab = tabs.find((t) => t.id === tabId)

        if (tab) {
          set({ activeTabId: tabId })
        }
      },

      /**
       * 根据路径设置激活的Tab
       */
      setActiveTabByPath: (path) => {
        const { tabs } = get()
        const tab = tabs.find((t) => t.path === path)

        if (tab) {
          set({ activeTabId: tab.id })
        }
      },

      /**
       * 根据路径获取Tab
       */
      getTabByPath: (path) => {
        const { tabs } = get()
        return tabs.find((t) => t.path === path)
      },

      /**
       * 更新Tab标题
       */
      updateTabTitle: (tabId, title) => {
        const { tabs } = get()
        const newTabs = tabs.map((t) => (t.id === tabId ? { ...t, title } : t))

        set({ tabs: newTabs })
      },
    }),
    {
      name: 'tabs-storage',
      storage: createJSONStorage(() => tabsStorage),
      version: 1,
      // 迁移旧版本数据
      migrate: (persistedState, _version) => {
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
        let validTabs = persisted.tabs
          .filter((t) => t.path === '/' || hasRouteComponent(t.path))
          .map((t) => {
            if (t.path === '/')
              return { ...HOME_TAB, ...t, id: HOME_TAB.id, closable: false }

            const config = getRouteConfig(t.path)
            return config ? { ...t, title: config.title } : t
          })

        // 确保首页tab存在且配置正确
        const homeTabIndex = validTabs.findIndex((t) => t.path === '/')
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
        const activeTabExists = validTabs.some((t) => t.id === activeTabId)
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
    return tabs.find((t) => t.id === activeTabId)
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
    const activeTab = tabs.find((t) => t.id === activeTabId)
    return activeTab?.path || '/'
  })
