import {
  TrendingUp,
  CalendarCheck,
  PhoneMissed,
  Clock,
  PhoneOff,
  UserX,
  Ban,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'

const BRAND_COLORS = {
  green: '#00b42a',
  orange: '#ff7d00',
  blue: '#0077fa',
} as const

export interface FollowupResultOption {
  value: string
  label: string
  icon: LucideIcon
  color: string
}

export const followupResultOptions: FollowupResultOption[] = [
  { value: 'can_continue', label: '可持续跟进', icon: TrendingUp, color: BRAND_COLORS.green },
  { value: 'appointment_scheduled', label: '已预约到访', icon: CalendarCheck, color: BRAND_COLORS.green },
  { value: 'not_connected', label: '未接通', icon: PhoneMissed, color: BRAND_COLORS.blue },
  { value: 'temporarily_unavailable', label: '暂时不便', icon: Clock, color: BRAND_COLORS.blue },
  { value: 'wrong_number', label: '空错号', icon: PhoneOff, color: BRAND_COLORS.orange },
  { value: 'no_child', label: '没孩子', icon: UserX, color: BRAND_COLORS.orange },
  { value: 'age_mismatch', label: '年龄不符', icon: Clock, color: BRAND_COLORS.orange },
  { value: 'no_need', label: '不需要', icon: Ban, color: BRAND_COLORS.orange },
  { value: 'hung_up', label: '秒挂', icon: PhoneMissed, color: BRAND_COLORS.orange },
  { value: 'student', label: '学员', icon: GraduationCap, color: BRAND_COLORS.orange },
]
