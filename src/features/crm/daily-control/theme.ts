/**
 * 日控表品牌主题配置
 * 基于 Semi Design 官方配色系统
 */

// Semi Design 品牌主色
export const brandColors = {
  // 基础色
  dark: '#141413',      // 主文本、深色背景
  light: '#faf9f5',     // 浅色背景（温暖米色）
  midGray: '#86909c',   // 次要元素 (Semi grey)
  lightGray: '#e8e6dc', // 微妙背景

  // 强调色 - 仅用于小面积点缀
  orange: '#ff7d00',    // 主强调色 - 诺到 (Semi warning orange)
  blue: '#6a9bcc',      // 次强调色 - 到访
  green: '#00b42a',     // 三级强调色 - 缴费 (Semi success green)
}

// Tab 类型对应的颜色配置 - 简洁版本
export const tabThemes = {
  promised: {
    name: '诺到',
    color: brandColors.orange,
    // Semi warning orange
    dot: 'bg-[#ff7d00]',
    text: 'text-[#ff7d00]',
    textMuted: 'text-[#ff7d00]/70',
    bgSubtle: 'bg-[#ff7d00]/5',
    bgLight: 'bg-[#ff7d00]/10',
    border: 'border-[#ff7d00]/20',
    ring: 'ring-[#ff7d00]/20',
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
    // Semi success green
    dot: 'bg-[#00b42a]',
    text: 'text-[#00b42a]',
    textMuted: 'text-[#00b42a]/70',
    bgSubtle: 'bg-[#00b42a]/5',
    bgLight: 'bg-[#00b42a]/10',
    border: 'border-[#00b42a]/20',
    ring: 'ring-[#00b42a]/20',
  },
  calendar: {
    name: '日历',
    color: brandColors.midGray,
    // Semi grey
    dot: 'bg-[#86909c]',
    text: 'text-[#141413]',
    textMuted: 'text-[#86909c]',
    bgSubtle: 'bg-[#e8e6dc]/30',
    bgLight: 'bg-[#e8e6dc]/50',
    border: 'border-[#e8e6dc]',
    ring: 'ring-[#86909c]/20',
  },
  source: {
    name: '来源渠道',
    color: '#0fc6c2', // 青色
    dot: 'bg-[#0fc6c2]',
    text: 'text-[#0fc6c2]',
    textMuted: 'text-[#0fc6c2]/70',
    bgSubtle: 'bg-[#0fc6c2]/5',
    bgLight: 'bg-[#0fc6c2]/10',
    border: 'border-[#0fc6c2]/20',
    ring: 'ring-[#0fc6c2]/20',
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
