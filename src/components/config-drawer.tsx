import { type SVGProps } from 'react'
import { Check, CircleCheck, RotateCcw, Settings } from 'lucide-react'
import { SideSheet, Button as SemiButton } from '@douyinfe/semi-ui-19'
import { IconDir } from '@/assets/custom/icon-dir'
import { IconLayoutCompact } from '@/assets/custom/icon-layout-compact'
import { IconLayoutDefault } from '@/assets/custom/icon-layout-default'
import { IconLayoutFull } from '@/assets/custom/icon-layout-full'
import { IconSidebarFloating } from '@/assets/custom/icon-sidebar-floating'
import { IconSidebarInset } from '@/assets/custom/icon-sidebar-inset'
import { IconSidebarSidebar } from '@/assets/custom/icon-sidebar-sidebar'
import { IconThemeDark } from '@/assets/custom/icon-theme-dark'
import { IconThemeLight } from '@/assets/custom/icon-theme-light'
import { IconThemeSystem } from '@/assets/custom/icon-theme-system'
import { cn } from '@/lib/utils'
import { useDirection } from '@/context/direction-provider'
import { type Collapsible, useLayout } from '@/context/layout-provider'
import { useTheme } from '@/context/theme-provider'
import { useAccentColor, ACCENT_COLORS, type AccentColor } from '@/context/accent-color-provider'
import { useSidebar } from '@/context/sidebar-context'

interface ConfigDrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function ConfigDrawer({ open, onOpenChange, showTrigger = true }: ConfigDrawerProps) {
  const { setOpen } = useSidebar()
  const { resetDir } = useDirection()
  const { resetTheme } = useTheme()
  const { resetLayout } = useLayout()
  const { resetAccentColor } = useAccentColor()

  const handleReset = () => {
    setOpen(true)
    resetDir()
    resetTheme()
    resetLayout()
    resetAccentColor()
  }

  return (
    <>
      {showTrigger && (
        <SemiButton
          theme='borderless'
          icon={<Settings className='size-4' />}
          className='!rounded-full'
          aria-label='Open theme settings'
          onClick={() => onOpenChange?.(true)}
        />
      )}
      <SideSheet
        visible={!!open}
        onCancel={() => onOpenChange?.(false)}
        title='Theme Settings'
        placement='right'
        width={340}
        footer={
          <div className='flex justify-end'>
            <SemiButton
              type='danger'
              onClick={handleReset}
              aria-label='Reset all settings to default values'
            >
              Reset
            </SemiButton>
          </div>
        }
      >
        <p className='text-sm text-[var(--semi-color-text-2)] mb-4'>
          Adjust the appearance and layout to suit your preferences.
        </p>
        <div className='space-y-6'>
          <ThemeConfig />
          <AccentColorConfig />
          <SidebarConfig />
          <LayoutConfig />
          <DirConfig />
        </div>
      </SideSheet>
    </>
  )
}

function SectionTitle({
  title,
  showReset = false,
  onReset,
  className,
}: {
  title: string
  showReset?: boolean
  onReset?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--semi-color-text-2)]',
        className
      )}
    >
      {title}
      {showReset && onReset && (
        <SemiButton
          theme='light'
          size='small'
          icon={<RotateCcw className='size-3' />}
          className='!size-4 !rounded-full'
          onClick={onReset}
        />
      )}
    </div>
  )
}

function RadioGroupItem({
  item,
  selected,
  onSelect,
  isTheme = false,
}: {
  item: {
    value: string
    label: string
    icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement
  }
  selected: boolean
  onSelect: (value: string) => void
  isTheme?: boolean
}) {
  return (
    <button
      type='button'
      onClick={() => onSelect(item.value)}
      className={cn(
        'group border-0 bg-transparent p-0 text-left outline-none',
        'transition duration-200 ease-in'
      )}
      aria-label={`Select ${item.label.toLowerCase()}`}
      aria-describedby={`${item.value}-description`}
      role='radio'
      aria-checked={selected}
    >
      <div
        className={cn(
          'relative rounded-[6px] ring-[1px] ring-border',
          selected && 'shadow-2xl ring-primary',
          'group-focus-visible:ring-2'
        )}
        role='img'
        aria-hidden='false'
        aria-label={`${item.label} option preview`}
      >
        <CircleCheck
          className={cn(
            'size-6 fill-primary stroke-white',
            !selected && 'hidden',
            'absolute top-0 right-0 translate-x-1/2 -translate-y-1/2'
          )}
          aria-hidden='true'
        />
        <item.icon
          className={cn(
            !isTheme && (selected
              ? 'fill-primary stroke-primary'
              : 'fill-muted-foreground stroke-muted-foreground')
          )}
          aria-hidden='true'
        />
      </div>
      <div
        className='mt-1 text-xs'
        id={`${item.value}-description`}
        aria-live='polite'
      >
        {item.label}
      </div>
    </button>
  )
}

function ThemeConfig() {
  const { defaultTheme, theme, setTheme } = useTheme()
  return (
    <div>
      <SectionTitle
        title='Theme'
        showReset={theme !== defaultTheme}
        onReset={() => setTheme(defaultTheme)}
      />
      <div
        className='grid w-full max-w-md grid-cols-3 gap-4'
        role='radiogroup'
        aria-label='Select theme preference'
        aria-describedby='theme-description'
      >
        {[
          {
            value: 'system',
            label: 'System',
            icon: IconThemeSystem,
          },
          {
            value: 'light',
            label: 'Light',
            icon: IconThemeLight,
          },
          {
            value: 'dark',
            label: 'Dark',
            icon: IconThemeDark,
          },
        ].map((item) => (
          <RadioGroupItem
            key={item.value}
            item={item}
            selected={theme === item.value}
            onSelect={(value) => setTheme(value as typeof theme)}
            isTheme
          />
        ))}
      </div>
      <div id='theme-description' className='sr-only'>
        Choose between system preference, light mode, or dark mode
      </div>
    </div>
  )
}

