import { useEffect } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { Button, Dropdown } from '@douyinfe/semi-ui-19'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()

  /* Update theme-color meta tag
   * when theme is updated */
  useEffect(() => {
    const themeColor = theme === 'dark' ? '#020817' : '#fff'
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) metaThemeColor.setAttribute('content', themeColor)
  }, [theme])

  const menu = (
    <Dropdown.Menu>
      <Dropdown.Item onClick={() => setTheme('light')}>
        <span className='flex w-full items-center justify-between'>
          Light
          <Check
            size={14}
            className={cn('ms-auto', theme !== 'light' && 'hidden')}
          />
        </span>
      </Dropdown.Item>
      <Dropdown.Item onClick={() => setTheme('dark')}>
        <span className='flex w-full items-center justify-between'>
          Dark
          <Check
            size={14}
            className={cn('ms-auto', theme !== 'dark' && 'hidden')}
          />
        </span>
      </Dropdown.Item>
      <Dropdown.Item onClick={() => setTheme('system')}>
        <span className='flex w-full items-center justify-between'>
          System
          <Check
            size={14}
            className={cn('ms-auto', theme !== 'system' && 'hidden')}
          />
        </span>
      </Dropdown.Item>
    </Dropdown.Menu>
  )

  return (
    <Dropdown
      trigger='click'
      position='bottomRight'
      clickToHide
      render={menu}
    >
      <Button
        theme='borderless'
        icon={
          <>
            <Sun className='size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
            <Moon className='absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
          </>
        }
        className='scale-95 !rounded-full'
      />
    </Dropdown>
  )
}
