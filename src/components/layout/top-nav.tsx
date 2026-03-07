import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Dropdown } from '@douyinfe/semi-ui-19'

type TopNavProps = React.HTMLAttributes<HTMLElement> & {
  links: {
    title: string
    href: string
    isActive: boolean
    disabled?: boolean
  }[]
}

export function TopNav({ className, links, ...props }: TopNavProps) {
  return (
    <>
      <div className='lg:hidden'>
        <Dropdown
          trigger='click'
          position='bottomLeft'
          clickToHide
          render={
            <Dropdown.Menu>
              {links.map(({ title, href, isActive, disabled }) => (
                <Dropdown.Item key={`${title}-${href}`} disabled={disabled}>
                  <Link
                    to={href}
                    className={!isActive ? 'text-muted-foreground' : ''}
                    disabled={disabled}
                  >
                    {title}
                  </Link>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          }
        >
          <span style={{ display: 'inline-flex' }}>
            <Button
              theme='outline'
              icon={<Menu className='h-4 w-4' />}
              className='md:size-7'
            />
          </span>
        </Dropdown>
      </div>

      <nav
        className={cn(
          'hidden items-center space-x-4 lg:flex lg:space-x-4 xl:space-x-6',
          className
        )}
        {...props}
      >
        {links.map(({ title, href, isActive, disabled }) => (
          <Link
            key={`${title}-${href}`}
            to={href}
            disabled={disabled}
            className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? '' : 'text-muted-foreground'}`}
          >
            {title}
          </Link>
        ))}
      </nav>
    </>
  )
}
