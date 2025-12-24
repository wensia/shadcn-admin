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
      buttons: 'gap-0.5',  // 按钮组间距
    },
    rounded: 'rounded-sm',
    padding: {
      cell: 'py-1.5 px-2',
      button: 'px-2',      // 按钮内边距
      ellipsis: 'px-1.5',  // 省略号内边距
    },
    size: {
      icon: 'h-3.5 w-3.5',    // 图标尺寸
      button: 'w-7',           // 按钮尺寸
      buttonMin: 'min-w-7',    // 按钮最小尺寸
      divider: 'h-6',          // 分隔线高度
    },
  },
  lyra: {
    text: {
      xs: 'text-xs',      // 12px - 标准大小
      sm: 'text-sm',      // 14px - 标准大小
      base: 'text-sm',    // 14px - 标准大小
    },
    height: {
      control: 'h-9',
      controlSm: 'h-8',
      badge: 'h-6',
    },
    gap: {
      tight: 'gap-2',
      normal: 'gap-2.5',  // 略宽松
      buttons: 'gap-1',   // 按钮组间距
    },
    rounded: 'rounded-none',  // 无圆角 - 方正锐利
    padding: {
      cell: 'py-2 px-3',
      button: 'px-2.5',
      ellipsis: 'px-2',
    },
    size: {
      icon: 'h-4 w-4',
      button: 'w-8',
      buttonMin: 'min-w-8',
      divider: 'h-7',
    },
  },
  maia: {
    text: {
      xs: 'text-xs',      // 12px - 标准大小
      sm: 'text-sm',      // 14px - 标准大小
      base: 'text-base',  // 16px - 标准大小
    },
    height: {
      control: 'h-9',     // 36px - 舒适高度
      controlSm: 'h-8',   // 32px - 次级控件
      badge: 'h-6',       // 24px - 标签高度
    },
    gap: {
      tight: 'gap-2',     // 8px - 紧凑
      normal: 'gap-3',    // 12px - 宽松间距
      buttons: 'gap-1.5', // 6px - 按钮组间距
    },
    rounded: 'rounded-lg',  // 大圆角 - 柔和圆润
    padding: {
      cell: 'py-2 px-3',
      button: 'px-3',     // 12px - 宽松内边距
      ellipsis: 'px-2',
    },
    size: {
      icon: 'h-4 w-4',
      button: 'w-9',      // 36px - 舒适尺寸
      buttonMin: 'min-w-9',
      divider: 'h-7',
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
