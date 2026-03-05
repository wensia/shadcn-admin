import { Link } from '@tanstack/react-router'
import { Dropdown, Avatar } from '@douyinfe/semi-ui-19'
import useDialogState from '@/hooks/use-dialog-state'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { useCurrentUser } from '@/stores/auth-store'

/**
 * 获取用户头像缩写
 */
function getAvatarFallback(name?: string): string {
  if (!name) return 'U'
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.slice(0, 2)
  }
  return name.charAt(0).toUpperCase()
}

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const currentUser = useCurrentUser()

  const displayName = currentUser?.name || currentUser?.username || '未登录'
  const displayEmail = currentUser?.email || currentUser?.phone || ''
  const avatarFallback = getAvatarFallback(currentUser?.name || currentUser?.username)

  const menu = (
    <Dropdown.Menu>
      <Dropdown.Item disabled>
        <div className='flex flex-col gap-1.5 py-1'>
          <p className='text-sm leading-none font-medium'>{displayName}</p>
          <p className='text-xs leading-none text-[var(--semi-color-text-2)]'>
            {displayEmail}
          </p>
        </div>
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item>
        <Link to='/settings' className='flex w-full items-center justify-between'>
          个人资料
          <span className='text-xs text-[var(--semi-color-text-2)]'>⇧⌘P</span>
        </Link>
      </Dropdown.Item>
      <Dropdown.Item>
        <Link to='/settings' className='flex w-full items-center justify-between'>
          账单管理
          <span className='text-xs text-[var(--semi-color-text-2)]'>⌘B</span>
        </Link>
      </Dropdown.Item>
      <Dropdown.Item>
        <Link to='/settings' className='flex w-full items-center justify-between'>
          系统设置
          <span className='text-xs text-[var(--semi-color-text-2)]'>⌘S</span>
        </Link>
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item
        type='danger'
        onClick={() => setOpen(true)}
      >
        <span className='flex w-full items-center justify-between'>
          退出登录
          <span className='text-xs'>⇧⌘Q</span>
        </span>
      </Dropdown.Item>
    </Dropdown.Menu>
  )

  return (
    <>
      <Dropdown
        trigger='click'
        position='bottomRight'
        clickToHide
        render={menu}
      >
        <Avatar
          size='small'
          className='cursor-pointer'
          alt={displayName}
        >
          {avatarFallback}
        </Avatar>
      </Dropdown>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
