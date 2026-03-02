/**
 * StyledDropdown - Shared styled dropdown components
 *
 * Pre-styled Base UI menu wrappers matching the app's vibrancy style:
 * - popover-styled background with blur
 * - Consistent item spacing and subtle hover states (foreground/[0.03])
 * - Icon sizing standardization (3.5 x 3.5)
 *
 * Wraps @base-ui/react/menu primitives with the full class set
 * so consumers get the correct look without extra styling.
 */

import * as React from 'react'
import { Menu } from '@base-ui/react/menu'
import { cn } from '../utils'

// Re-export raw primitives that need no styling
const DropdownMenu = Menu.Root
const DropdownMenuSub = Menu.SubmenuRoot

// Trigger with asChild adapter
const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Menu.Trigger> & {
    asChild?: boolean
    children?: React.ReactNode
  }
>(({ asChild, children, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return <Menu.Trigger ref={ref} {...props} render={children} />
  }
  return (
    <Menu.Trigger ref={ref} {...props}>
      {children}
    </Menu.Trigger>
  )
})
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuSub }

// -- Content ------------------------------------------------------------------

interface StyledDropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<'div'> {
  minWidth?: string
  /** Force light mode instead of dark */
  light?: boolean
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export const StyledDropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  StyledDropdownMenuContentProps
>(({ className, minWidth = 'min-w-40', light = false, sideOffset = 4, align, side, style, ...props }, ref) => (
  <Menu.Portal>
    <Menu.Positioner sideOffset={sideOffset} align={align} side={side}>
      <Menu.Popup
        ref={ref}
        className={cn(
          // base layer
          'popover-styled overflow-x-hidden overflow-y-auto p-1 z-dropdown',
          // styled additions
          'w-fit font-sans whitespace-nowrap text-xs flex flex-col gap-0.5',
          minWidth,
          className,
        )}
        style={style}
        {...props}
      />
    </Menu.Positioner>
  </Menu.Portal>
))
StyledDropdownMenuContent.displayName = 'StyledDropdownMenuContent'

// -- Item ---------------------------------------------------------------------

interface StyledDropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof Menu.Item> {
  variant?: 'default' | 'destructive'
  onSelect?: () => void
}

export const StyledDropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  StyledDropdownMenuItemProps
>(({ className, variant = 'default', onSelect, ...props }, ref) => (
  <Menu.Item
    ref={ref}
    onClick={onSelect}
    className={cn(
      // base layer
      'relative flex cursor-default items-center gap-2 px-2 py-1.5 text-sm outline-hidden select-none',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
      // styled additions
      'pr-4 rounded-[4px] hover:bg-foreground/[0.03] focus:bg-foreground/[0.03]',
      '[&_svg]:size-auto [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0',
      variant === 'destructive' && 'text-destructive focus:text-destructive hover:text-destructive [&_svg]:!text-destructive',
      className,
    )}
    {...props}
  />
))
StyledDropdownMenuItem.displayName = 'StyledDropdownMenuItem'

// -- Separator ----------------------------------------------------------------

export const StyledDropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Menu.Separator>
>(({ className, ...props }, ref) => (
  <Menu.Separator
    ref={ref}
    className={cn('bg-foreground/10 -mx-1 my-1 h-px', className)}
    {...props}
  />
))
StyledDropdownMenuSeparator.displayName = 'StyledDropdownMenuSeparator'

// -- Sub-menu trigger ---------------------------------------------------------

export const StyledDropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof Menu.SubmenuTrigger>
>(({ className, ...props }, ref) => (
  <Menu.SubmenuTrigger
    ref={ref}
    className={cn(
      'relative flex cursor-default items-center gap-2 px-2 py-1.5 text-sm outline-hidden select-none',
      '[&_svg]:pointer-events-none [&_svg]:shrink-0',
      'pr-1.5 rounded-[4px] hover:bg-foreground/10 focus:bg-foreground/10',
      '[&_svg]:size-auto [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0',
      className,
    )}
    {...props}
  />
))
StyledDropdownMenuSubTrigger.displayName = 'StyledDropdownMenuSubTrigger'

// -- Sub-menu content ---------------------------------------------------------

interface StyledDropdownMenuSubContentProps
  extends React.ComponentPropsWithoutRef<'div'> {
  minWidth?: string
  sideOffset?: number
}

export const StyledDropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  StyledDropdownMenuSubContentProps
>(({ className, minWidth = 'min-w-36', sideOffset = -4, ...props }, ref) => (
  <Menu.Portal>
    <Menu.Positioner sideOffset={sideOffset}>
      <Menu.Popup
        ref={ref}
        className={cn(
          'popover-styled w-fit font-sans whitespace-nowrap text-xs flex flex-col gap-0.5 z-dropdown overflow-hidden p-1',
          minWidth,
          className,
        )}
        {...props}
      />
    </Menu.Positioner>
  </Menu.Portal>
))
StyledDropdownMenuSubContent.displayName = 'StyledDropdownMenuSubContent'

// -- Shortcut -----------------------------------------------------------------

export function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
      {...props}
    />
  )
}
