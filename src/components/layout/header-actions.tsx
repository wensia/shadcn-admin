/**
 * Header 右侧操作区组件
 * 包含搜索、主题切换、配置等通用功能
 */

import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

interface HeaderActionsProps {
  showSearch?: boolean
  showThemeSwitch?: boolean
  showConfig?: boolean
}

export function HeaderActions({
  showSearch = true,
  showThemeSwitch = true,
  showConfig = true,
}: HeaderActionsProps) {
  return (
    <div className="ms-auto flex items-center space-x-4">
      {showSearch && <Search />}
      {showThemeSwitch && <ThemeSwitch />}
      {showConfig && <ConfigDrawer />}
    </div>
  )
}
