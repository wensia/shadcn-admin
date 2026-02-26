/**
 * Admin Dashboard 页面
 * 管理后台首页 - "Warm Editorial" 设计
 * 温暖编辑风格：品牌暖米色主题 + Anthropic 色系 + Bento Grid 布局
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
  TrendingUp,
  LayoutDashboard,
} from 'lucide-react'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { adminApi } from '../api'
import type { AdminStats } from '../types'

// 品牌色常量
const BRAND = {
  terracotta: '#d97757',
  green: '#788c5d',
  blue: '#6a9bcc',
  warmGray: '#e6e4dc',
  midGray: '#b0aea5',
} as const

// 组织架构统计配置
const orgStatConfigs = [
  { key: 'regions', label: '大区', icon: MapPin, color: BRAND.terracotta, path: '/admin/regions' },
  { key: 'districts', label: '地区', icon: MapPin, color: BRAND.green, path: '/admin/districts' },
  { key: 'areas', label: '区域', icon: MapPin, color: BRAND.blue, path: '/admin/areas' },
  { key: 'campuses', label: '校区', icon: Building2, color: BRAND.terracotta, path: '/admin/campuses' },
  { key: 'departments', label: '部门', icon: Network, color: BRAND.green, path: '/admin/departments' },
  { key: 'positions', label: '职位', icon: Briefcase, color: BRAND.blue, path: '/admin/positions' },
] as const

// 快捷操作配置
const quickActions = [
  { key: 'create-region', title: '创建大区', desc: '新增管理大区', icon: MapPin, path: '/admin/regions', primary: false },
  { key: 'create-campus', title: '创建校区', desc: '新增教学校区', icon: Building2, path: '/admin/campuses', primary: false },
  { key: 'create-employee', title: '创建员工', desc: '添加新员工', icon: Plus, path: '/admin/employees', primary: true },
  { key: 'view-tree', title: '组织架构', desc: '查看架构全景', icon: GitBranch, path: '/admin/organization-tree', primary: true },
  { key: 'manage-departments', title: '部门管理', desc: '管理部门设置', icon: Network, path: '/admin/departments', primary: false },
  { key: 'manage-positions', title: '职位管理', desc: '配置职位体系', icon: Briefcase, path: '/admin/positions', primary: false },
]

// 动画计数 Hook
function useAnimatedNumber(target: number, delay = 300, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now()
      const animate = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        // easeOutQuart
        const eased = 1 - Math.pow(1 - progress, 4)
        setValue(Math.round(target * eased))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay)
    return () => clearTimeout(timer)
  }, [target, delay, duration])
  return value
}

// 员工总数英雄卡
function EmployeeHeroCard({
  total,
  isLoading,
}: {
  total: number
  isLoading: boolean
}) {
  const animatedTotal = useAnimatedNumber(total, 400)

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-600">
      {/* 右上装饰弧 */}
      <div
        className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-[0.07]"
        style={{ background: BRAND.terracotta }}
      />
      <div
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.05]"
        style={{ background: BRAND.terracotta }}
      />

      <div className="relative flex flex-1 flex-col">
        <div className="mb-6 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${BRAND.terracotta}14` }}
          >
            <Users className="h-4.5 w-4.5" style={{ color: BRAND.terracotta }} />
          </div>
          <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground">
            员工总数
          </span>
        </div>

        {isLoading ? (
          <Skeleton className="mb-4 h-24 w-36" />
        ) : (
          <div className="mb-4 font-poppins text-7xl font-semibold tracking-tight text-foreground lg:text-8xl">
            {animatedTotal}
          </div>
        )}

        <div className="mt-auto">
          <div className="h-px w-16 bg-border" />
          <div className="mt-4 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" style={{ color: BRAND.green }} />
            <span className="text-sm" style={{ color: BRAND.green }}>
              组织规模持续增长
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 员工状态可视化卡
function EmployeeStatusCard({
  active,
  inactive,
  superusers,
  activeRate,
  isLoading,
}: {
  active: number
  inactive: number
  superusers: number
  activeRate: number
  isLoading: boolean
}) {
  const [barWidth, setBarWidth] = useState(0)
  const animatedRate = useAnimatedNumber(activeRate, 500)

  useEffect(() => {
    const timer = setTimeout(() => setBarWidth(activeRate), 500)
    return () => clearTimeout(timer)
  }, [activeRate])

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-600"
      style={{ animationDelay: '100ms' }}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-foreground">人员状态</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">实时追踪员工在职情况</p>
        </div>
      </div>

      {/* 在职率进度条 */}
      <div className="mb-7">
        <div className="mb-2 flex items-baseline gap-1.5">
          {isLoading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <>
              <span className="font-poppins text-4xl font-semibold tracking-tight text-foreground">
                {animatedRate}
              </span>
              <span className="font-poppins text-lg font-medium text-muted-foreground">%</span>
            </>
          )}
          <span className="ml-2 text-sm text-muted-foreground">在职率</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: BRAND.warmGray }}>
          <div
            className="h-full rounded-full transition-all duration-[1.2s] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              width: `${barWidth}%`,
              backgroundColor: BRAND.green,
            }}
          />
        </div>
      </div>

      {/* 三格数据 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-secondary/40 p-3.5">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND.green }} />
            <span className="text-xs text-muted-foreground">在职</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-10" />
          ) : (
            <span className="font-poppins text-2xl font-semibold text-foreground">{active}</span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-3.5">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND.terracotta }} />
            <span className="text-xs text-muted-foreground">离职</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-10" />
          ) : (
            <span className="font-poppins text-2xl font-semibold text-foreground">{inactive}</span>
          )}
        </div>

        <div className="rounded-xl border border-border bg-secondary/40 p-3.5">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: BRAND.blue }} />
            <span className="text-xs text-muted-foreground">管理员</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-10" />
          ) : (
            <span className="font-poppins text-2xl font-semibold text-foreground">{superusers}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// 组织架构统计卡
function OrgStatCard({
  label,
  value,
  icon: Icon,
  color,
  index,
  isLoading,
  onClick,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  index: number
  isLoading: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{
        animationDelay: `${200 + index * 60}ms`,
        animationFillMode: 'backwards',
        borderTopColor: `${color}60`,
        borderTopWidth: '2px',
      }}
    >
      <div className="mb-3.5 flex items-center justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}14` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      {isLoading ? (
        <Skeleton className="mb-1 h-10 w-14" />
      ) : (
        <div className="font-poppins text-4xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
      )}
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

// 快捷操作卡片
function QuickActionCard({
  title,
  desc,
  icon: Icon,
  primary,
  onClick,
  index,
}: {
  title: string
  desc: string
  icon: React.ElementType
  primary: boolean
  onClick: () => void
  index: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:bg-secondary/60 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-400',
        primary ? 'border-l-2' : 'border-border',
      )}
      style={{
        animationDelay: `${400 + index * 50}ms`,
        animationFillMode: 'backwards',
        ...(primary ? { borderLeftColor: index === 2 ? BRAND.terracotta : BRAND.green } : {}),
      }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-4 w-4 text-foreground/60 transition-colors group-hover:text-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  )
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  })

  const stats = statsData?.data as AdminStats | undefined

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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  return (
    <Main>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between animate-in fade-in duration-500">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-primary/60" />
              <span className="text-xs font-medium tracking-[0.15em] uppercase text-primary">
                系统概览
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
              {getGreeting()}，
              <span className="text-primary">{user?.name || '管理员'}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              组织架构与人员管理一览
            </p>
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: '200ms' }}>
            <Button
              onClick={() => navigate({ to: '/admin/employees' })}
              className="rounded-full px-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              创建员工
            </Button>
          </div>
        </header>

        {/* Row A: 员工核心数据 - Bento Grid */}
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <EmployeeHeroCard
              total={employeeStats?.total || 0}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-7">
            <EmployeeStatusCard
              active={employeeStats?.active || 0}
              inactive={employeeStats?.inactive || 0}
              superusers={employeeStats?.superusers || 0}
              activeRate={employeeStats?.activeRate || 0}
              isLoading={isLoading}
            />
          </div>
        </section>

        {/* Row B: 组织架构统计 */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-lg font-medium text-foreground">组织架构</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {orgStatConfigs.map((config, index) => {
              const value = stats ? (stats as Record<string, number>)[config.key] : 0
              return (
                <OrgStatCard
                  key={config.key}
                  label={config.label}
                  value={value}
                  icon={config.icon}
                  color={config.color}
                  index={index}
                  isLoading={isLoading}
                  onClick={() => navigate({ to: config.path })}
                />
              )
            })}
          </div>
        </section>

        {/* Row C: 快捷操作 */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-lg font-medium text-foreground">快捷操作</h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action, index) => (
              <QuickActionCard
                key={action.key}
                title={action.title}
                desc={action.desc}
                icon={action.icon}
                primary={action.primary}
                onClick={() => navigate({ to: action.path })}
                index={index}
              />
            ))}
          </div>
        </section>
      </div>
    </Main>
  )
}
