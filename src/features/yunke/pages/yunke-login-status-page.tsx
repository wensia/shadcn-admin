/**
 * 云客登录状态页面 - Semi Design
 */

import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Phone,
  Clock,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Table, Button, Card, Tag, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { yunkeApi } from '../api'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

export function YunkeLoginStatusPage() {
  // 检查登录状态
  const checkLoginStatusMutation = useMutation({
    mutationFn: () => yunkeApi.checkAllLoginStatus(),
    onSuccess: (data) => {
      toast.info(`检查完成：${data.logged_in}/${data.total} 个账号已登录`)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '检查登录状态失败')
    },
  })

  // 批量更新登录
  const batchLoginMutation = useMutation({
    mutationFn: () => yunkeApi.batchUpdateLogin(),
    onSuccess: (data) => {
      if (data.success > 0) {
        toast.success(`成功更新 ${data.success} 个账号的登录状态`)
      }
      if (data.failed > 0) {
        toast.warning(`${data.failed} 个账号更新失败`)
      }
      if (data.skipped > 0) {
        toast.info(`${data.skipped} 个账号被跳过`)
      }
      // 重新检查状态
      setTimeout(() => checkLoginStatusMutation.mutate(), 1000)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '批量更新失败')
    },
  })

  const statusData = checkLoginStatusMutation.data
  const isLoading = checkLoginStatusMutation.isPending
  const hasData = statusData && statusData.details.length > 0

  // 详情表格列定义
  const detailColumns: ColumnProps[] = [
    {
      title: '员工',
      dataIndex: 'employee_name',
      width: 160,
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
          <span style={{ fontWeight: 500 }}>{text}</span>
        </div>
      ),
    },
    {
      title: '云客账号',
      dataIndex: 'yunke_phone',
      width: 160,
      render: (text: string) => {
        if (text) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
              <Phone style={{ width: 12, height: 12 }} />
              {text}
            </div>
          )
        }
        return <Text type="tertiary">未绑定</Text>
      },
    },
    {
      title: '登录状态',
      dataIndex: 'is_logged_in',
      width: 120,
      render: (isLoggedIn: boolean) => (
        <Tag
          color={isLoggedIn ? 'green' : 'red'}
          type="light"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          {isLoggedIn ? (
            <><CheckCircle style={{ width: 12, height: 12 }} /> 已登录</>
          ) : (
            <><XCircle style={{ width: 12, height: 12 }} /> 未登录</>
          )}
        </Tag>
      ),
    },
    {
      title: '检查时间',
      dataIndex: 'check_time',
      width: 180,
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--semi-color-text-2)' }}>
          <Clock style={{ width: 12, height: 12 }} />
          {formatTime(text)}
        </div>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      render: (text: string) => (
        <Text type="tertiary" size="small">{text}</Text>
      ),
    },
  ]

  // 骨架屏数据
  const skeletonData = Array.from({ length: 5 }, (_, i) => ({
    employee_id: `__skeleton__${i}`,
    employee_name: '',
    yunke_phone: '',
    is_logged_in: false,
    check_time: '',
    message: '',
  }))

  const skeletonColumns: ColumnProps[] = detailColumns.map(col => ({
    ...col,
    render: () => <Skeleton.Paragraph rows={1} style={{ width: col.width ? Number(col.width) * 0.6 : 80 }} />,
  }))

  return (
    <DataTableLayout
      title="登录状态管理"
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            theme="outline"
            onClick={() => checkLoginStatusMutation.mutate()}
            disabled={isLoading}
            loading={isLoading}
            icon={isLoading ? undefined : <CheckCircle style={{ width: 16, height: 16 }} />}
          >
            {isLoading ? '检查中...' : '检查登录状态'}
          </Button>
          <Button
            onClick={() => batchLoginMutation.mutate()}
            disabled={batchLoginMutation.isPending}
            loading={batchLoginMutation.isPending}
            icon={batchLoginMutation.isPending ? undefined : <RefreshCw style={{ width: 16, height: 16 }} />}
          >
            {batchLoginMutation.isPending ? '更新中...' : '一键更新登录'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16, overflow: 'auto', flex: 1 }}>
        {/* 统计卡片 */}
        {statusData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Card bodyStyle={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary" size="small" style={{ fontWeight: 500 }}>总账号数</Text>
                <User style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{statusData.total}</div>
            </Card>
            <Card bodyStyle={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary" size="small" style={{ fontWeight: 500 }}>已登录</Text>
                <CheckCircle style={{ width: 16, height: 16, color: 'var(--semi-color-success)' }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--semi-color-success)' }}>{statusData.logged_in}</div>
            </Card>
            <Card bodyStyle={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary" size="small" style={{ fontWeight: 500 }}>未登录</Text>
                <XCircle style={{ width: 16, height: 16, color: 'var(--semi-color-danger)' }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--semi-color-danger)' }}>{statusData.not_logged_in}</div>
            </Card>
          </div>
        )}

        {/* 状态表格 */}
        <Card
          title="登录状态详情"
          headerExtraContent={
            <Text type="tertiary" size="small">
              {hasData ? `共 ${statusData.total} 个账号` : '点击"检查登录状态"按钮开始检查'}
            </Text>
          }
        >
          {!hasData && !isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: 'var(--semi-color-text-2)' }}>
              <CheckCircle style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.5 }} />
              <p>点击上方按钮检查所有员工的云客登录状态</p>
            </div>
          ) : isLoading ? (
            <Table
              columns={skeletonColumns}
              dataSource={skeletonData}
              rowKey="employee_id"
              pagination={false}
            />
          ) : (
            <Table
              columns={detailColumns}
              dataSource={statusData?.details || []}
              rowKey="employee_id"
              pagination={false}
            />
          )}
        </Card>
      </div>
    </DataTableLayout>
  )
}
