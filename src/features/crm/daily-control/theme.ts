/**
 * 日控表品牌主题配置
 * 基于 Anthropic 品牌色彩系统 - 简洁克制风格
 */

// Anthropic 品牌主色
export const brandColors = {
  // 基础色
  dark: '#141413',      // 主文本、深色背景
  light: '#faf9f5',     // 浅色背景（温暖米色）
  midGray: '#b0aea5',   // 次要元素
  lightGray: '#e8e6dc', // 微妙背景

  // 强调色 - 仅用于小面积点缀
  orange: '#d97757',    // 主强调色 - 诺到
  blue: '#6a9bcc',      // 次强调色 - 到访
  green: '#788c5d',     // 三级强调色 - 缴费
}

// Tab 类型对应的颜色配置 - 简洁版本
export const tabThemes = {
  promised: {
    name: '诺到',
    color: brandColors.orange,
    // 使用品牌橙色，但更加克制
    dot: 'bg-[#d97757]',
    text: 'text-[#d97757]',
    textMuted: 'text-[#d97757]/70',
    bgSubtle: 'bg-[#d97757]/5',
    bgLight: 'bg-[#d97757]/10',
    border: 'border-[#d97757]/20',
    ring: 'ring-[#d97757]/20',
  },
  visited: {
    name: '到访',
    color: brandColors.blue,
    // 使用品牌蓝色
    dot: 'bg-[#6a9bcc]',
    text: 'text-[#6a9bcc]',
    textMuted: 'text-[#6a9bcc]/70',
    bgSubtle: 'bg-[#6a9bcc]/5',
    bgLight: 'bg-[#6a9bcc]/10',
    border: 'border-[#6a9bcc]/20',
    ring: 'ring-[#6a9bcc]/20',
  },
  payment: {
    name: '缴费',
    color: brandColors.green,
    // 使用品牌绿色
    dot: 'bg-[#788c5d]',
    text: 'text-[#788c5d]',
    textMuted: 'text-[#788c5d]/70',
    bgSubtle: 'bg-[#788c5d]/5',
    bgLight: 'bg-[#788c5d]/10',
    border: 'border-[#788c5d]/20',
    ring: 'ring-[#788c5d]/20',
  },
  calendar: {
    name: '日历',
    color: brandColors.midGray,
    // 使用中性灰色
    dot: 'bg-[#b0aea5]',
    text: 'text-[#141413]',
    textMuted: 'text-[#b0aea5]',
    bgSubtle: 'bg-[#e8e6dc]/30',
    bgLight: 'bg-[#e8e6dc]/50',
    border: 'border-[#e8e6dc]',
    ring: 'ring-[#b0aea5]/20',
  },
  report: {
    name: '报表',
    color: '#7c3aed', // 紫色
    dot: 'bg-[#7c3aed]',
    text: 'text-[#7c3aed]',
    textMuted: 'text-[#7c3aed]/70',
    bgSubtle: 'bg-[#7c3aed]/5',
    bgLight: 'bg-[#7c3aed]/10',
    border: 'border-[#7c3aed]/20',
    ring: 'ring-[#7c3aed]/20',
  },
} as const

export type TabType = keyof typeof tabThemes
