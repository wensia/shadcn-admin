/**
 * 订单管理页面
 * 使用与线索页面一致的布局结构
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
import { Plus, RefreshCw, Search, ShoppingCart, CheckCircle, CalendarDays, TrendingUp } from 'lucide-react'
import { orderApi } from './api'
import { OrderDialog } from './components/order-dialog'
import { OrdersTable } from './components/orders-table'
import type { Order, OrderListItem, OrderListParams } from './types'
import {
  orderPaymentStatusOptions,
  orderPaymentMethodOptions,
  orderApprovalStatusOptions
} from './types'
import { showApiErrorToast } from '@/lib/api/error-toast'

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
  const [selectedOrders, setSelectedOrders] = useState<OrderListItem[]>([])

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
      showApiErrorToast(error, '删除失败')
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

  // 行点击 - 打开编辑弹窗
  const handleRowClick = (order: OrderListItem) => {
    handleEdit(order.id)
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
  }

  // 分页变化
  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage })
  }

  // 每页条数变化
  const handlePageSizeChange = (newSize: number) => {
    setPagination({ page: 1, size: newSize })
  }

  const orders = ordersData?.items || []
  const total = ordersData?.total || 0

  return (
    <Main fixed className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* 页面标题 - 固定高度 */}
        <div className="flex flex-shrink-0 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">订单管理</h1>
            <p className="text-muted-foreground">管理学员缴费订单</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建订单
          </Button>
        </div>

        {/* 统计卡片 - 紧凑布局 */}
        {statsData && (
          <div className="grid flex-shrink-0 grid-cols-4 gap-3">
            <Card className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">总订单</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">{statsData.total_count}</span>
                    <span className="text-xs text-muted-foreground">¥{statsData.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">已支付</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-green-600">{statsData.paid_count}</span>
                    <span className="text-xs text-muted-foreground">¥{statsData.paid_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">今日</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">{statsData.today_count}</span>
                    <span className="text-xs text-muted-foreground">¥{statsData.today_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">本月</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold">{statsData.month_count}</span>
                    <span className="text-xs text-muted-foreground">¥{statsData.month_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 筛选栏 - 固定高度 */}
        <div className="flex flex-shrink-0 gap-4 items-center">
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
            value={filters.payment_status || 'all'}
            onValueChange={(value) => {
              setFilters({ ...filters, payment_status: value === 'all' ? undefined : value })
              setPagination({ ...pagination, page: 1 })
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="支付状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {orderPaymentStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.payment_method || 'all'}
            onValueChange={(value) => {
              setFilters({ ...filters, payment_method: value === 'all' ? undefined : value })
              setPagination({ ...pagination, page: 1 })
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="支付方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部方式</SelectItem>
              {orderPaymentMethodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.approval_status || 'all'}
            onValueChange={(value) => {
              setFilters({ ...filters, approval_status: value === 'all' ? undefined : value })
              setPagination({ ...pagination, page: 1 })
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="审批状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部审批</SelectItem>
              {orderApprovalStatusOptions.map((option) => (
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

        {/* 数据表格 - 填满剩余空间 */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <OrdersTable
            data={orders}
            total={total}
            page={pagination.page}
            pageSize={pagination.size}
            isLoading={isLoading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            onSelectionChange={setSelectedOrders}
          />
        </div>
      </div>

      {/* 订单弹窗 */}
      <OrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={editingOrder}
        onSuccess={() => {
          refetch()
          queryClient.invalidateQueries({ queryKey: ['order-stats'] })
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
