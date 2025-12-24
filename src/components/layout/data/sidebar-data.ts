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
  LayoutDashboard,
  Building2,
  MapPin,
  Map,
  Building,
  Network,
  Briefcase,
  GitBranch,
  UserPlus,
  UsersRound,
  KeyRound,
  Tag,
  School,
  Eye,
  Bot,
  Webhook,
  CloudCog,
  PhoneCall,
  Library,
  FileText,
  ClipboardList,
  Settings,
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
    {
      title: '管理后台',
      items: [
        {
          title: '系统概览',
          url: '/admin/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: '组织架构管理',
          icon: Building2,
          items: [
            {
              title: '大区管理',
              url: '/admin/regions',
              icon: MapPin,
            },
            {
              title: '地区管理',
              url: '/admin/districts',
              icon: Map,
            },
            {
              title: '区域管理',
              url: '/admin/areas',
              icon: Building,
            },
            {
              title: '校区管理',
              url: '/admin/campuses',
              icon: Building2,
            },
            {
              title: '部门管理',
              url: '/admin/departments',
              icon: Network,
            },
            {
              title: '校区部门配置',
              url: '/admin/campus-departments',
              icon: GitBranch,
            },
            {
              title: '职位管理',
              url: '/admin/positions',
              icon: Briefcase,
            },
            {
              title: '组织架构树',
              url: '/admin/organization-tree',
              icon: Network,
            },
          ],
        },
        {
          title: '人事管理',
          icon: UsersRound,
          items: [
            {
              title: '员工管理',
              url: '/admin/employees',
              icon: UserPlus,
            },
            {
              title: '管理层级',
              url: '/admin/employee-hierarchy',
              icon: GitBranch,
            },
            {
              title: '员工身份管理',
              url: '/admin/identities',
              icon: UsersRound,
            },
            {
              title: 'API密钥管理',
              url: '/admin/api-keys',
              icon: KeyRound,
            },
          ],
        },
        {
          title: '业务配置',
          icon: Settings,
          items: [
            {
              title: '来源渠道管理',
              url: '/admin/source-channels',
              icon: Tag,
            },
            {
              title: '学校管理',
              url: '/admin/schools',
              icon: School,
            },
            {
              title: '线索查看统计',
              url: '/admin/lead-access-stats',
              icon: Eye,
            },
            {
              title: '钉钉机器人管理',
              url: '/admin/dingtalk-robots',
              icon: Bot,
            },
            {
              title: 'Webhook钩子',
              url: '/admin/webhook-hooks',
              icon: Webhook,
            },
            {
              title: '云客账号管理',
              url: '/admin/yunke-accounts',
              icon: CloudCog,
            },
            {
              title: '连续外呼配置',
              url: '/admin/call-config',
              icon: PhoneCall,
            },
            {
              title: '课程配置',
              url: '/admin/courses',
              icon: Library,
            },
            {
              title: '临时DISC记录',
              url: '/admin/temp-disc-records',
              icon: FileText,
            },
            {
              title: 'DISC性格测试',
              url: '/admin/disc-test',
              icon: ClipboardList,
            },
          ],
        },
      ],
    },
  ],
}
