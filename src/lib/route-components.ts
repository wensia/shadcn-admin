/**
 * 路由配置
 * - routeComponents: 需要懒加载组件的旧路由（保留兼容）
 * - sidebarTitleMap: 从 sidebar-data 自动提取的 url→title 映射
 *   新增侧边栏菜单项时自动获得 tab 支持，无需手动维护
 */

import { lazy, type ComponentType } from 'react'
import {
  crmNavGroups,
  adminNavGroups,
  hrNavGroups,
  yunkeNavGroups,
  toolsNavGroups,
} from '@/components/layout/data/sidebar-data'

export type RouteComponent = ComponentType<unknown>

export interface RouteConfig {
  component?: React.LazyExoticComponent<RouteComponent>
  title: string
}

/**
 * 从侧边栏导航组中提取所有 url → title 映射
 */
function buildSidebarTitleMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const allGroups = [
    ...crmNavGroups,
    ...adminNavGroups,
    ...hrNavGroups,
    ...yunkeNavGroups,
    ...toolsNavGroups,
  ]
  for (const group of allGroups) {
    for (const item of group.items) {
      if (item.url) {
        map[item.url] = item.title
      }
      // 处理子菜单
      if (item.items) {
        for (const sub of item.items) {
          if (sub.url) {
            map[sub.url] = sub.title
          }
        }
      }
    }
  }
  return map
}

const sidebarTitleMap = buildSidebarTitleMap()

/**
 * 需要懒加载组件的路由（保留兼容）
 */
export const routeComponents: Record<string, RouteConfig> = {
  '/': {
    component: lazy(() => import('@/features/dashboard').then(m => ({ default: m.Dashboard }))),
    title: '仪表盘',
  },
  '/tasks': {
    component: lazy(() => import('@/features/tasks').then(m => ({ default: m.Tasks }))),
    title: '任务',
  },
  '/apps': {
    component: lazy(() => import('@/features/apps').then(m => ({ default: m.Apps }))),
    title: '应用',
  },
  '/chats': {
    component: lazy(() => import('@/features/chats').then(m => ({ default: m.Chats }))),
    title: '聊天',
  },
  '/users': {
    component: lazy(() => import('@/features/users').then(m => ({ default: m.Users }))),
    title: '用户',
  },
  '/settings': {
    component: lazy(() => import('@/features/settings/profile').then(m => ({ default: m.SettingsProfile }))),
    title: '个人资料',
  },
  '/settings/account': {
    component: lazy(() => import('@/features/settings/account').then(m => ({ default: m.SettingsAccount }))),
    title: '账户设置',
  },
  '/settings/appearance': {
    component: lazy(() => import('@/features/settings/appearance').then(m => ({ default: m.SettingsAppearance }))),
    title: '外观',
  },
  '/settings/notifications': {
    component: lazy(() => import('@/features/settings/notifications').then(m => ({ default: m.SettingsNotifications }))),
    title: '通知',
  },
  '/settings/display': {
    component: lazy(() => import('@/features/settings/display').then(m => ({ default: m.SettingsDisplay }))),
    title: '显示',
  },
  '/help-center': {
    component: lazy(() => import('@/features/help-center').then(m => ({ default: m.HelpCenterPage }))),
    title: '帮助中心',
  },
}

/**
 * 根据路径获取路由配置
 * 优先从 routeComponents 查找，其次从 sidebar 标题映射查找
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  const pathClean = path.split('?')[0]

  // 优先从 routeComponents 精确匹配
  if (routeComponents[pathClean]) {
    return routeComponents[pathClean]
  }

  // 从 sidebar 标题映射查找
  if (sidebarTitleMap[pathClean]) {
    return { title: sidebarTitleMap[pathClean] }
  }

  return undefined
}

/**
 * 检查路径是否有对应的路由配置
 */
export function hasRouteComponent(path: string): boolean {
  return getRouteConfig(path) !== undefined
}

/**
 * 获取路由标题
 */
export function getRouteTitle(path: string): string {
  const config = getRouteConfig(path)
  return config?.title || 'Unknown'
}
