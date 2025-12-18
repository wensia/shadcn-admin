/**
 * 样式工具函数 - 提供 Mira/Lyra 风格的类名映射
 * 使用 useStyleClasses hook 获取当前风格的类名
 */

import { useStyle } from '@/context/style-provider'

/**
 * Mira 和 Lyra 风格的类名映射
 */
export const styleClasses = {
  mira: {
    text: {
      xs: 'text-xs',
      sm: 'text-xs',
      base: 'text-sm',
    },
    height: {
      control: 'h-8',
      controlSm: 'h-7',
      badge: 'h-5',
    },
    gap: {
      tight: 'gap-1.5',
      normal: 'gap-2',
    },
    rounded: 'rounded-sm',
    padding: {
      cell: 'py-1.5 px-2',
    },
  },
  lyra: {
    text: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
    },
    height: {
      control: 'h-9',
      controlSm: 'h-8',
      badge: 'h-6',
    },
    gap: {
      tight: 'gap-2',
      normal: 'gap-3',
    },
    rounded: 'rounded-none',
    padding: {
      cell: 'py-2 px-3',
    },
  },
  maia: {
    text: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
    },
    height: {
      control: 'h-10',
      controlSm: 'h-9',
      badge: 'h-6',
    },
    gap: {
      tight: 'gap-3',
      normal: 'gap-4',
    },
    rounded: 'rounded-lg',
    padding: {
      cell: 'py-2.5 px-3.5',
    },
  },
} as const

export type StyleClasses = typeof styleClasses['mira']

/**
 * Hook: 获取当前风格的类名映射
 * @returns 当前风格的类名对象
 *
 * @example
 * ```tsx
 * const s = useStyleClasses()
 * <Button className={cn(s.height.control, s.text.xs)}>按钮</Button>
 * ```
 */
export function useStyleClasses(): StyleClasses {
  const { style } = useStyle()
  return styleClasses[style]
}
