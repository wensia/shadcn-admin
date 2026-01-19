import {
  Users,
  FileUp,
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
  ArrowLeft,
  Shield,
  ShoppingCart,
  Cloud,
  UserCheck,
  History,
  Link,
  Key,
  Activity,
} from 'lucide-react'
import { type SidebarData, type NavGroup } from '../types'

// CRM 导航组
export const crmNavGroups: NavGroup[] = [
  {
    title: '市场部',
    items: [
      {
        title: '批量导入',
        url: '/crm/batch-import',
        icon: FileUp,
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
        title: '咨询工作台',
        url: '/crm/workbench',
        icon: LayoutDashboard,
      },
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
        title: '日控表',
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
        title: '订单管理',
        url: '/crm/orders',
        icon: ShoppingCart,
      },
      {
        title: '财务管理',
        url: '/crm/finance',
        icon: Wallet,
      },
    ],
  },
  {
    title: '系统',
    items: [
      {
        title: '云客管理',
        url: '/yunke/dashboard',
        icon: Cloud,
      },
      {
        title: '管理后台',
        url: '/admin/dashboard',
        icon: Shield,
      },
    ],
  },
]

// Admin 导航组
export const adminNavGroups: NavGroup[] = [
  {
    title: '导航',
    items: [
      {
        title: '返回 CRM',
        url: '/crm/leads',
        icon: ArrowLeft,
      },
      {
        title: '系统概览',
        url: '/admin/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: '组织架构管理',
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
]

// 云客导航组
export const yunkeNavGroups: NavGroup[] = [
  {
    title: '导航',
    items: [
      {
        title: '返回 CRM',
        url: '/crm/leads',
        icon: ArrowLeft,
      },
      {
        title: '云客概览',
        url: '/yunke/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: '账号管理',
    items: [
      {
        title: '子账号管理',
        url: '/yunke/accounts',
        icon: Users,
      },
      {
        title: '登录状态',
        url: '/yunke/login-status',
        icon: UserCheck,
      },
      {
        title: '员工绑定',
        url: '/yunke/employee-bindingS',
        icon: Link,
      },
    ],
  },
  {
    title: '通话管理',
    items: [
      {
        title: '通话记录',
        url: '/yunke/call-records',
        icon: PhoneCall,
      },
      {
        title: '录音管理',
        url: '/yunke/recordings',
        icon: History,
      },
    ],
  },
  {
    title: '系统配置',
    items: [
      {
        title: '管理员登录',
        url: '/yunke/admin-login',
        icon: Key,
      },
      {
        title: '运行状态',
        url: '/yunke/status',
        icon: Activity,
      },
    ],
  },
]

// CRM 团队配置
export const crmTeams = [
  {
    name: 'RMF CRM',
    logo: Command,
    plan: 'CRM 系统',
  },
]

// Admin 团队配置
export const adminTeams = [
  {
    name: '管理后台',
    logo: Settings,
    plan: '系统管理',
  },
]

// 云客团队配置
export const yunkeTeams = [
  {
    name: '云客管理',
    logo: Cloud,
    plan: '外呼系统',
  },
]

// 默认导出（兼容旧代码）
export const sidebarData: SidebarData = {
  user: {
    name: 'RMF CRM',
    email: 'admin@rmf.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: crmTeams,
  navGroups: crmNavGroups,
}
