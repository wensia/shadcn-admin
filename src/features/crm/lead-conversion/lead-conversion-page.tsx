/**
 * 转化管理主页面
 * 统一管理诺到、到访、缴费记录
 */

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, RefreshCw, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatsCards } from './components/stats-cards'
import { ConversionTable, type ConversionRecord } from './components/conversion-table'
import { PaymentDialog } from './components/payment-dialog'
import { paymentApi, visitScheduleApi } from './api'
import type {
  Payment,
  VisitSchedule,
  ConversionType,
  ConversionStats,
  PaymentListParams,
  VisitScheduleListParams
} from './types'
import { VisitStatus, visitStatusLabels, paymentStatusLabels, paymentMethodLabels, paymentTypeLabels } from './types'
import { showApiErrorToast } from '@/lib/api/error-toast'

// Tab 选项
type TabValue = 'all' | 'scheduled' | 'visited' | 'payment'

const tabOptions: { value: TabValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'scheduled', label: '诺到' },
  { value: 'visited', label: '到访' },
  { value: 'payment', label: '缴费' }
]

export function LeadConversionPage() {
  useDocumentTitle('转化管理')
  const queryClient = useQueryClient()

  // 状态
  const [activeTab, setActiveTab] = useState<TabValue>('all')
  const [pagination, setPagination] = useState({ page: 1, size: 20 })
  const [searchKeyword, setSearchKeyword] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  // 构建查询参数
  const paymentParams: PaymentListParams = {
    page: pagination.page,
    size: pagination.size,
    keyword: searchKeyword || undefined
  }

  const visitParams: VisitScheduleListParams = {
    page: pagination.page,
    size: pagination.size,
    keyword: searchKeyword || undefined,
    status: activeTab === 'scheduled' ? VisitStatus.SCHEDULED :
            activeTab === 'visited' ? VisitStatus.VISITED : undefined
  }

  // 获取缴费记录
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', paymentParams],
    queryFn: async () => {
      const response = await paymentApi.getPayments(paymentParams)
      return response.data
    },
    enabled: activeTab === 'all' || activeTab === 'payment'
  })

  // 获取到访记录
  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ['visits', visitParams],
    queryFn: async () => {
      const response = await visitScheduleApi.getVisitSchedules(visitParams)
      return response.data
    },
    enabled: activeTab === 'all' || activeTab === 'scheduled' || activeTab === 'visited'
  })

  // 获取缴费统计
  const { data: paymentStats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const response = await paymentApi.getStats()
      return response.data
    }
  })

  // 获取到访统计
  const { data: visitStats } = useQuery({
    queryKey: ['visit-stats'],
    queryFn: async () => {
      const response = await visitScheduleApi.getStats()
      return response.data
    }
  })

  // 合并统计数据
  const stats: ConversionStats | undefined = useMemo(() => {
    if (!paymentStats && !visitStats) return undefined
    return {
      scheduled_total: visitStats?.scheduled_count ?? 0,
      scheduled_month: visitStats?.scheduled_count ?? 0, // TODO: 后端添加月度统计
      visited_total: visitStats?.visited_count ?? 0,
      visited_month: visitStats?.visited_count ?? 0,
      payment_total: paymentStats?.total_count ?? 0,
      payment_month: paymentStats?.month_count ?? 0,
      payment_amount_total: paymentStats?.total_amount ?? 0,
      payment_amount_month: paymentStats?.month_amount ?? 0
    }
  }, [paymentStats, visitStats])

  // 将数据转换为统一格式
  const tableData = useMemo<ConversionRecord[]>(() => {
    const records: ConversionRecord[] = []

    // 添加缴费记录
    if (activeTab === 'all' || activeTab === 'payment') {
      paymentsData?.items?.forEach((payment: Payment) => {
        records.push({
          id: `payment-${payment.id}`,
          type: 'payment' as ConversionType,
          lead_id: payment.lead_id,
          child_name: payment.child_name,
          parent_phone: payment.parent_phone,
          record_time: payment.payment_at,
          status: payment.status,
          status_display: payment.status_display || paymentStatusLabels[payment.status as keyof typeof paymentStatusLabels] || payment.status,
          amount: payment.amount,
          payment_method_display: payment.payment_method_display || paymentMethodLabels[payment.payment_method as keyof typeof paymentMethodLabels],
          payment_type_display: payment.payment_type_display || paymentTypeLabels[payment.payment_type as keyof typeof paymentTypeLabels],
          campus_name: payment.campus_name,
          remark: payment.remark,
          created_at: payment.created_at,
          created_by_name: payment.created_by_name,
          original: payment
        })
      })
    }

    // 添加到访记录
    if (activeTab === 'all' || activeTab === 'scheduled' || activeTab === 'visited') {
      visitsData?.items?.forEach((visit: VisitSchedule) => {
        // 根据状态判断类型
        const type: ConversionType = visit.status === VisitStatus.VISITED ? 'visited' : 'scheduled'

        // 如果是特定 tab，只显示对应类型
        if (activeTab === 'scheduled' && type !== 'scheduled') return
        if (activeTab === 'visited' && type !== 'visited') return

        records.push({
          id: `visit-${visit.id}`,
          type,
          lead_id: visit.lead_id,
          child_name: visit.child_name,
          parent_phone: visit.parent_phone,
          record_time: visit.actual_visit_at || visit.scheduled_at,
          status: visit.status,
          status_display: visit.status_display || visitStatusLabels[visit.status as keyof typeof visitStatusLabels] || visit.status,
          campus_name: visit.campus_name,
          remark: visit.remark,
          created_at: visit.created_at,
          created_by_name: visit.created_by_name,
          original: visit
        })
      })
    }

    // 按时间倒序排序
    records.sort((a, b) => new Date(b.record_time).getTime() - new Date(a.record_time).getTime())

    return records
  }, [activeTab, paymentsData, visitsData])

  // 计算总数
  const total = useMemo(() => {
    if (activeTab === 'payment') {
      return paymentsData?.total ?? 0
    } else if (activeTab === 'scheduled' || activeTab === 'visited') {
      return visitsData?.total ?? 0
    }
    return (paymentsData?.total ?? 0) + (visitsData?.total ?? 0)
  }, [activeTab, paymentsData, visitsData])

  const isLoading = paymentsLoading || visitsLoading

  // 刷新数据
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    queryClient.invalidateQueries({ queryKey: ['visits'] })
    queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
    queryClient.invalidateQueries({ queryKey: ['visit-stats'] })
    toast.success('已刷新')
  }

  // 新建缴费
  const handleCreatePayment = () => {
    setEditingPayment(null)
    setPaymentDialogOpen(true)
  }

  // 查看记录
  const handleView = (record: ConversionRecord) => {
    // TODO: 实现查看详情
    toast.info(`查看${record.type === 'payment' ? '缴费' : '到访'}记录`)
  }

  // 编辑记录
  const handleEdit = (record: ConversionRecord) => {
    if (record.type === 'payment') {
      setEditingPayment(record.original as Payment)
      setPaymentDialogOpen(true)
    } else {
      // TODO: 实现到访记录编辑
      toast.info('到访记录编辑功能开发中')
    }
  }

  // 删除记录
  const handleDelete = async (record: ConversionRecord) => {
    if (!confirm('确定要删除这条记录吗？')) return

    try {
      if (record.type === 'payment') {
        const payment = record.original as Payment
        await paymentApi.deletePayment(payment.id)
        toast.success('删除成功')
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      } else {
        const visit = record.original as VisitSchedule
        await visitScheduleApi.deleteVisitSchedule(visit.id)
        toast.success('删除成功')
        queryClient.invalidateQueries({ queryKey: ['visits'] })
        queryClient.invalidateQueries({ queryKey: ['visit-stats'] })
      }
    } catch (error: any) {
      showApiErrorToast(error, '删除失败')
    }
  }

  // Tab 切换
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue)
    setPagination({ page: 1, size: pagination.size })
  }

  return (
    <>
      <Main fixed className="min-h-0">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          {/* 页面标题 */}
          <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold tracking-tight">转化管理</h1>
              <p className="text-xs text-muted-foreground">管理诺到、到访、缴费记录</p>
            </div>
            <Button onClick={handleCreatePayment} size="sm" className="h-8">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              添加缴费
            </Button>
          </div>

          {/* 统计卡片 */}
          <div className="flex-shrink-0">
            <StatsCards stats={stats} isLoading={!stats} />
          </div>

          {/* 工具栏 */}
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                {tabOptions.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* 搜索和操作 */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索学生姓名/手机号"
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value)
                    setPagination({ ...pagination, page: 1 })
                  }}
                  className="pl-9 w-[200px] h-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 数据表格 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ConversionTable
              data={tableData}
              total={total}
              page={pagination.page}
              pageSize={pagination.size}
              isLoading={isLoading}
              onPageChange={(page) => setPagination({ ...pagination, page })}
              onPageSizeChange={(size) => setPagination({ page: 1, size })}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </Main>

      {/* 缴费弹窗 */}
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        payment={editingPayment}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['payments'] })
          queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
        }}
      />
    </>
  )
}
