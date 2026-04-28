import { useState, type JSX } from 'react'
import { useLocation, useNavigate, Link } from '@tanstack/react-router'
import { Select, Button } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'

type SidebarNavProps = React.HTMLAttributes<HTMLElement> & {
  items: {
    href: string
    title: string
    icon: JSX.Element
  }[]
}

type SidebarSelectValue = string | string[] | undefined
type SidebarSelectedOption = {
  value?: string | number | string[]
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [val, setVal] = useState(pathname ?? '/settings')

  const handleSelect = (value: SidebarSelectValue) => {
    if (typeof value !== 'string') return
    setVal(value)
    navigate({ to: value })
  }

  const selectOptions = items.map((item) => ({
    value: item.href,
    label: (
      <div className='flex gap-x-4 px-2 py-1'>
        <span className='scale-125'>{item.icon}</span>
        <span className='text-md'>{item.title}</span>
      </div>
    ),
  }))

  return (
    <>
      <div className='p-1 md:hidden'>
        <Select
          value={val}
          onChange={handleSelect}
          optionList={selectOptions}
          style={{ width: '100%' }}
          renderSelectedItem={(option: SidebarSelectedOption) => {
            const item = items.find((i) => i.href === option.value)
            return item ? (
              <div className='flex gap-x-4 px-2 py-1'>
                <span className='scale-125'>{item.icon}</span>
                <span className='text-md'>{item.title}</span>
              </div>
            ) : null
          }}
        />
      </div>

      <div className='hidden w-full min-w-40 px-1 py-2 md:block overflow-x-auto'>
        <nav
          className={cn(
            'flex space-x-2 py-1 lg:flex-col lg:space-y-1 lg:space-x-0',
            className
          )}
          {...props}
        >
          {items.map((item) => (
            <Link key={item.href} to={item.href} style={{ textDecoration: 'none' }}>
              <Button
                theme={pathname === item.href ? 'light' : 'borderless'}
                style={{ width: '100%', justifyContent: 'flex-start' }}
                icon={<span className='me-2'>{item.icon}</span>}
              >
                {item.title}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
