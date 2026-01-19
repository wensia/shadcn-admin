/**
 * 云客登录状态页面
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Phone,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { yunkeApi } from '../api'
import { formatTime } from '@/lib/utils/time'

export function YunkeLoginStatusPage() {
  // 检查登录状态
  const checkLoginStatusMutation = useMutation({
    mutationFn: () => yunkeApi.checkAllLoginStatus(),
    onSuccess: (data) => {
      toast.info(`检查完成：${data.logged_in}/${data.total} 个账号已登录`)
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
      if (data.skipped > 0) {
        toast.info(`${data.skipped} 个账号被跳过`)
      }
      // 重新检查状态
      setTimeout(() => checkLoginStatusMutation.mutate(), 1000)
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量更新失败')
    },
  })

  const statusData = checkLoginStatusMutation.data
  const isLoading = checkLoginStatusMutation.isPending
  const hasData = statusData && statusData.details.length > 0

  return (
    <Main fixed>
      <div className="flex flex-col gap-6">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">登录状态管理</h1>
            <p className="text-sm text-muted-foreground">
              检查和管理员工的云客登录状态
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => checkLoginStatusMutation.mutate()}
              disabled={isLoading}
            >
              {isLoading ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 检查中...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" /> 检查登录状态</>
              )}
            </Button>
            <Button
              onClick={() => batchLoginMutation.mutate()}
              disabled={batchLoginMutation.isPending}
            >
              {batchLoginMutation.isPending ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 更新中...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> 一键更新登录</>
              )}
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        {statusData && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总账号数</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusData.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已登录</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statusData.logged_in}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">未登录</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statusData.not_logged_in}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 状态表格 */}
        <Card>
          <CardHeader>
            <CardTitle>登录状态详情</CardTitle>
            <CardDescription>
              {hasData ? `共 ${statusData.total} 个账号` : '点击"检查登录状态"按钮开始检查'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasData && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
                <p>点击上方按钮检查所有员工的云客登录状态</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>员工</TableHead>
                      <TableHead>云客账号</TableHead>
                      <TableHead>登录状态</TableHead>
                      <TableHead>检查时间</TableHead>
                      <TableHead>消息</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        </TableRow>
                      ))
                    ) : statusData?.details.map((detail) => (
                      <TableRow key={detail.employee_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{detail.employee_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {detail.yunke_phone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {detail.yunke_phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">未绑定</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={detail.is_logged_in ? 'default' : 'destructive'} className="gap-1">
                            {detail.is_logged_in ? (
                              <><CheckCircle className="h-3 w-3" /> 已登录</>
                            ) : (
                              <><XCircle className="h-3 w-3" /> 未登录</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(detail.check_time)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{detail.message}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
