/**
 * 路由到组件的映射
 * 使用React.lazy实现按需加载
 * 用于TabsManager渲染tab内容
 */

import { lazy, type ComponentType } from 'react'

/**
 * 路由组件映射类型
 */
export type RouteComponent = ComponentType<unknown>

/**
 * 路由配置接口
 */
export interface RouteConfig {
  component: React.LazyExoticComponent<RouteComponent>
  title: string
}

/**
 * 路由到组件的映射表
 * key: 路由路径
 * value: 懒加载组件和标题
 */
export const routeComponents: Record<string, RouteConfig> = {
  // Dashboard
  '/': {
    component: lazy(() => import('@/features/dashboard').then(m => ({ default: m.Dashboard }))),
    title: 'Dashboard',
  },

  // Tasks
  '/tasks': {
    component: lazy(() => import('@/features/tasks').then(m => ({ default: m.Tasks }))),
    title: 'Tasks',
  },

  // Apps
  '/apps': {
    component: lazy(() => import('@/features/apps').then(m => ({ default: m.Apps }))),
    title: 'Apps',
  },

  // Chats
  '/chats': {
    component: lazy(() => import('@/features/chats').then(m => ({ default: m.Chats }))),
    title: 'Chats',
  },

  // Users
  '/users': {
    component: lazy(() => import('@/features/users').then(m => ({ default: m.Users }))),
    title: 'Users',
  },

  // CRM - Leads
  '/crm/leads': {
    component: lazy(() => import('@/features/crm/leads/leads-page').then(m => ({ default: m.LeadsPage }))),
    title: '线索管理',
  },

  // CRM - Leads Pool
  '/crm/leads/pool': {
    component: lazy(() => import('@/features/crm/leads-pool').then(m => ({ default: m.LeadsPoolPage }))),
    title: '公海线索',
  },

  // CRM - Continuous Call
  '/crm/continuous-call': {
    component: lazy(() => import('@/features/crm/continuous-call').then(m => ({ default: m.ContinuousCallPage }))),
    title: '快捷外呼',
  },

  // CRM - Batch Import
  '/crm/batch-import': {
    component: lazy(() => import('@/features/crm/batch-import').then(m => ({ default: m.BatchImportPage }))),
    title: '批量导入',
  },

  // Settings
  '/settings': {
    component: lazy(() => import('@/features/settings/profile').then(m => ({ default: m.SettingsProfile }))),
    title: 'Profile',
  },
  '/settings/account': {
    component: lazy(() => import('@/features/settings/account').then(m => ({ default: m.SettingsAccount }))),
    title: 'Account',
  },
  '/settings/appearance': {
    component: lazy(() => import('@/features/settings/appearance').then(m => ({ default: m.SettingsAppearance }))),
    title: 'Appearance',
  },
  '/settings/notifications': {
    component: lazy(() => import('@/features/settings/notifications').then(m => ({ default: m.SettingsNotifications }))),
    title: 'Notifications',
  },
  '/settings/display': {
    component: lazy(() => import('@/features/settings/display').then(m => ({ default: m.SettingsDisplay }))),
    title: 'Display',
  },

  // Help Center
  '/help-center': {
    component: lazy(() => import('@/components/coming-soon').then(m => ({ default: m.ComingSoon }))),
    title: 'Help Center',
  },
}

/**
 * 根据路径获取组件配置
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  // 先尝试精确匹配
  if (routeComponents[path]) {
    return routeComponents[path]
  }

  // 处理带参数的路径（移除查询参数）
  const pathWithoutQuery = path.split('?')[0]
  if (routeComponents[pathWithoutQuery]) {
    return routeComponents[pathWithoutQuery]
  }

  return undefined
}

/**
 * 检查路径是否有对应的组件
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
