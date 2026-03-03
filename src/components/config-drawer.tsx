import { type ReactElement, type SVGProps } from 'react'
import { Check, CircleCheck, RotateCcw, Settings } from 'lucide-react'
import { SideSheet, Button as SemiButton, Radio, RadioGroup } from '@douyinfe/semi-ui-19'
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
  isTheme = false,
}: {
  item: {
    value: string
    label: string
    icon: (props: SVGProps<SVGSVGElement>) => ReactElement
  }
  selected: boolean
  isTheme?: boolean
}) {
  return (
    <label
      className={cn(
        'block cursor-pointer text-left',
        'transition duration-200 ease-in'
      )}
      aria-label={`Select ${item.label.toLowerCase()}`}
      aria-describedby={`${item.value}-description`}
    >
      <Radio value={item.value} style={{ display: 'none' }} />
      <div
        className={cn(
          'relative rounded-[6px] ring-[1px] ring-border',
          selected && 'shadow-2xl ring-primary'
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
    </label>
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
      <RadioGroup
        value={theme}
        onChange={(event) => setTheme(event.target.value as typeof theme)}
        aria-label='Select theme preference'
        aria-describedby='theme-description'
      >
        <div className='grid w-full max-w-md grid-cols-3 gap-4'>
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
              isTheme
            />
          ))}
        </div>
      </RadioGroup>
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
      <RadioGroup
        value={accentColor}
        onChange={(event) => setAccentColor(event.target.value as AccentColor)}
        aria-label='Select accent color'
      >
        <div className='grid grid-cols-6 gap-2'>
          {ACCENT_COLORS.map((colorOption) => (
            <label
              key={colorOption.value}
              className='block cursor-pointer'
              aria-label={colorOption.label}
            >
              <Radio value={colorOption.value} style={{ display: 'none' }} />
              <div
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-full transition-all',
                  'hover:scale-110',
                  accentColor === colorOption.value && 'ring-2 ring-offset-2 ring-primary'
                )}
                style={{ backgroundColor: colorOption.color }}
                title={'description' in colorOption ? colorOption.description : colorOption.label}
              >
                {accentColor === colorOption.value && (
                  <Check className='h-4 w-4 text-white drop-shadow-md' />
                )}
              </div>
            </label>
          ))}
        </div>
      </RadioGroup>
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
      <RadioGroup
        value={variant}
        onChange={(event) => setVariant(event.target.value as typeof variant)}
        aria-label='Select sidebar style'
        aria-describedby='sidebar-description'
      >
        <div className='grid w-full max-w-md grid-cols-3 gap-4'>
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
            />
          ))}
        </div>
      </RadioGroup>
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
      <RadioGroup
        value={radioState}
        onChange={(event) => {
          const value = event.target.value
          if (value === 'default') {
            setOpen(true)
            return
          }
          setOpen(false)
          setCollapsible(value as Collapsible)
        }}
        aria-label='Select layout style'
        aria-describedby='layout-description'
      >
        <div className='grid w-full max-w-md grid-cols-3 gap-4'>
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
            />
          ))}
        </div>
      </RadioGroup>
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
      <RadioGroup
        value={dir}
        onChange={(event) => setDir(event.target.value as typeof dir)}
        aria-label='Select site direction'
        aria-describedby='direction-description'
      >
        <div className='grid w-full max-w-md grid-cols-2 gap-4'>
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
            />
          ))}
        </div>
      </RadioGroup>
      <div id='direction-description' className='sr-only'>
        Choose between left-to-right or right-to-left site direction
      </div>
    </div>
  )
}
