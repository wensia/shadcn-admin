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
import { useAuthStore } from '@/stores/authStore'
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
    <div className="space-y-6">
      {/* 欢迎卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                欢迎回来，{user?.name || '超级管理员'}！
              </h2>
              <p className="text-muted-foreground mb-4">
                这里是RMF CRM管理后台，您可以管理整个系统的组织架构和人员信息。
              </p>
              <div className="flex gap-2">
                <Badge variant="destructive">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  超级管理员
                </Badge>
                <Badge variant="secondary">
                  上次登录：{new Date().toLocaleString('zh-CN')}
                </Badge>
              </div>
            </div>
            <Button size="lg" onClick={() => navigate({ to: '/admin/employees' })}>
              <Plus className="w-4 h-4 mr-2" />
              创建员工
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 统计数据卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {statConfigs.map((config) => {
          const Icon = config.icon
          const value = stats ? (stats as Record<string, number>)[config.key] : 0

          return (
            <Card key={config.key} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                    {isLoading ? (
                      <Skeleton className="w-6 h-6 rounded" />
                    ) : (
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-12 mt-1" />
                    ) : (
                      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 快捷操作和员工统计 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 快捷操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快捷操作</CardTitle>
            <CardDescription>常用功能入口</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <div
                  key={action.key}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate({ to: action.path })}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${action.color}`} />
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 员工统计 */}
        <Card>
          <CardHeader>
            <CardTitle>员工统计</CardTitle>
            <CardDescription>员工在职情况概览</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : employeeStats ? (
              <div className="space-y-6">
                {/* 概览数据 */}
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-3xl font-bold">{employeeStats.total}</p>
                    <p className="text-sm text-muted-foreground">员工总数</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-500">{employeeStats.activeRate}%</p>
                    <p className="text-sm text-muted-foreground">在职率</p>
                  </div>
                </div>

                {/* 进度条 */}
                <Progress value={parseFloat(employeeStats.activeRate)} className="h-2" />

                {/* 详细数据 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="h-5">在职</Badge>
                    </div>
                    <span className="font-medium">{employeeStats.active}人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" className="h-5">离职</Badge>
                    </div>
                    <span className="font-medium">{employeeStats.inactive}人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="h-5">管理员</Badge>
                    </div>
                    <span className="font-medium">{employeeStats.superusers}人</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle>系统信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">系统版本</p>
              <p className="font-medium">RMF CRM v1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">数据库</p>
              <p className="font-medium">PostgreSQL</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">后端框架</p>
              <p className="font-medium">FastAPI + SQLAlchemy 2.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">前端框架</p>
              <p className="font-medium">React + shadcn/ui</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">部署环境</p>
              <p className="font-medium">Docker</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">最后更新</p>
              <p className="font-medium">{new Date().toLocaleDateString('zh-CN')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