function AccentColorConfig() {
  const { defaultAccentColor, accentColor, setAccentColor } = useAccentColor()
  const currentColor = ACCENT_COLORS.find(c => c.value === accentColor)
  const currentDescription = currentColor && 'description' in currentColor
    ? currentColor.description
    : undefined
  return (
    <div>
      <SectionTitle
        title='Accent Color'
        showReset={accentColor !== defaultAccentColor}
        onReset={() => setAccentColor(defaultAccentColor)}
      />
      <div
        className='grid grid-cols-6 gap-2'
        role='radiogroup'
        aria-label='Select accent color'
      >
        {ACCENT_COLORS.map((colorOption) => (
          <button
            key={colorOption.value}
            type='button'
            onClick={() => setAccentColor(colorOption.value as AccentColor)}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-full transition-all',
              'hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              accentColor === colorOption.value && 'ring-2 ring-offset-2 ring-primary'
            )}
            style={{ backgroundColor: colorOption.color }}
            aria-label={colorOption.label}
            aria-pressed={accentColor === colorOption.value}
            title={'description' in colorOption ? colorOption.description : colorOption.label}
          >
            {accentColor === colorOption.value && (
              <Check className='h-4 w-4 text-white drop-shadow-md' />
            )}
          </button>
        ))}
      </div>
      <div className='mt-2 text-xs text-[var(--semi-color-text-2)]'>
        {currentColor?.label}
        {currentDescription && (
          <span className='ml-1 opacity-70'>
            - {currentDescription}
          </span>
        )}
      </div>
    </div>
  )
}

function SidebarConfig() {
  const { defaultVariant, variant, setVariant } = useLayout()
  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title='Sidebar'
        showReset={defaultVariant !== variant}
        onReset={() => setVariant(defaultVariant)}
      />
      <div
        className='grid w-full max-w-md grid-cols-3 gap-4'
        role='radiogroup'
        aria-label='Select sidebar style'
        aria-describedby='sidebar-description'
      >
        {[
          {
            value: 'inset',
            label: 'Inset',
            icon: IconSidebarInset,
          },
          {
            value: 'floating',
            label: 'Floating',
            icon: IconSidebarFloating,
          },
          {
            value: 'sidebar',
            label: 'Sidebar',
            icon: IconSidebarSidebar,
          },
        ].map((item) => (
          <RadioGroupItem
            key={item.value}
            item={item}
            selected={variant === item.value}
            onSelect={(value) => setVariant(value as typeof variant)}
          />
        ))}
      </div>
      <div id='sidebar-description' className='sr-only'>
        Choose between inset, floating, or standard sidebar layout
      </div>
    </div>
  )
}

function LayoutConfig() {
  const { open, setOpen } = useSidebar()
  const { defaultCollapsible, collapsible, setCollapsible } = useLayout()

  const radioState = open ? 'default' : collapsible

  return (
    <div className='max-md:hidden'>
      <SectionTitle
        title='Layout'
        showReset={radioState !== 'default'}
        onReset={() => {
          setOpen(true)
          setCollapsible(defaultCollapsible)
        }}
      />
      <div
        className='grid w-full max-w-md grid-cols-3 gap-4'
        role='radiogroup'
        aria-label='Select layout style'
        aria-describedby='layout-description'
      >
        {[
          {
            value: 'default',
            label: 'Default',
            icon: IconLayoutDefault,
          },
          {
            value: 'icon',
            label: 'Compact',
            icon: IconLayoutCompact,
          },
          {
            value: 'offcanvas',
            label: 'Full layout',
            icon: IconLayoutFull,
          },
        ].map((item) => (
          <RadioGroupItem
            key={item.value}
            item={item}
            selected={radioState === item.value}
            onSelect={(value) => {
              if (value === 'default') {
                setOpen(true)
                return
              }
              setOpen(false)
              setCollapsible(value as Collapsible)
            }}
          />
        ))}
      </div>
      <div id='layout-description' className='sr-only'>
        Choose between default expanded, compact icon-only, or full layout mode
      </div>
    </div>
  )
}

function DirConfig() {
  const { defaultDir, dir, setDir } = useDirection()
  return (
    <div>
      <SectionTitle
        title='Direction'
        showReset={defaultDir !== dir}
        onReset={() => setDir(defaultDir)}
      />
      <div
        className='grid w-full max-w-md grid-cols-2 gap-4'
        role='radiogroup'
        aria-label='Select site direction'
        aria-describedby='direction-description'
      >
        {[
          {
            value: 'ltr',
            label: 'Left to Right',
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir='ltr' {...props} />
            ),
          },
          {
            value: 'rtl',
            label: 'Right to Left',
            icon: (props: SVGProps<SVGSVGElement>) => (
              <IconDir dir='rtl' {...props} />
            ),
          },
        ].map((item) => (
          <RadioGroupItem
            key={item.value}
            item={item}
            selected={dir === item.value}
            onSelect={(value) => setDir(value as typeof dir)}
          />
        ))}
      </div>
      <div id='direction-description' className='sr-only'>
        Choose between left-to-right or right-to-left site direction
      </div>
    </div>
  )
}
