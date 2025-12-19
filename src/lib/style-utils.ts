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
      buttons: 'gap-1',    // 按钮组间距
    },
    rounded: 'rounded-none',
    padding: {
      cell: 'py-2 px-3',
      button: 'px-2.5',    // 按钮内边距
      ellipsis: 'px-2',    // 省略号内边距
    },
    size: {
      icon: 'h-4 w-4',       // 图标尺寸
      button: 'w-8',         // 按钮尺寸
      buttonMin: 'min-w-8',  // 按钮最小尺寸
      divider: 'h-7',        // 分隔线高度
    },
  },
  maia: {
    text: {
      xs: 'text-sm',      // 14px - 友好可读
      sm: 'text-base',    // 16px - 舒适阅读
      base: 'text-lg',    // 18px - 温暖友好
      lg: 'text-xl',      // 20px - 醒目标题
    },
    height: {
      control: 'h-11',    // 44px - 移动端友好触摸目标
      controlSm: 'h-10',  // 40px - 次级控件
      badge: 'h-6',       // 24px - 标签高度（调整为更合适的大小）
    },
    gap: {
      tight: 'gap-4',     // 16px - 宽松舒适
      normal: 'gap-6',    // 24px - 呼吸感
      buttons: 'gap-2',   // 按钮组间距 - 8px
    },
    rounded: 'rounded-lg',
    padding: {
      cell: 'py-3 px-4',  // 12px/16px - 宽松的单元格内边距
      button: 'px-3',     // 按钮内边距 - 12px
      ellipsis: 'px-2',   // 省略号内边距 - 8px
    },
    size: {
      icon: 'h-5 w-5',       // 图标尺寸 - 20px (更大更友好)
      button: 'w-10',        // 按钮尺寸 - 40px (触摸友好)
      buttonMin: 'min-w-10', // 按钮最小尺寸 - 40px
      divider: 'h-8',        // 分隔线高度 - 32px
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
