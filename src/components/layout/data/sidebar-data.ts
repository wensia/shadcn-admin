import {
  Users,
  FileUp,
  Phone,
  Calendar,
  BarChart3,
  Home,
  GraduationCap,
  BookOpen,
  UserCog,
  Wallet,
  TrendingUp,
  Headphones,
  Command,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'RMF CRM',
    email: 'admin@rmf.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'RMF CRM',
      logo: Command,
      plan: 'CRM 系统',
    },
  ],
  navGroups: [
    {
      title: '市场部',
      items: [
        {
          title: '批量导入',
          url: '/crm/batch-import',
          icon: FileUp,
        },
        {
          title: '批次回访池',
          url: '/crm/lead-pools',
          icon: Phone,
        },
        {
          title: '数据统计',
          url: '/crm/data-statistics/marketing',
          icon: BarChart3,
        },
      ],
    },
    {
      title: '咨询部',
      items: [
        {
          title: '线索管理',
          url: '/crm/leads',
          icon: Users,
        },
        {
          title: '公海线索',
          url: '/crm/leads/pool',
          icon: Home,
        },
        {
          title: '连续外呼',
          url: '/crm/continuous-call',
          icon: Headphones,
        },
        {
          title: '到访表',
          url: '/crm/visit-schedule',
          icon: Calendar,
        },
        {
          title: '数据统计',
          url: '/crm/data-statistics/consulting',
          icon: TrendingUp,
        },
      ],
    },
    {
      title: '教管部',
      items: [
        {
          title: '学员管理',
          url: '/crm/students',
          icon: GraduationCap,
        },
        {
          title: '课程安排',
          url: '/crm/courses',
          icon: BookOpen,
        },
      ],
    },
    {
      title: '行政部',
      items: [
        {
          title: '人事管理',
          url: '/crm/hr',
          icon: UserCog,
        },
        {
          title: '财务管理',
          url: '/crm/finance',
          icon: Wallet,
        },
      ],
    },
  ],
}
