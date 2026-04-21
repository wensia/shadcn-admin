import {
  Users,
  FileUp,
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
  PhoneCall,
  Library,
  ClipboardList,
  CalendarCheck,
  Settings,
  Settings2,
  ArrowLeft,
  Shield,
  Cloud,
  History,
  Key,
  Activity,
  Clock,
  Bot,
  BrainCircuit,
  Bell,
  BrainCog,
  UserMinus,
  Wrench,
} from 'lucide-react'
import { type SidebarData, type NavGroup } from '../types'

// CRM 导航组
export const crmNavGroups: NavGroup[] = [
  {
    title: '市场部',
    icon: TrendingUp,
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
      {
        title: '创建日志',
        url: '/crm/lead-creation-logs',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: '咨询部',
    icon: Headphones,
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
        title: '渠道台账',
        url: '/crm/channel-ledger',
        icon: Library,
      },
      {
        title: '分配任务',
        url: '/crm/leads/assignment-tasks',
        icon: Activity,
      },
      {
        title: '公海线索',
        url: '/crm/leads/pool',
        icon: Home,
      },
      {
        title: '通话记录',
        url: '/crm/call-records',
        icon: PhoneCall,
      },
      {
        title: '连续外呼',
        url: '/crm/continuous-call',
        icon: Headphones,
      },
      {
        title: 'AI 数据助手',
        url: '/crm/ai-assistant',
        icon: Bot,
      },
      {
        title: '日控表',
        url: '/crm/visit-schedule',
        icon: CalendarCheck,
      },
      {
        title: '顾问数据中心',
        url: '/crm/advisor-center',
        icon: BarChart3,
      },
    ],
  },
  {
    title: '教管部',
    icon: GraduationCap,
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
      {
        title: 'ASP 测评记录',
        url: '/crm/asp-records',
        icon: BrainCog,
      },
    ],
  },
  {
    title: '行政部',
    icon: UserCog,
    items: [
      {
        title: '人事管理',
        url: '/hr/disc-test',
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
    title: '工具',
    icon: Wrench,
    items: [
      {
        title: '工具导航',
        url: '/tools',
        icon: Wrench,
      },
    ],
  },
  {
    title: '系统',
    icon: Settings,
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
    icon: Home,
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
    title: '组织架构',
    icon: Network,
    items: [
      {
        title: '组织架构树',
        url: '/admin/organization-tree',
        icon: Network,
      },
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
    ],
  },
  {
    title: '部门职位',
    icon: Briefcase,
    items: [
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
        title: '区域部门配置',
        url: '/admin/area-departments',
        icon: Network,
      },
      {
        title: '职位管理',
        url: '/admin/positions',
        icon: Briefcase,
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
        title: '员工身份管理',
        url: '/admin/identities',
        icon: UsersRound,
      },
      {
        title: '管理层级',
        url: '/admin/employee-hierarchy',
        icon: GitBranch,
      },
    ],
  },
  {
    title: '业务数据',
    icon: BarChart3,
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
        title: '课程配置',
        url: '/admin/courses',
        icon: Library,
      },
      {
        title: '线索查看统计',
        url: '/admin/lead-access-stats',
        icon: Eye,
      },
    ],
  },
  {
    title: '系统配置',
    icon: Settings2,
    items: [
      {
        title: '页面访问权限',
        url: '/admin/page-access',
        icon: Shield,
      },
      {
        title: '连续外呼配置',
        url: '/admin/call-config',
        icon: PhoneCall,
      },
      {
        title: '定时任务',
        url: '/admin/scheduled-tasks',
        icon: Clock,
      },
      {
        title: '每日通知',
        url: '/admin/daily-notices',
        icon: Bell,
      },
      {
        title: 'AI 配置',
        url: '/admin/ai-config',
        icon: BrainCircuit,
      },
      {
        title: '集成配置',
        url: '/admin/integrations',
        icon: Settings2,
      },
    ],
  },
]

// 人事管理导航组
export const hrNavGroups: NavGroup[] = [
  {
    title: '导航',
    icon: Home,
    items: [
      {
        title: '返回 CRM',
        url: '/crm/leads',
        icon: ArrowLeft,
      },
    ],
  },
  {
    title: '人事',
    icon: ClipboardList,
    items: [
      {
        title: '离职审批',
        url: '/hr/resignations',
        icon: UserMinus,
      },
      {
        title: 'DISC 测试管理',
        url: '/hr/disc-test',
        icon: ClipboardList,
      },
    ],
  },
]

// 云客导航组
export const yunkeNavGroups: NavGroup[] = [
  {
    title: '导航',
    icon: Home,
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
    icon: KeyRound,
    items: [
      {
        title: '账号凭证管理',
        url: '/yunke/credentials',
        icon: KeyRound,
      },
      {
        title: '子账号管理',
        url: '/yunke/accounts',
        icon: Users,
      },
    ],
  },
  {
    title: '通话管理',
    icon: PhoneCall,
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
    title: 'AI 工具',
    icon: Bot,
    items: [
      {
        title: 'AI 数据助手',
        url: '/yunke/ai-assistant',
        icon: Bot,
      },
      {
        title: '顾问陪练',
        url: '/yunke/advisor-training',
        icon: BrainCircuit,
      },
    ],
  },
  {
    title: '系统配置',
    icon: Settings,
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

// 人事管理团队配置
export const hrTeams = [
  {
    name: '人事管理',
    logo: UserCog,
    plan: '人事系统',
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

// 工具导航组（在 /tools 下使用，侧边栏只留单入口，具体工具通过 Hub 卡片进入）
export const toolsNavGroups: NavGroup[] = [
  {
    title: '工具',
    icon: Wrench,
    items: [
      {
        title: '工具导航',
        url: '/tools',
        icon: Wrench,
      },
    ],
  },
]

// 工具团队配置
export const toolsTeams = [
  {
    name: '工具中心',
    logo: Wrench,
    plan: '实用工具',
  },
]

// 默认导出（兼容旧代码）
export const sidebarData: SidebarData = {
  user: {
    name: 'RMF CRM',
    email: 'admin@rmf.com',
    avatar: '/images/favicon.png',
  },
  teams: crmTeams,
  navGroups: crmNavGroups,
}
