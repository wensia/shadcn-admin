/**
 * Admin Dashboard 页面
 * 管理后台首页 - 重构设计版本
 * 风格：深色主题 + 几何感 + 大胆数字排版
 */

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  MapPin,
  Building2,
  Network,
  Briefcase,
  Users,
  Plus,
  GitBranch,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { adminApi } from '../api'
import type { AdminStats } from '../types'

// 统计项配置
const statConfigs = [
  { key: 'regions', label: '大区', icon: MapPin, gradient: 'from-emerald-400 to-teal-500' },
  { key: 'districts', label: '地区', icon: MapPin, gradient: 'from-sky-400 to-blue-500' },
  { key: 'areas', label: '区域', icon: MapPin, gradient: 'from-violet-400 to-purple-500' },
  { key: 'campuses', label: '校区', icon: Building2, gradient: 'from-rose-400 to-pink-500' },
  { key: 'departments', label: '部门', icon: Network, gradient: 'from-amber-400 to-orange-500' },
  { key: 'positions', label: '职位', icon: Briefcase, gradient: 'from-lime-400 to-green-500' },
] as const

// 快捷操作配置
const quickActions = [
  { key: 'create-region', title: '创建大区', icon: MapPin, path: '/admin/regions' },
  { key: 'create-campus', title: '创建校区', icon: Building2, path: '/admin/campuses' },
  { key: 'create-employee', title: '创建员工', icon: Plus, path: '/admin/employees' },
  { key: 'view-tree', title: '组织架构', icon: GitBranch, path: '/admin/organization-tree' },
  { key: 'manage-departments', title: '部门管理', icon: Network, path: '/admin/departments' },
  { key: 'manage-positions', title: '职位管理', icon: Briefcase, path: '/admin/positions' },
]

// 圆形进度组件
function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
}: {
  value: number
  size?: number
  strokeWidth?: number
}) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedValue / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 300)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-[1.5s] ease-out"
      />
    </svg>
  )
}

// 统计卡片组件
function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  index,
  isLoading,
  onClick
}: {
  label: string
  value: number
  icon: React.ElementType
  gradient: string
  index: number
  isLoading: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10"
        style={{ background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}
      />
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.05] p-5 backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
        {/* 装饰性渐变角 */}
        <div className={cn(
          "absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br opacity-20 rounded-full blur-2xl group-hover:opacity-40 transition-opacity",
          gradient
        )} />

        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br", gradient)}>
            <Icon className="w-4 h-4 text-white/90" />
          </div>
          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </div>

        {isLoading ? (
          <Skeleton className="h-10 w-16 bg-white/10" />
        ) : (
          <div
            className="text-4xl font-light tracking-tight text-white mb-1 animate-in zoom-in-50 duration-500"
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              animationDelay: `${index * 80 + 200}ms`,
              animationFillMode: 'backwards'
            }}
          >
            {value.toLocaleString()}
          </div>
        )}
        <div className="text-sm text-white/40 font-medium">{label}</div>
      </div>
    </div>
  )
}

