import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, Laptop, Moon, Sun } from 'lucide-react'
import { AutoComplete, Modal } from '@douyinfe/semi-ui-19'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import { sidebarData } from './layout/data/sidebar-data'

interface CommandOption {
  value: string
  label: React.ReactNode
  group: string
  onSelect: () => void
}

export function CommandMenu() {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const [searchValue, setSearchValue] = React.useState('')

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      setSearchValue('')
      command()
    },
    [setOpen]
  )

  // 构建所有选项
  const allOptions = React.useMemo(() => {
    const options: CommandOption[] = []

    // 导航项
    sidebarData.navGroups.forEach((group) => {
      group.items.forEach((navItem) => {
        if (navItem.url) {
          options.push({
            value: navItem.title,
            label: (
              <div className='flex items-center gap-2'>
                <ArrowRight className='size-3 text-[var(--semi-color-text-2)]' />
                {navItem.title}
              </div>
            ),
            group: group.title,
            onSelect: () => runCommand(() => navigate({ to: navItem.url })),
          })
        }

        navItem.items?.forEach((subItem) => {
          options.push({
            value: `${navItem.title}-${subItem.title}`,
            label: (
              <div className='flex items-center gap-2'>
                <ArrowRight className='size-3 text-[var(--semi-color-text-2)]' />
                {navItem.title} <ChevronRight className='size-3' /> {subItem.title}
              </div>
            ),
            group: group.title,
            onSelect: () => runCommand(() => navigate({ to: subItem.url })),
          })
        })
      })
    })

    // 主题选项
    options.push(
      {
        value: 'theme-light',
        label: (
          <div className='flex items-center gap-2'>
            <Sun className='size-4' /> Light
          </div>
        ),
        group: 'Theme',
        onSelect: () => runCommand(() => setTheme('light')),
      },
      {
        value: 'theme-dark',
        label: (
          <div className='flex items-center gap-2'>
            <Moon className='size-4 scale-90' /> Dark
          </div>
        ),
        group: 'Theme',
        onSelect: () => runCommand(() => setTheme('dark')),
      },
      {
        value: 'theme-system',
        label: (
          <div className='flex items-center gap-2'>
            <Laptop className='size-4' /> System
          </div>
        ),
        group: 'Theme',
        onSelect: () => runCommand(() => setTheme('system')),
      }
    )

    return options
  }, [navigate, runCommand, setTheme])

  // 过滤选项
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return allOptions
    const keyword = searchValue.toLowerCase()
    return allOptions.filter((opt) =>
      opt.value.toLowerCase().includes(keyword)
    )
  }, [allOptions, searchValue])

  // 按分组渲染
  const groupedOptions = React.useMemo(() => {
    const groups = new Map<string, CommandOption[]>()
    filteredOptions.forEach((opt) => {
      const list = groups.get(opt.group) || []
      list.push(opt)
      groups.set(opt.group, list)
    })
    return groups
  }, [filteredOptions])

  return (
    <Modal
      visible={open}
      onCancel={() => {
        setOpen(false)
        setSearchValue('')
      }}
      footer={null}
      closable={false}
      bodyStyle={{ padding: 0 }}
      width={520}
      className='command-menu-modal'
    >
      <div className='flex flex-col'>
        <div className='border-b px-3 py-2'>
          <input
            className='w-full bg-transparent text-sm outline-none placeholder:text-[var(--semi-color-text-2)]'
            placeholder='Type a command or search...'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            autoFocus
          />
        </div>
        <div className='max-h-72 overflow-y-auto p-1'>
          {filteredOptions.length === 0 ? (
            <div className='py-6 text-center text-sm text-[var(--semi-color-text-2)]'>
              No results found.
            </div>
          ) : (
            Array.from(groupedOptions.entries()).map(([group, items]) => (
              <div key={group}>
                <div className='px-2 py-1.5 text-xs font-semibold text-[var(--semi-color-text-2)]'>
                  {group}
                </div>
                {items.map((item) => (
                  <div
                    key={item.value}
                    className='flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-[var(--semi-color-fill-0)]'
                    onClick={item.onSelect}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
