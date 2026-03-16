/**
 * Header 右侧操作区组件
 * 包含通知、主题切换、配置、用户头像等通用功能
 */

import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { NotificationBell } from '@/features/notifications'

interface HeaderActionsProps {
  showSearch?: boolean
  showNotification?: boolean
  showThemeSwitch?: boolean
  showConfig?: boolean
}

export function HeaderActions({
  showSearch = true,
  showNotification = true,
  showThemeSwitch = true,
  showConfig = true,
}: HeaderActionsProps) {
  return (
    <div className="ms-auto flex items-center space-x-4">
      {showSearch && <Search />}
      {showNotification && <NotificationBell />}
      {showThemeSwitch && <ThemeSwitch />}
      {showConfig && <ConfigDrawer />}
    </div>
  )
}
