/**
 * 订单管理页面
 * Semi Design 重构版
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Select,
  Card,
  Modal,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh, IconSearch } from '@douyinfe/semi-icons'
import { ShoppingCart, CheckCircle, CalendarDays, TrendingUp } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
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

const { Title: SemiTitle, Text } = Typography

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
      Toast.success('订单删除成功')
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
    } catch {
      Toast.error('获取订单详情失败')
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

  // 筛选选项：加上"全部"
  const paymentStatusOpts = [
    { value: 'all', label: '全部状态' },
    ...orderPaymentStatusOptions
  ]
  const paymentMethodOpts = [
    { value: 'all', label: '全部方式' },
    ...orderPaymentMethodOptions
  ]
  const approvalStatusOpts = [
    { value: 'all', label: '全部审批' },
    ...orderApprovalStatusOptions
  ]

  return (
    <Main fixed style={{ minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16, overflow: 'hidden' }}>
        {/* 页面标题 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <SemiTitle heading={4} style={{ margin: 0 }}>订单管理</SemiTitle>
            <Text type="tertiary">管理学员缴费订单</Text>
          </div>
          <Button icon={<IconPlus />} theme="solid" onClick={handleCreate}>
            新建订单
          </Button>
        </div>

        {/* 统计卡片 */}
        {statsData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flexShrink: 0 }}>
            <Card style={{ padding: '12px 16px' }} bodyStyle={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--semi-color-primary-light-default)',
                  color: 'var(--semi-color-primary)',
                }}>
                  <ShoppingCart size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text type="tertiary" style={{ fontSize: 12 }}>总订单</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <Text strong style={{ fontSize: 18 }}>{statsData.total_count}</Text>
                    <Text type="tertiary" style={{ fontSize: 12 }}>¥{statsData.total_amount?.toLocaleString()}</Text>
                  </div>
                </div>
              </div>
            </Card>
            <Card style={{ padding: '12px 16px' }} bodyStyle={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--semi-color-success-light-default)',
                  color: 'var(--semi-color-success)',
                }}>
                  <CheckCircle size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text type="tertiary" style={{ fontSize: 12 }}>已支付</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <Text strong style={{ fontSize: 18, color: 'var(--semi-color-success)' }}>{statsData.paid_count}</Text>
                    <Text type="tertiary" style={{ fontSize: 12 }}>¥{statsData.paid_amount?.toLocaleString()}</Text>
                  </div>
                </div>
              </div>
            </Card>
            <Card style={{ padding: '12px 16px' }} bodyStyle={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--semi-color-warning-light-default)',
                  color: 'var(--semi-color-warning)',
                }}>
                  <CalendarDays size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text type="tertiary" style={{ fontSize: 12 }}>今日</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <Text strong style={{ fontSize: 18 }}>{statsData.today_count}</Text>
                    <Text type="tertiary" style={{ fontSize: 12 }}>¥{statsData.today_amount?.toLocaleString()}</Text>
                  </div>
                </div>
              </div>
            </Card>
            <Card style={{ padding: '12px 16px' }} bodyStyle={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                }}>
                  <TrendingUp size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text type="tertiary" style={{ fontSize: 12 }}>本月</Text>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <Text strong style={{ fontSize: 18 }}>{statsData.month_count}</Text>
                    <Text type="tertiary" style={{ fontSize: 12 }}>¥{statsData.month_amount?.toLocaleString()}</Text>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 筛选栏 */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <Input
            prefix={<IconSearch />}
            placeholder="搜索学员姓名、电话、订单号..."
            value={searchKeyword}
            onChange={(val) => setSearchKeyword(val)}
            onEnterPress={handleSearch}
            style={{ flex: 1 }}
          />
          <Select
            value={filters.payment_status || 'all'}
            onChange={(value) => {
              setFilters({ ...filters, payment_status: value === 'all' ? undefined : value as string })
              setPagination({ ...pagination, page: 1 })
            }}
            optionList={paymentStatusOpts}
            style={{ width: 130 }}
          />
          <Select
            value={filters.payment_method || 'all'}
            onChange={(value) => {
              setFilters({ ...filters, payment_method: value === 'all' ? undefined : value as string })
              setPagination({ ...pagination, page: 1 })
            }}
            optionList={paymentMethodOpts}
            style={{ width: 130 }}
          />
          <Select
            value={filters.approval_status || 'all'}
            onChange={(value) => {
              setFilters({ ...filters, approval_status: value === 'all' ? undefined : value as string })
              setPagination({ ...pagination, page: 1 })
            }}
            optionList={approvalStatusOpts}
            style={{ width: 140 }}
          />
          <Button icon={<IconRefresh />} onClick={() => refetch()} />
        </div>

        {/* 数据表格 */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onOk={handleConfirmDelete}
        okType="danger"
        okText="删除"
        cancelText="取消"
        confirmLoading={deleteMutation.isPending}
      >
        确定要删除这个订单吗？此操作不可撤销。
      </Modal>
    </Main>
  )
}

export default OrdersPage
