/**
 * Admin 状态标签组件
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  isActive: boolean
  className?: string
  showDot?: boolean
}

export function StatusBadge({ isActive, className, showDot = true }: StatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'success' : 'secondary'}
      className={cn('font-normal', className)}
    >
      {showDot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            isActive ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
      {isActive ? '启用' : '停用'}
    </Badge>
  )
}

// 员工状态标签
export function EmployeeStatusBadge({ isActive, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'success' : 'warning'}
      className={cn('font-normal', className)}
    >
      {isActive ? '在职' : '离职'}
    </Badge>
  )
}

// 来源渠道分类标签
const categoryStyles = {
  ONLINE: { variant: 'default' as const, label: '线上渠道' },
  OFFLINE: { variant: 'secondary' as const, label: '线下渠道' },
  REFERRAL: { variant: 'success' as const, label: '推荐渠道' },
  EVENT: { variant: 'destructive' as const, label: '活动渠道' },
  OTHER: { variant: 'outline' as const, label: '其他渠道' },
}

interface CategoryBadgeProps {
  category: string
  className?: string
}

export function SourceChannelCategoryBadge({ category, className }: CategoryBadgeProps) {
  const style = categoryStyles[category as keyof typeof categoryStyles] || categoryStyles.OTHER
  return (
    <Badge variant={style.variant} className={cn('font-normal', className)}>
      {style.label}
    </Badge>
  )
}

// 职位级别标签
const levelStyles = {
  1: { variant: 'default' as const, label: '普通员工' },
  2: { variant: 'secondary' as const, label: '主管' },
  3: { variant: 'success' as const, label: '经理' },
  4: { variant: 'destructive' as const, label: '总监' },
  5: { variant: 'outline' as const, label: '高管' },
}

interface PositionLevelBadgeProps {
  level: number
  className?: string
}

export function PositionLevelBadge({ level, className }: PositionLevelBadgeProps) {
  const style = levelStyles[level as keyof typeof levelStyles] || levelStyles[1]
  return (
    <Badge variant={style.variant} className={cn('font-normal', className)}>
      {style.label}
    </Badge>
  )
}

// 超级管理员标签
export function SuperuserBadge({ isSuperuser, className }: { isSuperuser: boolean; className?: string }) {
  if (!isSuperuser) return null
  return (
    <Badge variant="destructive" className={cn('font-normal', className)}>
      超级管理员
    </Badge>
  )
}
