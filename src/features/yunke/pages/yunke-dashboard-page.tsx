/**
 * 云客管理仪表盘页面 - Semi Design
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Users,
  UserCheck,
  PhoneCall,
  Clock,
  RefreshCw,
  LogIn,
  Activity,
  CheckCircle,
  XCircle,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Main } from '@/components/layout/main'
import { Button, Card, Tag, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import { yunkeApi } from '../api'

const { Text, Title } = Typography

export function YunkeDashboardPage() {
  const queryClient = useQueryClient()

  // 获取管理员状态
  const { data: adminStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['yunke-admin-status'],
    queryFn: () => yunkeApi.getStatus(),
  })

  // 获取子账号列表统计
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['yunke-sub-accounts-stats'],
    queryFn: () => yunkeApi.getSubAccounts({ page: 1, page_size: 1 }),
  })

  // 检查登录状态
  const checkStatusMutation = useMutation({
    mutationFn: () => yunkeApi.checkAllLoginStatus(),
    onSuccess: (data) => {
      toast.info(`检查完成：${data.logged_in}/${data.total} 个账号已登录`)
      queryClient.invalidateQueries({ queryKey: ['yunke-admin-status'] })
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
      queryClient.invalidateQueries({ queryKey: ['yunke-admin-status'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '批量更新失败')
    },
  })

  // 自动同步绑定
  const autoSyncMutation = useMutation({
    mutationFn: () => yunkeApi.autoSyncBindings(),
    onSuccess: (data) => {
      if (data.matched > 0) {
        toast.success(`同步完成：成功匹配并绑定 ${data.matched}/${data.total} 个账号`)
      } else {
        toast.info('未找到可匹配的账号')
      }
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts-stats'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '同步失败')
    },
  })

  const isLoading = statusLoading || accountsLoading

  return (
    <Main fixed>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* 标题栏 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>云客管理中心</h1>
            <Text type="tertiary" size="small">云客外呼系统集成管理</Text>
          </div>
          <Tag
            color={adminStatus?.logged_in ? 'green' : 'red'}
            type="light"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            {adminStatus?.logged_in ? (
              <><CheckCircle style={{ width: 12, height: 12 }} /> 管理员已登录</>
            ) : (
              <><XCircle style={{ width: 12, height: 12 }} /> 管理员未登录</>
            )}
          </Tag>
        </div>

        {/* 统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary" size="small" style={{ fontWeight: 500 }}>子账号总数</Text>
              <Users style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
            </div>
            {isLoading ? (
              <Skeleton.Paragraph rows={1} style={{ width: 64, height: 32 }} />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 700 }}>{accountsData?.total || 0}</div>
            )}
            <Text type="tertiary" size="small">云客系统子账号</Text>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary" size="small" style={{ fontWeight: 500 }}>管理员状态</Text>
              <Activity style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
            </div>
            {statusLoading ? (
              <Skeleton.Paragraph rows={1} style={{ width: 96, height: 32 }} />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {adminStatus?.logged_in ? '已登录' : '未登录'}
              </div>
            )}
            <Text type="tertiary" size="small">
              {adminStatus?.cookies_count ? `${adminStatus.cookies_count} 个 cookies` : '需要登录'}
            </Text>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary" size="small" style={{ fontWeight: 500 }}>今日外呼</Text>
              <PhoneCall style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>--</div>
            <Text type="tertiary" size="small">功能开发中</Text>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary" size="small" style={{ fontWeight: 500 }}>通话时长</Text>
              <Clock style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>--</div>
            <Text type="tertiary" size="small">功能开发中</Text>
          </Card>
        </div>

        {/* 快捷操作 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          <Card bodyStyle={{ padding: 20 }} style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Users style={{ width: 20, height: 20, color: 'var(--semi-color-primary)' }} />
              <Text strong style={{ fontSize: 15 }}>子账号管理</Text>
            </div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>管理云客子账号、绑定员工、重置密码</Text>
            <Link to="/yunke/accounts">
              <Button block>
                进入管理 <ArrowRight style={{ width: 16, height: 16, marginLeft: 8 }} />
              </Button>
            </Link>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <UserCheck style={{ width: 20, height: 20, color: 'var(--semi-color-success)' }} />
              <Text strong style={{ fontSize: 15 }}>登录状态检查</Text>
            </div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>检查所有员工的云客登录状态</Text>
            <Button
              theme="outline"
              block
              onClick={() => checkStatusMutation.mutate()}
              disabled={checkStatusMutation.isPending}
              loading={checkStatusMutation.isPending}
            >
              {checkStatusMutation.isPending ? '检查中...' : (
                <><CheckCircle style={{ width: 16, height: 16, marginRight: 8 }} /> 开始检查</>
              )}
            </Button>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <RefreshCw style={{ width: 20, height: 20, color: 'orange' }} />
              <Text strong style={{ fontSize: 15 }}>批量更新登录</Text>
            </div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>为所有已绑定员工更新云客登录状态</Text>
            <Button
              theme="outline"
              block
              onClick={() => batchLoginMutation.mutate()}
              disabled={batchLoginMutation.isPending}
              loading={batchLoginMutation.isPending}
            >
              {batchLoginMutation.isPending ? '更新中...' : (
                <><LogIn style={{ width: 16, height: 16, marginRight: 8 }} /> 一键更新</>
              )}
            </Button>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Zap style={{ width: 20, height: 20, color: 'purple' }} />
              <Text strong style={{ fontSize: 15 }}>自动同步绑定</Text>
            </div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>根据姓名自动匹配云客账号与员工</Text>
            <Button
              theme="outline"
              block
              onClick={() => autoSyncMutation.mutate()}
              disabled={autoSyncMutation.isPending}
              loading={autoSyncMutation.isPending}
            >
              {autoSyncMutation.isPending ? '同步中...' : (
                <><Zap style={{ width: 16, height: 16, marginRight: 8 }} /> 一键同步</>
              )}
            </Button>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <PhoneCall style={{ width: 20, height: 20, color: 'cyan' }} />
              <Text strong style={{ fontSize: 15 }}>通话记录</Text>
            </div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>查看云客通话记录和录音</Text>
            <Link to="/yunke/call-records">
              <Button theme="outline" block>
                查看记录 <ArrowRight style={{ width: 16, height: 16, marginLeft: 8 }} />
              </Button>
            </Link>
          </Card>

          <Card bodyStyle={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <LogIn style={{ width: 20, height: 20, color: 'red' }} />
              <Text strong style={{ fontSize: 15 }}>管理员登录</Text>
            </div>
            <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>登录云客管理员账号以启用功能</Text>
            <Link to="/yunke/admin-login">
              <Button theme="outline" block>
                去登录 <ArrowRight style={{ width: 16, height: 16, marginLeft: 8 }} />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </Main>
  )
}
