/**
 * Admin Dashboard 页面
 * Excel 风格 — 管理层熟悉的表格化数据概览
 */

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  IconPlus,
  IconRefresh,
  IconExternalOpen,
} from '@douyinfe/semi-icons'

import { Main } from '@/components/layout/main'
import { Button, Table, Typography, Skeleton, Tag } from '@douyinfe/semi-ui-19'
import { useAuthStore } from '@/stores/auth-store'
import { adminApi } from '../api'
import type { AdminStats } from '../types'

const { Title, Text } = Typography

// Excel 单元格样式常量
const cellStyle: React.CSSProperties = {
  fontFamily: 'Consolas, "Courier New", monospace',
  fontSize: 13,
}

const numberCellStyle: React.CSSProperties = {
  ...cellStyle,
  textAlign: 'right' as const,
  fontWeight: 600,
  fontSize: 15,
  color: 'var(--semi-color-text-0)',
}

const headerCellStyle: React.CSSProperties = {
  background: '#217346',
  color: '#fff',
  fontWeight: 600,
  fontSize: 12,
  letterSpacing: '0.05em',
}

// 组织架构数据行配置
const orgRows = [
  { key: 'regions', label: '大区', path: '/admin/regions' },
  { key: 'districts', label: '地区', path: '/admin/districts' },
  { key: 'areas', label: '区域', path: '/admin/areas' },
  { key: 'campuses', label: '校区', path: '/admin/campuses' },
  { key: 'departments', label: '部门', path: '/admin/departments' },
  { key: 'positions', label: '职位', path: '/admin/positions' },
] as const

