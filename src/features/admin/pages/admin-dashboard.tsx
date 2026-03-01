/**
 * Admin Dashboard 页面
 * 管理后台首页 - Semi Design 风格
 */

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  IconUser,
  IconMapPin,
  IconHome,
  IconTreeTriangleDown,
  IconBriefcase,
  IconPlus,
  IconBranch,
  IconArrowUp,
  IconExternalOpen,
  IconApps,
} from '@douyinfe/semi-icons'

import { Main } from '@/components/layout/main'
import { Button, Card, Progress, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import { useAuthStore } from '@/stores/auth-store'
import { adminApi } from '../api'
import type { AdminStats } from '../types'

const { Title, Text } = Typography

// 组织架构统计配置
const orgStatConfigs = [
  { key: 'regions', label: '大区', icon: IconMapPin, color: 'var(--semi-color-primary)', path: '/admin/regions' },
  { key: 'districts', label: '地区', icon: IconMapPin, color: 'var(--semi-color-success)', path: '/admin/districts' },
  { key: 'areas', label: '区域', icon: IconMapPin, color: 'var(--semi-color-tertiary)', path: '/admin/areas' },
  { key: 'campuses', label: '校区', icon: IconHome, color: 'var(--semi-color-primary)', path: '/admin/campuses' },
  { key: 'departments', label: '部门', icon: IconTreeTriangleDown, color: 'var(--semi-color-success)', path: '/admin/departments' },
  { key: 'positions', label: '职位', icon: IconBriefcase, color: 'var(--semi-color-tertiary)', path: '/admin/positions' },
] as const

// 快捷操作配置
const quickActions = [
  { key: 'create-region', title: '创建大区', desc: '新增管理大区', icon: IconMapPin, path: '/admin/regions', primary: false },
  { key: 'create-campus', title: '创建校区', desc: '新增教学校区', icon: IconHome, path: '/admin/campuses', primary: false },
  { key: 'create-employee', title: '创建员工', desc: '添加新员工', icon: IconPlus, path: '/admin/employees', primary: true },
  { key: 'view-tree', title: '组织架构', desc: '查看架构全景', icon: IconBranch, path: '/admin/organization-tree', primary: true },
  { key: 'manage-departments', title: '部门管理', desc: '管理部门设置', icon: IconTreeTriangleDown, path: '/admin/departments', primary: false },
  { key: 'manage-positions', title: '职位管理', desc: '配置职位体系', icon: IconBriefcase, path: '/admin/positions', primary: false },
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
    <Card
      bordered={false}
      shadows="hover"
      style={{ height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 16 }}
      bodyStyle={{ padding: 28, display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* 右上装饰弧 */}
      <div
        style={{
          position: 'absolute',
          right: -48,
          top: -48,
          width: 160,
          height: 160,
          borderRadius: '50%',
          opacity: 0.07,
          background: 'var(--semi-color-primary)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -16,
          top: -16,
          width: 96,
          height: 96,
          borderRadius: '50%',
          opacity: 0.05,
          background: 'var(--semi-color-primary)',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--semi-color-primary-light-default)',
            }}
          >
            <IconUser style={{ color: 'var(--semi-color-primary)', fontSize: 18 }} />
          </div>
          <Text
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
            }}
            type="tertiary"
          >
            员工总数
          </Text>
        </div>

        {isLoading ? (
          <Skeleton.Paragraph rows={1} style={{ width: 144, height: 96, marginBottom: 16 }} />
        ) : (
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--semi-color-text-0)',
              marginBottom: 16,
              fontFamily: 'Poppins, sans-serif',
              lineHeight: 1,
            }}
          >
            {animatedTotal}
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <div style={{ height: 1, width: 64, background: 'var(--semi-color-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <IconArrowUp style={{ color: 'var(--semi-color-success)', fontSize: 14 }} />
            <Text style={{ fontSize: 14, color: 'var(--semi-color-success)' }}>
              组织规模持续增长
            </Text>
          </div>
        </div>
      </div>
    </Card>
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
  const animatedRate = useAnimatedNumber(activeRate, 500)

  const statusItems = [
    { label: '在职', value: active, color: 'var(--semi-color-success)' },
    { label: '离职', value: inactive, color: 'var(--semi-color-primary)' },
    { label: '管理员', value: superusers, color: 'var(--semi-color-tertiary)' },
  ]

  return (
    <Card
      bordered={false}
      shadows="hover"
      style={{ height: '100%', borderRadius: 16 }}
      bodyStyle={{ padding: 28, display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ marginBottom: 24 }}>
        <Title heading={6} style={{ margin: 0 }}>人员状态</Title>
        <Text type="tertiary" size="small">实时追踪员工在职情况</Text>
      </div>

      {/* 在职率进度条 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          {isLoading ? (
            <Skeleton.Paragraph rows={1} style={{ width: 80, height: 40 }} />
          ) : (
            <>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--semi-color-text-0)',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {animatedRate}
              </span>
              <Text type="tertiary" style={{ fontSize: 18, fontFamily: 'Poppins, sans-serif' }}>%</Text>
            </>
          )}
          <Text type="tertiary" size="small" style={{ marginLeft: 8 }}>在职率</Text>
        </div>

        <Progress
          percent={activeRate}
          stroke="var(--semi-color-success)"
          size="large"
          showInfo={false}
        />
      </div>

      {/* 三格数据 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {statusItems.map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: 12,
              border: '1px solid var(--semi-color-border)',
              background: 'var(--semi-color-fill-0)',
              padding: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.color,
                }}
              />
              <Text type="tertiary" size="small">{item.label}</Text>
            </div>
            {isLoading ? (
              <Skeleton.Paragraph rows={1} style={{ width: 40, height: 32 }} />
            ) : (
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: 'var(--semi-color-text-0)',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// 组织架构统计卡
function OrgStatCard({
  label,
  value,
  icon: Icon,
  color,
  isLoading,
  onClick,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  isLoading: boolean
  onClick: () => void
}) {
  return (
    <Card
      shadows="hover"
      style={{
        borderRadius: 12,
        cursor: 'pointer',
        borderTop: `2px solid ${color}`,
      }}
      bodyStyle={{ padding: 20 }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--semi-color-fill-0)',
          }}
        >
          <Icon style={{ color, fontSize: 16 }} />
        </div>
        <IconExternalOpen style={{ fontSize: 14, color: 'var(--semi-color-text-3)' }} />
      </div>

      {isLoading ? (
        <Skeleton.Paragraph rows={1} style={{ width: 56, height: 40, marginBottom: 4 }} />
      ) : (
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--semi-color-text-0)',
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {value}
        </div>
      )}
      <Text type="tertiary" size="small" style={{ marginTop: 4 }}>{label}</Text>
    </Card>
  )
}

// 快捷操作卡片
function QuickActionCard({
  title,
  desc,
  icon: Icon,
  primary,
  onClick,
}: {
  title: string
  desc: string
  icon: React.ElementType
  primary: boolean
  onClick: () => void
}) {
  return (
    <Card
      shadows="hover"
      style={{
        borderRadius: 12,
        cursor: 'pointer',
        ...(primary ? { borderLeft: '2px solid var(--semi-color-primary)' } : {}),
      }}
      bodyStyle={{
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
      onClick={onClick}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--semi-color-fill-0)',
          flexShrink: 0,
        }}
      >
        <Icon style={{ fontSize: 16, color: 'var(--semi-color-text-2)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14 }}>{title}</Text>
        <Text type="tertiary" size="small" style={{ display: 'block' }}>{desc}</Text>
      </div>
      <IconExternalOpen style={{ fontSize: 16, color: 'var(--semi-color-text-3)', flexShrink: 0 }} />
    </Card>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Header */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IconApps style={{ fontSize: 16, color: 'var(--semi-color-primary)', opacity: 0.6 }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--semi-color-primary)',
                }}
              >
                系统概览
              </Text>
            </div>
            <Title heading={2} style={{ margin: 0 }}>
              {getGreeting()}，
              <span style={{ color: 'var(--semi-color-primary)' }}>{user?.name || '管理员'}</span>
            </Title>
            <Text type="tertiary" size="small" style={{ marginTop: 6, display: 'block' }}>
              组织架构与人员管理一览
            </Text>
          </div>

          <Button
            theme="solid"
            type="primary"
            icon={<IconPlus />}
            onClick={() => navigate({ to: '/admin/employees' })}
            style={{ borderRadius: 999, paddingLeft: 24, paddingRight: 24 }}
          >
            创建员工
          </Button>
        </header>

        {/* Row A: 员工核心数据 */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          <EmployeeHeroCard
            total={employeeStats?.total || 0}
            isLoading={isLoading}
          />
          <EmployeeStatusCard
            active={employeeStats?.active || 0}
            inactive={employeeStats?.inactive || 0}
            superusers={employeeStats?.superusers || 0}
            activeRate={employeeStats?.activeRate || 0}
            isLoading={isLoading}
          />
        </section>

        {/* Row B: 组织架构统计 */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Title heading={5} style={{ margin: 0 }}>组织架构</Title>
            <div style={{ height: 1, flex: 1, background: 'var(--semi-color-border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
            {orgStatConfigs.map((config) => {
              const value = stats ? (stats as Record<string, number>)[config.key] : 0
              return (
                <OrgStatCard
                  key={config.key}
                  label={config.label}
                  value={value}
                  icon={config.icon}
                  color={config.color}
                  isLoading={isLoading}
                  onClick={() => navigate({ to: config.path })}
                />
              )
            })}
          </div>
        </section>

        {/* Row C: 快捷操作 */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Title heading={5} style={{ margin: 0 }}>快捷操作</Title>
            <div style={{ height: 1, flex: 1, background: 'var(--semi-color-border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.key}
                title={action.title}
                desc={action.desc}
                icon={action.icon}
                primary={action.primary}
                onClick={() => navigate({ to: action.path })}
              />
            ))}
          </div>
        </section>
      </div>
    </Main>
  )
}
