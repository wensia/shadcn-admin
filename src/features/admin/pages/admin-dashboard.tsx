/**
 * Admin Dashboard 页面
 * 管理后台首页，显示系统统计和快捷操作
 */

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  MapPin,
  Building2,
  Network,
  Briefcase,
  Users,
  UserCheck,
  ShieldCheck,
  Plus,
  GitBranch,
  ChevronRight,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/stores/auth-store'
import { adminApi } from '../api'
import type { AdminStats } from '../types'

// 统计项配置
const statConfigs = [
  { key: 'regions', label: '大区', icon: MapPin, color: 'text-green-500', bgColor: 'bg-green-50' },
  { key: 'districts', label: '地区', icon: MapPin, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  { key: 'areas', label: '区域', icon: MapPin, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  { key: 'campuses', label: '校区', icon: Building2, color: 'text-rose-500', bgColor: 'bg-rose-50' },
  { key: 'departments', label: '部门', icon: Network, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  { key: 'positions', label: '职位', icon: Briefcase, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  { key: 'employees', label: '员工总数', icon: Users, color: 'text-pink-500', bgColor: 'bg-pink-50' },
  { key: 'active_employees', label: '在职员工', icon: UserCheck, color: 'text-teal-500', bgColor: 'bg-teal-50' },
  { key: 'superusers', label: '管理员', icon: ShieldCheck, color: 'text-red-500', bgColor: 'bg-red-50' },
] as const

// 快捷操作配置
const quickActions = [
  {
    key: 'create-region',
    title: '创建大区',
    description: '新建一个大区',
    icon: MapPin,
    color: 'text-green-500',
    path: '/admin/regions',
  },
  {
    key: 'create-campus',
    title: '创建校区',
    description: '新建一个校区',
    icon: Building2,
    color: 'text-blue-500',
    path: '/admin/campuses',
  },
  {
    key: 'create-employee',
    title: '创建员工',
    description: '新建一个员工账户',
    icon: Plus,
    color: 'text-amber-500',
    path: '/admin/employees',
  },
  {
    key: 'view-tree',
    title: '组织架构树',
    description: '查看完整的组织架构',
    icon: GitBranch,
    color: 'text-purple-500',
    path: '/admin/organization-tree',
  },
  {
    key: 'manage-departments',
    title: '部门管理',
    description: '管理系统部门',
    icon: Network,
    color: 'text-red-500',
    path: '/admin/departments',
  },
  {
    key: 'manage-positions',
    title: '职位管理',
    description: '管理职位信息',
    icon: Briefcase,
    color: 'text-emerald-500',
    path: '/admin/positions',
  },
]

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // 获取统计数据
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  })

  const stats = statsData?.data as AdminStats | undefined

  // 计算员工统计
  const employeeStats = stats
    ? {
      total: stats.employees,
      active: stats.active_employees,
      inactive: stats.employees - stats.active_employees,
      superusers: stats.superusers,
      activeRate: stats.employees > 0
        ? ((stats.active_employees / stats.employees) * 100).toFixed(1)
        : '0',
    }
    : null

  return (
    <div className="space-y-8 p-2">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-medium text-foreground mb-2">
            Good afternoon, {user?.name || 'Super Admin'}
          </h1>
          <p className="text-muted-foreground font-sans">
            Overview of your organization and personnel.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-full px-6"
          onClick={() => navigate({ to: '/admin/employees' })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Employee
        </Button>
      </div>

      {/* Stats Grid - Minimalist */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {statConfigs.map((config) => {
          const value = stats ? (stats as Record<string, number>)[config.key] : 0
          return (
            <div key={config.key} className="flex flex-col gap-1 group cursor-pointer" onClick={() => navigate({ to: `/admin/${config.key}` })}>
              <span className="text-sm text-muted-foreground font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
                {config.label}
              </span>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <span className="text-3xl font-serif text-foreground font-normal">
                  {value.toLocaleString()}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-8 pt-4">
        {/* Quick Actions */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-lg font-serif font-medium mb-4">Quick Actions</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <div
                  key={action.key}
                  onClick={() => navigate({ to: action.path })}
                  className="flex flex-col p-4 rounded-xl border border-border/50 bg-card hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-md bg-secondary text-foreground group-hover:text-primary transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors">{action.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {action.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Employee Stats - Simplified */}
        <div className="bg-secondary/30 rounded-2xl p-6">
          <h3 className="text-lg font-serif font-medium mb-6">Personnel Status</h3>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : employeeStats ? (
            <div className="space-y-8">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-4xl font-serif text-foreground">{employeeStats.activeRate}%</div>
                  <div className="text-sm text-muted-foreground mt-1">Active Employment Rate</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-serif text-foreground">{employeeStats.total}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Staff</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500/70"></span>
                    Active
                  </span>
                  <span className="font-medium">{employeeStats.active}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500/70"></span>
                    Inactive
                  </span>
                  <span className="font-medium">{employeeStats.inactive}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary/70"></span>
                    Admin
                  </span>
                  <span className="font-medium">{employeeStats.superusers}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No data available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
