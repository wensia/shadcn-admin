/**
 * 订单管理页面
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Plus, RefreshCw, Search, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { orderApi } from './api'
import { OrderDialog } from './components/order-dialog'
import type { Order, OrderListItem, OrderListParams } from './types'
import {
  orderPaymentStatusOptions,
  orderPaymentMethodOptions,
  OrderPaymentStatus
} from './types'

// 状态颜色映射
const statusColorMap: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  refunded: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

export function OrdersPage() {
  useDocumentTitle('订单管理')
  const queryClient = useQueryClient()

  // 状态
  const [pagination, setPagination] = useState({ page: 1, size: 20 })
  const [filters, setFilters] = useState<OrderListParams>({})
  const [searchKeyword, setSearchKeyword] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null)

  // 查询参数
  const queryParams: OrderListParams = {
    page: pagination.page,
    size: pagination.size,
    keyword: searchKeyword || undefined,
    ...filters
  }

  // 获取订单列表
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: async () => {
      const response = await orderApi.getOrders(queryParams)
      return response.data
    }
  })

  // 获取订单统计
  const { data: statsData } = useQuery({
    queryKey: ['order-stats'],
    queryFn: async () => {
      const response = await orderApi.getStats()
      return response.data
    }
  })

  // 删除订单
  const deleteMutation = useMutation({
    mutationFn: (id: string) => orderApi.deleteOrder(id),
    onSuccess: () => {
      toast.success('订单删除成功')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-stats'] })
      setDeleteDialogOpen(false)
      setDeletingOrderId(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '删除失败')
    }
  })

  // 打开编辑弹窗
  const handleEdit = async (orderId: string) => {
    try {
      const response = await orderApi.getOrder(orderId)
      if (response.success && response.data) {
        setEditingOrder(response.data)
        setDialogOpen(true)
      }
    } catch (error) {
      toast.error('获取订单详情失败')
    }
  }

  // 打开删除确认
  const handleDeleteClick = (orderId: string) => {
    setDeletingOrderId(orderId)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = () => {
    if (deletingOrderId) {
      deleteMutation.mutate(deletingOrderId)
    }
  }

  // 新建订单
  const handleCreate = () => {
    setEditingOrder(null)
    setDialogOpen(true)
  }

  // 搜索
  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 })
    refetch()
  }

  // 分页
  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage })
  }

  const orders = ordersData?.items || []
  const total = ordersData?.total || 0
  const pages = ordersData?.pages || 0

  return (
    <Main>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">订单管理</h1>
          <p className="text-muted-foreground">管理学员缴费订单</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新建订单
        </Button>
      </div>

      {/* 统计卡片 */}
      {statsData && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总订单数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.total_count}</div>
              <p className="text-xs text-muted-foreground">
                总金额 ¥{statsData.total_amount?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已支付</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statsData.paid_count}</div>
              <p className="text-xs text-muted-foreground">
                金额 ¥{statsData.paid_amount?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日订单</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.today_count}</div>
              <p className="text-xs text-muted-foreground">
                金额 ¥{statsData.today_amount?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本月订单</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData.month_count}</div>
              <p className="text-xs text-muted-foreground">
                金额 ¥{statsData.month_amount?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选栏 */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索学员姓名、电话、订单号..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.payment_status || ''}
              onValueChange={(value) => setFilters({ ...filters, payment_status: value || undefined })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="支付状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部状态</SelectItem>
                {orderPaymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.payment_method || ''}
              onValueChange={(value) => setFilters({ ...filters, payment_method: value || undefined })}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="支付方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部方式</SelectItem>
                {orderPaymentMethodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单编号</TableHead>
                <TableHead>学员信息</TableHead>
                <TableHead className="text-right">订单金额</TableHead>
                <TableHead className="text-right">实付金额</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead>支付状态</TableHead>
                <TableHead>课程数</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    暂无订单数据
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.order_no}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.child_name || '-'}</div>
                        <div className="text-sm text-muted-foreground">{order.parent_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">¥{order.total_amount.toLocaleString()}</span>
                      {order.discount_amount > 0 && (
                        <div className="text-xs text-orange-500">-¥{order.discount_amount}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      ¥{order.actual_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{order.payment_method_display || '-'}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', statusColorMap[order.payment_status] || 'bg-gray-100')}>
                        {order.payment_status_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.items_count} 门课程</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(order.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteClick(order.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                共 {total} 条记录，第 {pagination.page}/{pages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 订单弹窗 */}
      <OrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={editingOrder}
        onSuccess={() => {
          refetch()
          setEditingOrder(null)
        }}
      />

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个订单吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}

export default OrdersPage
