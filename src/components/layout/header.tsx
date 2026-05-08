import { useEffect, useState } from 'react'
import { Button } from '@douyinfe/semi-ui-19'
import { PanelLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/context/sidebar-context'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

function SidebarTrigger() {
  const { toggleSidebar } = useSidebar()
  return (
    <Button
      theme='borderless'
      icon={<PanelLeftIcon style={{ width: 16, height: 16 }} />}
      onClick={toggleSidebar}
      style={{ color: 'var(--semi-color-text-2)' }}
    />
  )
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-16',
        fixed && 'header-fixed peer/header sticky top-0 w-[inherit]',
        offset > 10 && fixed ? 'shadow' : 'shadow-none',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative flex h-full items-center gap-3 p-4 sm:gap-4',
          offset > 10 &&
            fixed &&
            'after:absolute after:inset-0 after:-z-10 after:bg-background/20 after:backdrop-blur-lg'
        )}
      >
        <SidebarTrigger />
        <div
          style={{
            width: 1,
            height: 24,
            backgroundColor: 'var(--semi-color-border)',
          }}
        />
        {children}
      </div>
    </header>
  )
}