// 快捷操作按钮
function QuickActionButton({
  title,
  icon: Icon,
  onClick,
  index
}: {
  title: string
  icon: React.ElementType
  onClick: () => void
  index: number
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-200 group text-left animate-in fade-in slide-in-from-left-2 duration-400"
      style={{ animationDelay: `${500 + index * 50}ms`, animationFillMode: 'backwards' }}
    >
      <div className="p-2 rounded-lg bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors">
        <Icon className="w-4 h-4 text-white/60 group-hover:text-white/90 transition-colors" />
      </div>
      <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors font-medium">
        {title}
      </span>
      <ArrowUpRight className="w-3.5 h-3.5 text-white/20 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

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
        ? Math.round((stats.active_employees / stats.employees) * 100)
        : 0,
    }
    : null

  // 获取当前时间段的问候语
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-auto">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/[0.03] rounded-full blur-[120px]" />
        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative z-10 p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-600">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400/80 font-medium tracking-wider uppercase">
                  系统概览
                </span>
              </div>
              <h1
                className="text-3xl lg:text-4xl font-light text-white mb-2"
                style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
              >
                {getGreeting()}，
                <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
                  {user?.name || '管理员'}
                </span>
              </h1>
              <p className="text-white/40 text-sm">
                组织架构与人员管理一览
              </p>
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: '200ms' }}>
              <Button
                onClick={() => navigate({ to: '/admin/employees' })}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-0 rounded-full px-6 h-11 font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建员工
              </Button>
            </div>
          </div>
        </header>

        {/* 主要统计 - 员工概览 */}
        <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-600" style={{ animationDelay: '100ms' }}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* 员工活跃率 - 大卡片 */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.05] p-8">
              {/* 装饰性背景 */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
                {/* 圆形进度 */}
                <div className="relative flex-shrink-0">
                  <CircularProgress
                    value={employeeStats?.activeRate || 0}
                    size={160}
                    strokeWidth={12}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {isLoading ? (
                      <Skeleton className="h-10 w-16 bg-white/10" />
                    ) : (
                      <>
                        <span
                          className="text-4xl font-light text-white animate-in fade-in duration-500"
                          style={{ fontFamily: "'Sora', system-ui, sans-serif", animationDelay: '800ms' }}
                        >
                          {employeeStats?.activeRate || 0}%
                        </span>
                        <span className="text-xs text-white/40 mt-1">在职率</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 详细数据 */}
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-white/90 mb-1">人员状态</h3>
                    <p className="text-sm text-white/40">实时追踪员工在职情况</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs text-white/40">在职</span>
                      </div>
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 bg-white/10" />
                      ) : (
                        <span className="text-2xl font-light text-white" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
                          {employeeStats?.active || 0}
                        </span>
                      )}
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs text-white/40">离职</span>
                      </div>
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 bg-white/10" />
                      ) : (
                        <span className="text-2xl font-light text-white" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
                          {employeeStats?.inactive || 0}
                        </span>
                      )}
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="text-xs text-white/40">管理员</span>
                      </div>
                      {isLoading ? (
                        <Skeleton className="h-8 w-12 bg-white/10" />
                      ) : (
                        <span className="text-2xl font-light text-white" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
                          {employeeStats?.superusers || 0}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 总员工数 - 突出卡片 */}
            <div
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-600/10 border border-emerald-500/20 p-8 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500"
              style={{ animationDelay: '300ms' }}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-emerald-400/80 font-medium">员工总数</span>
                </div>

                {isLoading ? (
                  <Skeleton className="h-16 w-24 bg-white/10" />
                ) : (
                  <div
                    className="text-6xl font-light text-white animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ fontFamily: "'Sora', system-ui, sans-serif", animationDelay: '500ms' }}
                  >
                    {employeeStats?.total || 0}
                  </div>
                )}
              </div>

              <div className="relative flex items-center gap-2 mt-6 text-emerald-400/60">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">组织规模持续增长</span>
              </div>
            </div>
          </div>
        </section>

        {/* 组织架构统计 */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-medium text-white/80">组织架构</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {statConfigs.map((config, index) => {
              const value = stats ? (stats as Record<string, number>)[config.key] : 0
              return (
                <StatCard
                  key={config.key}
                  label={config.label}
                  value={value}
                  icon={config.icon}
                  gradient={config.gradient}
                  index={index}
                  isLoading={isLoading}
                  onClick={() => navigate({ to: `/admin/${config.key}` })}
                />
              )
            })}
          </div>
        </section>

        {/* 快捷操作 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-medium text-white/80">快捷操作</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((action, index) => (
              <QuickActionButton
                key={action.key}
                title={action.title}
                icon={action.icon}
                onClick={() => navigate({ to: action.path })}
                index={index}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
