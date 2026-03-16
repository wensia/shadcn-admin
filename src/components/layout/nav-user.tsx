/**
 * NavUser - 侧边栏底部用户信息 + 下拉菜单
 * 使用 Semi Dropdown + Avatar 替代 shadcn DropdownMenu
 */

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Dropdown, Avatar } from '@douyinfe/semi-ui-19'
import {
  IconSetting,
  IconUser,
  IconBell,
  IconCreditCard,
  IconExit,
  IconLock,
} from '@douyinfe/semi-icons'
import { ChevronsUpDown } from 'lucide-react'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { ConfigDrawer } from '@/components/config-drawer'
import { useCurrentUser } from '@/stores/auth-store'

function getAvatarFallback(name?: string): string {
  if (!name) return 'U'
  if (/[\u4e00-\u9fa5]/.test(name)) return name.slice(0, 2)
  return name.charAt(0).toUpperCase()
}

export function NavUser({ collapsed }: { collapsed?: boolean }) {
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  const currentUser = useCurrentUser()
  const displayName = currentUser?.name || currentUser?.username || '未登录'
  const displayEmail = currentUser?.email || currentUser?.phone || ''
  const avatarFallback = getAvatarFallback(
    currentUser?.name || currentUser?.username
  )

  return (
    <>
      <Dropdown
        trigger='click'
        position='topLeft'
        clickToHide
        getPopupContainer={() => document.body}
        render={
          <Dropdown.Menu>
            {/* 用户信息头 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
              }}
            >
              <Avatar
                size='small'
                style={{ backgroundColor: 'var(--semi-color-primary)' }}
              >
                {avatarFallback}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--semi-color-text-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayEmail}
                </div>
              </div>
            </div>
            <Dropdown.Divider />
            <Dropdown.Item
              icon={<IconSetting />}
              onClick={() => setConfigOpen(true)}
            >
              主题设置
            </Dropdown.Item>
            <Dropdown.Item icon={<IconUser />}>
              <Link
                to='/settings/account'
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                账户信息
              </Link>
            </Dropdown.Item>
            <Dropdown.Item icon={<IconCreditCard />}>
              <Link
                to='/settings'
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                账单管理
              </Link>
            </Dropdown.Item>
            <Dropdown.Item icon={<IconBell />}>
              <Link
                to='/settings/notifications'
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                通知设置
              </Link>
            </Dropdown.Item>
            <Dropdown.Item
              icon={<IconLock />}
              onClick={() => setPwdOpen(true)}
            >
              修改密码
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              type='danger'
              icon={<IconExit />}
              onClick={() => setSignOutOpen(true)}
            >
              退出登录
            </Dropdown.Item>
          </Dropdown.Menu>
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '8px 0' : '8px 16px',
            cursor: 'pointer',
            borderRadius: 6,
            margin: 0,
            width: '100%',
            boxSizing: 'border-box',
            transition: 'background-color 0.2s',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              'var(--semi-color-fill-0)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <Avatar
            size='small'
            style={{
              backgroundColor: 'var(--semi-color-primary)',
              flexShrink: 0,
            }}
          >
            {avatarFallback}
          </Avatar>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--semi-color-text-2)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayEmail}
                </div>
              </div>
              <ChevronsUpDown
                style={{
                  width: 14,
                  height: 14,
                  color: 'var(--semi-color-text-2)',
                  flexShrink: 0,
                }}
              />
            </>
          )}
        </div>
      </Dropdown>

      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
      <ConfigDrawer
        open={configOpen}
        onOpenChange={setConfigOpen}
        showTrigger={false}
      />
    </>
  )
}