// 快捷操作
const quickActions = [
  { label: '创建员工', path: '/admin/employees' },
  { label: '组织架构', path: '/admin/organization' },
  { label: '部门管理', path: '/admin/departments' },
  { label: '职位管理', path: '/admin/positions' },
  { label: '校区管理', path: '/admin/campuses' },
  { label: '大区管理', path: '/admin/regions' },
]

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  })

  const stats = statsData?.data as AdminStats | undefined

  // 员工汇总表数据
  const employeeSummary = stats
    ? [
        { key: '1', item: '员工总数', value: stats.employees },
        { key: '2', item: '在职员工', value: stats.active_employees },
        { key: '3', item: '离职员工', value: stats.employees - stats.active_employees },
        { key: '4', item: '管理员', value: stats.superusers },
        {
          key: '5',
          item: '在职率',
          value: stats.employees > 0
            ? Math.round((stats.active_employees / stats.employees) * 100)
            : 0,
          isPercent: true,
        },
      ]
    : []

  // 组织架构表数据
  const orgData = stats
    ? orgRows.map((row, idx) => ({
        key: String(idx + 1),
        seq: idx + 1,
        label: row.label,
        count: (stats as unknown as Record<string, number>)[row.key] || 0,
        path: row.path,
      }))
    : []

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  // 员工汇总表列定义
  const employeeColumns = [
    {
      title: '项目',
      dataIndex: 'item',
      width: 160,
      render: (text: string) => (
        <span style={cellStyle}>{text}</span>
      ),
    },
    {
      title: '数值',
      dataIndex: 'value',
      width: 120,
      align: 'right' as const,
      render: (val: number, record: { isPercent?: boolean }) => (
        <span style={numberCellStyle}>
          {record.isPercent ? `${val}%` : val.toLocaleString()}
        </span>
      ),
    },
    {
      title: '说明',
      dataIndex: 'item',
      render: (_: string, record: { item: string; value: number; isPercent?: boolean }) => {
        if (record.isPercent) {
          return (
            <Tag
              color={record.value >= 90 ? 'green' : record.value >= 70 ? 'amber' : 'red'}
              size="small"
              style={{ fontFamily: 'inherit' }}
            >
              {record.value >= 90 ? '优秀' : record.value >= 70 ? '正常' : '偏低'}
            </Tag>
          )
        }
        return <span style={{ ...cellStyle, color: 'var(--semi-color-text-2)' }}>—</span>
      },
    },
  ]

  // 组织架构表列定义
  const orgColumns = [
    {
      title: '#',
      dataIndex: 'seq',
      width: 50,
      align: 'center' as const,
      render: (val: number) => (
        <span style={{ ...cellStyle, color: 'var(--semi-color-text-2)' }}>{val}</span>
      ),
    },
    {
      title: '层级',
      dataIndex: 'label',
      width: 120,
      render: (text: string) => <span style={cellStyle}>{text}</span>,
    },
    {
      title: '数量',
      dataIndex: 'count',
      width: 100,
      align: 'right' as const,
      render: (val: number) => (
        <span style={numberCellStyle}>{val.toLocaleString()}</span>
      ),
    },
    {
      title: '操作',
      dataIndex: 'path',
      width: 80,
      align: 'center' as const,
      render: (path: string) => (
        <Button
          theme="borderless"
          type="tertiary"
          icon={<IconExternalOpen size="small" />}
          onClick={() => navigate({ to: path })}
        />
      ),
    },
  ]

  return (
    <Main>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 工具栏 - Excel 风格 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--semi-color-fill-0)',
            border: '1px solid var(--semi-color-border)',
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Title heading={5} style={{ margin: 0 }}>
              系统概览
            </Title>
            <Text type="tertiary" size="small">
              {getGreeting()}，{user?.name || '管理员'}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              icon={<IconRefresh />}
              theme="borderless"
              onClick={() => refetch()}
              style={{ ...cellStyle }}
              title="刷新"
              aria-label="刷新"
            />
            <Button
              icon={<IconPlus />}
              theme="solid"
              type="primary"
              onClick={() => navigate({ to: '/admin/employees' })}
              style={{ ...cellStyle }}
            >
              创建员工
            </Button>
          </div>
        </div>

        {/* 上半部分: 两个表格并排 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Sheet 1: 人员概况 */}
          <div>
            <div style={sheetTabStyle}>
              <span style={sheetTabActiveStyle}>人员概况</span>
            </div>
            {isLoading ? (
              <Skeleton.Paragraph rows={5} style={{ padding: 16 }} />
            ) : (
              <Table
                columns={employeeColumns}
                dataSource={employeeSummary}
                pagination={false}
                size="small"
                bordered
                rowKey="key"
                style={tableStyle}
                className="admin-dashboard-summary-table"
              />
            )}
          </div>

          {/* Sheet 2: 组织架构 */}
          <div>
            <div style={sheetTabStyle}>
              <span style={sheetTabActiveStyle}>组织架构</span>
              <span style={sheetTabInactiveStyle}>趋势</span>
            </div>
            {isLoading ? (
              <Skeleton.Paragraph rows={6} style={{ padding: 16 }} />
            ) : (
              <Table
                columns={orgColumns}
                dataSource={orgData}
                pagination={false}
                size="small"
                bordered
                rowKey="key"
                style={tableStyle}
                className="admin-dashboard-summary-table"
                onRow={(record) => ({
                  style: { cursor: 'pointer' },
                  onClick: () => navigate({ to: (record as { path: string }).path }),
                })}
              />
            )}
          </div>
        </div>

        {/* 快捷导航条 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'var(--semi-color-fill-0)',
            border: '1px solid var(--semi-color-border)',
            borderRadius: 4,
          }}
        >
          <Text type="tertiary" size="small" style={{ marginRight: 4, whiteSpace: 'nowrap' }}>
            快捷导航：
          </Text>
          {quickActions.map((action) => (
            <Button
              key={action.path}
              theme="borderless"
              onClick={() => navigate({ to: action.path })}
              style={{ ...cellStyle, fontSize: 12 }}
            >
              {action.label}
            </Button>
          ))}
        </div>

        {/* 状态栏 - Excel 底部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 12px',
            background: '#217346',
            borderRadius: 4,
            color: '#fff',
            fontSize: 11,
            fontFamily: 'Consolas, "Courier New", monospace',
          }}
        >
          <span>就绪</span>
          <div style={{ display: 'flex', gap: 20 }}>
            {stats && (
              <>
                <span>合计: {stats.employees} 人</span>
                <span>在职: {stats.active_employees} 人</span>
                <span>组织层级: {orgRows.length} 级</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Main>
  )
}

// ---- 样式常量 ----

const tableStyle: React.CSSProperties = {
  border: '1px solid var(--semi-color-border)',
  borderRadius: 0,
}

const sheetTabStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 0,
  marginBottom: -1,
  position: 'relative',
  zIndex: 1,
}

const sheetTabActiveStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '5px 16px',
  fontSize: 12,
  fontWeight: 600,
  background: '#fff',
  border: '1px solid var(--semi-color-border)',
  borderBottom: '1px solid #fff',
  borderRadius: '4px 4px 0 0',
  color: 'var(--semi-color-text-0)',
  fontFamily: 'Consolas, "Courier New", monospace',
}

const sheetTabInactiveStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '5px 16px',
  fontSize: 12,
  background: 'var(--semi-color-fill-0)',
  border: '1px solid var(--semi-color-border)',
  borderBottom: '1px solid var(--semi-color-border)',
  borderRadius: '4px 4px 0 0',
  color: 'var(--semi-color-text-2)',
  cursor: 'pointer',
  fontFamily: 'Consolas, "Courier New", monospace',
}
