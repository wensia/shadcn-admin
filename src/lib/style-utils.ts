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
      control: 'h-8',     // 32px - 与导出按钮一致
      controlSm: 'h-7',   // 28px - 次级控件
      badge: 'h-5',       // 20px - 标签高度
    },
    gap: {
      tight: 'gap-3',     // 12px - 紧凑舒适
      normal: 'gap-4',    // 16px - 适度呼吸感
      buttons: 'gap-1.5', // 按钮组间距 - 6px
    },
    rounded: 'rounded-lg', // 保持大圆角，保留 maia 友好特征
    padding: {
      cell: 'py-2 px-3',  // 8px/12px - 紧凑的单元格内边距
      button: 'px-2.5',   // 按钮内边距 - 10px
      ellipsis: 'px-1.5', // 省略号内边距 - 6px
    },
    size: {
      icon: 'h-4 w-4',       // 图标尺寸 - 16px
      button: 'w-8',         // 按钮尺寸 - 32px
      buttonMin: 'min-w-8',  // 按钮最小尺寸 - 32px
      divider: 'h-6',        // 分隔线高度 - 24px
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
