/**
 * 云客管理仪表盘页面
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

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { yunkeApi } from '../api'

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
      toast.error(error.message || '检查登录状态失败')
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
      toast.error(error.message || '批量更新失败')
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
      toast.error(error.message || '同步失败')
    },
  })

  const isLoading = statusLoading || accountsLoading

  return (
    <Main fixed>
      <div className="flex flex-col gap-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">云客管理中心</h1>
            <p className="text-sm text-muted-foreground">
              云客外呼系统集成管理
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={adminStatus?.logged_in ? 'default' : 'destructive'}
              className="gap-1"
            >
              {adminStatus?.logged_in ? (
                <><CheckCircle className="h-3 w-3" /> 管理员已登录</>
              ) : (
                <><XCircle className="h-3 w-3" /> 管理员未登录</>
              )}
            </Badge>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">子账号总数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{accountsData?.total || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">云客系统子账号</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">管理员状态</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {adminStatus?.logged_in ? '已登录' : '未登录'}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {adminStatus?.cookies_count ? `${adminStatus.cookies_count} 个 cookies` : '需要登录'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日外呼</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">功能开发中</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">通话时长</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">功能开发中</p>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                子账号管理
              </CardTitle>
              <CardDescription>管理云客子账号、绑定员工、重置密码</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/yunke/accounts">
                  进入管理 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                登录状态检查
              </CardTitle>
              <CardDescription>检查所有员工的云客登录状态</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => checkStatusMutation.mutate()}
                disabled={checkStatusMutation.isPending}
              >
                {checkStatusMutation.isPending ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 检查中...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" /> 开始检查</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-500" />
                批量更新登录
              </CardTitle>
              <CardDescription>为所有已绑定员工更新云客登录状态</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => batchLoginMutation.mutate()}
                disabled={batchLoginMutation.isPending}
              >
                {batchLoginMutation.isPending ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 更新中...</>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> 一键更新</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                自动同步绑定
              </CardTitle>
              <CardDescription>根据姓名自动匹配云客账号与员工</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => autoSyncMutation.mutate()}
                disabled={autoSyncMutation.isPending}
              >
                {autoSyncMutation.isPending ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 同步中...</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> 一键同步</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-cyan-500" />
                通话记录
              </CardTitle>
              <CardDescription>查看云客通话记录和录音</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/yunke/call-records">
                  查看记录 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-red-500" />
                管理员登录
              </CardTitle>
              <CardDescription>登录云客管理员账号以启用功能</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/yunke/admin-login">
                  去登录 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Main>
  )
}
