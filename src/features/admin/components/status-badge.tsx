/**
 * Admin 状态标签组件
 * 使用柔和的颜色风格，更加美观
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Check, X, CircleDot } from 'lucide-react'

interface StatusBadgeProps {
  isActive: boolean
  className?: string
  showIcon?: boolean
}

// 启用/停用状态标签 - 使用柔和的绿色和灰色
export function StatusBadge({ isActive, className, showIcon = true }: StatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'status-emerald' : 'status-slate'}
      className={cn(
        'gap-1.5 px-2.5 py-1 text-xs font-medium',
        className
      )}
    >
      {showIcon && (
        isActive ? (
          <CircleDot className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )
      )}
      {isActive ? '启用' : '停用'}
    </Badge>
  )
}

// 员工状态标签 - 在职/离职
export function EmployeeStatusBadge({ isActive, className, showIcon = true }: StatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'status-green' : 'status-amber'}
      className={cn(
        'gap-1.5 px-2.5 py-1 text-xs font-medium',
        className
      )}
    >
      {showIcon && (
        isActive ? (
          <Check className="h-3 w-3" />
        ) : (
          <X className="h-3 w-3" />
        )
      )}
      {isActive ? '在职' : '离职'}
    </Badge>
  )
}

// 来源渠道分类标签 - 使用不同颜色区分
const categoryStyles = {
  ONLINE: { variant: 'status-blue' as const, label: '线上渠道' },
  OFFLINE: { variant: 'status-purple' as const, label: '线下渠道' },
  REFERRAL: { variant: 'status-emerald' as const, label: '推荐渠道' },
  EVENT: { variant: 'status-amber' as const, label: '活动渠道' },
  OTHER: { variant: 'status-slate' as const, label: '其他渠道' },
}

interface CategoryBadgeProps {
  category: string
  className?: string
}

export function SourceChannelCategoryBadge({ category, className }: CategoryBadgeProps) {
  const style = categoryStyles[category as keyof typeof categoryStyles] || categoryStyles.OTHER
  return (
    <Badge
      variant={style.variant}
      className={cn('px-2.5 py-1 text-xs font-medium', className)}
    >
      {style.label}
    </Badge>
  )
}

// 职位级别标签 - 使用渐进色彩表示层级
const levelStyles = {
  1: { variant: 'status-slate' as const, label: '普通员工' },
  2: { variant: 'status-blue' as const, label: '主管' },
  3: { variant: 'status-cyan' as const, label: '经理' },
  4: { variant: 'status-purple' as const, label: '总监' },
  5: { variant: 'status-amber' as const, label: '高管' },
}

interface PositionLevelBadgeProps {
  level: number
  className?: string
}

export function PositionLevelBadge({ level, className }: PositionLevelBadgeProps) {
  const style = levelStyles[level as keyof typeof levelStyles] || levelStyles[1]
  return (
    <Badge
      variant={style.variant}
      className={cn('px-2.5 py-1 text-xs font-medium', className)}
    >
      {style.label}
    </Badge>
  )
}

// 超级管理员标签 - 使用醒目的红色
export function SuperuserBadge({
  isSuperuser,
  className
}: {
  isSuperuser: boolean
  className?: string
}) {
  if (!isSuperuser) return null
  return (
    <Badge
      variant="status-red"
      className={cn('px-2.5 py-1 text-xs font-medium', className)}
    >
      超级管理员
    </Badge>
  )
}

// ============================================================================
// 职位名称标签 - 使用 Anthropic 品牌色，与状态tag风格一致
// Anthropic Brand Colors:
// - Dark: #141413, Light: #faf9f5
// - Mid Gray: #b0aea5, Light Gray: #e8e6dc
// - Orange: #d97757, Blue: #6a9bcc, Green: #788c5d
// ============================================================================

type PositionVariant = 'position-staff' | 'position-supervisor' | 'position-manager' | 'position-director' | 'position-executive'

/**
 * 职位关键词到 Badge variant 的映射
 * 按优先级排序（高级别优先匹配）
 */
const positionKeywordVariants: Array<{ keywords: string[]; variant: PositionVariant }> = [
  // Level 5-6 - 高管级
  { keywords: ['总裁', '副总裁', '总经理', 'CEO', 'COO', 'CFO'], variant: 'position-executive' },
  // Level 4 - 总监级
  { keywords: ['总监', '副总监'], variant: 'position-director' },
  // Level 3 - 经理级
  { keywords: ['经理', '副经理'], variant: 'position-manager' },
  // Level 2 - 主管级
  { keywords: ['主管', '组长'], variant: 'position-supervisor' },
  // Level 1 - 专员级
  { keywords: ['专员', '助理', '顾问'], variant: 'position-staff' },
]

/**
 * 根据职位名称获取 Badge variant
 * 支持模糊匹配
 */
function getPositionVariant(positionName: string): PositionVariant {
  for (const { keywords, variant } of positionKeywordVariants) {
    for (const keyword of keywords) {
      if (positionName.includes(keyword)) {
        return variant
      }
    }
  }
  // 默认使用专员级样式
  return 'position-staff'
}

interface PositionNameBadgeProps {
  positionName: string
  className?: string
}

/**
 * 职位名称标签组件 - 使用 Badge 组件，与状态tag风格一致
 */
export function PositionNameBadge({ positionName, className }: PositionNameBadgeProps) {
  const variant = getPositionVariant(positionName)

  return (
    <Badge
      variant={variant}
      className={cn('px-2.5 py-1 text-xs font-medium', className)}
    >
      {positionName}
    </Badge>
  )
}
