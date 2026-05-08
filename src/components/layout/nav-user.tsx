/**
 * NavUser - 侧边栏底部用户信息 + 下拉菜单
 * 使用 Semi Dropdown + Avatar
 */
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  IconBell,
  IconCreditCard,
  IconExit,
  IconLock,
  IconSetting,
  IconUser,
} from '@douyinfe/semi-icons'
import { Avatar, Dropdown } from '@douyinfe/semi-ui-19'
import { ChevronsUpDown } from 'lucide-react'
import {
  type IdentityInfo,
  useAuthStore,
  useAvailableIdentities,
  useCurrentIdentity,
  useCurrentUser,
  useHasMultipleIdentities,
} from '@/stores/auth-store'
import { toast } from '@/lib/toast'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { ConfigDrawer } from '@/components/config-drawer'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { IdentityCard } from '@/features/auth/select-identity/components/identity-card'
import { getIdentityScopeName } from '@/features/auth/select-identity/utils'

function getAvatarFallback(name?: string): string {
  if (!name) return 'U'
  if (/[\u4e00-\u9fa5]/.test(name)) return name.slice(0, 2)
  return name.charAt(0).toUpperCase()
}

export function NavUser({ collapsed }: { collapsed?: boolean }) {
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const currentUser = useCurrentUser()
  const currentIdentity = useCurrentIdentity()
  const availableIdentities = useAvailableIdentities()
  const hasMultipleIdentities = useHasMultipleIdentities()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const displayName = currentUser?.name || currentUser?.username || '未登录'
  const avatarFallback = getAvatarFallback(
    currentUser?.name || currentUser?.username
  )
  const identityScopeName = currentIdentity
    ? getIdentityScopeName(currentIdentity)
    : ''
  const identityDetail = currentIdentity
    ? `${currentIdentity.department_name} · ${currentIdentity.position_name}`
    : ''
  const displayIdentity = currentIdentity
    ? `${identityScopeName} · ${identityDetail}`
    : currentUser?.position_name || currentUser?.phone || '暂无身份'
  const sortedIdentities = useMemo(() => {
    if (!currentIdentity) return availableIdentities
    return [...availableIdentities].sort((a, b) => {
      if (a.id === currentIdentity.id) return -1
      if (b.id === currentIdentity.id) return 1
      return 0
    })
  }, [availableIdentities, currentIdentity])

  const handleSwitchIdentity = useCallback(
    async (identity: IdentityInfo) => {
      if (switchingId) return
      if (identity.id === currentIdentity?.id) return

      setSwitchingId(identity.id)
      try {
        await useAuthStore.getState().selectIdentity(identity.id)

        const updatedIdentities = availableIdentities.map((item) => ({
          ...item,
          is_last_used: item.id === identity.id,
        }))
        useAuthStore.getState().setAvailableIdentities(updatedIdentities)

        toast.success(`已切换到 ${getIdentityScopeName(identity)}`)
        queryClient.invalidateQueries()

        const restrictedPaths = ['/crm/', '/admin/', '/yunke/', '/hr/']
        const isRestricted = restrictedPaths.some((path) =>
          location.pathname.startsWith(path)
        )
        if (isRestricted) {
          navigate({ to: '/', replace: true })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '切换身份失败'
        toast.error(message)
      } finally {
        setSwitchingId(null)
      }
    },
    [
      availableIdentities,
      currentIdentity?.id,
      location.pathname,
      navigate,
      queryClient,
      switchingId,
    ]
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
                {currentIdentity && (
                  <>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--semi-color-text-1)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}
                    >
                      {identityScopeName}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--semi-color-text-2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}
                    >
                      {identityDetail}
                    </div>
                  </>
                )}
              </div>
            </div>
            {hasMultipleIdentities && (
              <div
                style={{
                  padding: '6px 8px 8px',
                  width: 300,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--semi-color-text-2)',
                    padding: '0 4px 6px',
                  }}
                >
                  切换工作身份
                </div>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  {sortedIdentities.map((identity) => (
                    <IdentityCard
                      key={identity.id}
                      identity={identity}
                      isActive={identity.id === currentIdentity?.id}
                      isSelecting={switchingId === identity.id}
                      disabled={
                        switchingId !== null && switchingId !== identity.id
                      }
                      compact
                      onClick={() => handleSwitchIdentity(identity)}
                    />
                  ))}
                </div>
              </div>
            )}
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
            <Dropdown.Item icon={<IconLock />} onClick={() => setPwdOpen(true)}>
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
            e.currentTarget.style.backgroundColor = 'var(--semi-color-fill-0)'
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
                  {displayIdentity}
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
