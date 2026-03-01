/**
 * 样式工具函数 - Lyra 风格类名映射
 * 使用 useStyleClasses hook 获取类名
 */

/**
 * Lyra 风格的类名映射
 */
export const styleClasses = {
  text: {
    xs: 'text-xs',      // 12px
    sm: 'text-sm',      // 14px
    base: 'text-sm',    // 14px
  },
  height: {
    control: 'h-9',     // 36px - 标准控件高度
    controlSm: 'h-8',   // 32px - 紧凑控件高度
    badge: 'h-6',       // 24px - 标签高度
  },
  gap: {
    tight: 'gap-2',     // 8px - 紧密间距
    normal: 'gap-2.5',  // 10px - 正常间距
    buttons: 'gap-1',   // 4px - 按钮组间距
  },
  rounded: 'rounded-md',  // 中等圆角 - 与当前设计系统一致
  roundedBadge: 'rounded-full',  // 药丸形状 - Anthropic 品牌风格状态标签
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
} as const

export type StyleClasses = typeof styleClasses

/**
 * Hook: 获取 Lyra 风格的类名映射
 * @returns 类名对象
 *
 * @example
 * ```tsx
 * const s = useStyleClasses()
 * <Button className={cn(s.height.control, s.text.xs)}>按钮</Button>
 * ```
 */
export function useStyleClasses(): StyleClasses {
  return styleClasses
}
