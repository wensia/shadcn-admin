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
