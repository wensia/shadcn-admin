/**
 * 转化管理主页面 (Semi Design)
 * 统一管理诺到、到访、缴费记录
 */

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import {
  Button,
  Input,
  Tabs,
  TabPane,
  Toast,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconPlus, IconRefresh, IconSearch } from '@douyinfe/semi-icons'
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

const { Title, Text } = Typography

// Tab 选项
type TabValue = 'all' | 'scheduled' | 'visited' | 'payment'

const tabOptions: { value: TabValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'scheduled', label: '诺到' },
  { value: 'visited', label: '到访' },
  { value: 'payment', label: '缴费' },
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
    keyword: searchKeyword || undefined,
  }

  const visitParams: VisitScheduleListParams = {
    page: pagination.page,
    size: pagination.size,
    keyword: searchKeyword || undefined,
    status: activeTab === 'scheduled' ? VisitStatus.SCHEDULED :
            activeTab === 'visited' ? VisitStatus.VISITED : undefined,
  }

  // 获取缴费记录
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', paymentParams],
    queryFn: async () => {
      const response = await paymentApi.getPayments(paymentParams)
      return response.data
    },
    enabled: activeTab === 'all' || activeTab === 'payment',
  })

  // 获取到访记录
  const { data: visitsData, isLoading: visitsLoading } = useQuery({
    queryKey: ['visits', visitParams],
    queryFn: async () => {
      const response = await visitScheduleApi.getVisitSchedules(visitParams)
      return response.data
    },
    enabled: activeTab === 'all' || activeTab === 'scheduled' || activeTab === 'visited',
  })

  // 获取缴费统计
  const { data: paymentStats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: async () => {
      const response = await paymentApi.getStats()
      return response.data
    },
  })

  // 获取到访统计
  const { data: visitStats } = useQuery({
    queryKey: ['visit-stats'],
    queryFn: async () => {
      const response = await visitScheduleApi.getStats()
      return response.data
    },
  })

  // 合并统计数据
  const stats: ConversionStats | undefined = useMemo(() => {
    if (!paymentStats && !visitStats) return undefined
    return {
      scheduled_total: visitStats?.scheduled_count ?? 0,
      scheduled_month: visitStats?.scheduled_count ?? 0,
      visited_total: visitStats?.visited_count ?? 0,
      visited_month: visitStats?.visited_count ?? 0,
      payment_total: paymentStats?.total_count ?? 0,
      payment_month: paymentStats?.month_count ?? 0,
      payment_amount_total: paymentStats?.total_amount ?? 0,
      payment_amount_month: paymentStats?.month_amount ?? 0,
    }
  }, [paymentStats, visitStats])

  // 将数据转换为统一格式
  const tableData = useMemo<ConversionRecord[]>(() => {
    const records: ConversionRecord[] = []

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
          original: payment,
        })
      })
    }

    if (activeTab === 'all' || activeTab === 'scheduled' || activeTab === 'visited') {
      visitsData?.items?.forEach((visit: VisitSchedule) => {
        const type: ConversionType = visit.status === VisitStatus.VISITED ? 'visited' : 'scheduled'
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
          original: visit,
        })
      })
    }

    records.sort((a, b) => new Date(b.record_time).getTime() - new Date(a.record_time).getTime())
    return records
  }, [activeTab, paymentsData, visitsData])

  // 计算总数
  const total = useMemo(() => {
    if (activeTab === 'payment') return paymentsData?.total ?? 0
    if (activeTab === 'scheduled' || activeTab === 'visited') return visitsData?.total ?? 0
    return (paymentsData?.total ?? 0) + (visitsData?.total ?? 0)
  }, [activeTab, paymentsData, visitsData])

  const isLoading = paymentsLoading || visitsLoading

  // 刷新数据
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    queryClient.invalidateQueries({ queryKey: ['visits'] })
    queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
    queryClient.invalidateQueries({ queryKey: ['visit-stats'] })
    Toast.success({ content: '已刷新' })
  }

  // 新建缴费
  const handleCreatePayment = () => {
    setEditingPayment(null)
    setPaymentDialogOpen(true)
  }

  // 查看记录
  const handleView = (record: ConversionRecord) => {
    Toast.info({ content: `查看${record.type === 'payment' ? '缴费' : '到访'}记录` })
  }

  // 编辑记录
  const handleEdit = (record: ConversionRecord) => {
    if (record.type === 'payment') {
      setEditingPayment(record.original as Payment)
      setPaymentDialogOpen(true)
    } else {
      Toast.info({ content: '到访记录编辑功能开发中' })
    }
  }

  // 删除记录
  const handleDelete = async (record: ConversionRecord) => {
    if (!confirm('确定要删除这条记录吗？')) return

    try {
      if (record.type === 'payment') {
        const payment = record.original as Payment
        await paymentApi.deletePayment(payment.id)
        Toast.success({ content: '删除成功' })
        queryClient.invalidateQueries({ queryKey: ['payments'] })
        queryClient.invalidateQueries({ queryKey: ['payment-stats'] })
      } else {
        const visit = record.original as VisitSchedule
        await visitScheduleApi.deleteVisitSchedule(visit.id)
        Toast.success({ content: '删除成功' })
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
        <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          {/* 页面标题 */}
          <div style={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <Title heading={5} style={{ margin: 0 }}>转化管理</Title>
              <Text type="tertiary" style={{ fontSize: 12 }}>管理诺到、到访、缴费记录</Text>
            </div>
            <Button
              theme="solid"
              onClick={handleCreatePayment}
              icon={<IconPlus />}
            >
              添加缴费
            </Button>
          </div>

          {/* 统计卡片 */}
          <div style={{ flexShrink: 0 }}>
            <StatsCards stats={stats} isLoading={!stats} />
          </div>

          {/* 工具栏 */}
          <div style={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            {/* Tabs */}
            <Tabs type="button" activeKey={activeTab} onChange={handleTabChange}>
              {tabOptions.map((tab) => (
                <TabPane tab={tab.label} itemKey={tab.value} key={tab.value} />
              ))}
            </Tabs>

            {/* 搜索和操作 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input
                prefix={<IconSearch />}
                placeholder="搜索学生姓名/手机号"
                value={searchKeyword}
                onChange={(v) => {
                  setSearchKeyword(v)
                  setPagination({ ...pagination, page: 1 })
                }}
                style={{ width: 200 }}
                showClear
              />
              <Button
                icon={<IconRefresh />}
                onClick={handleRefresh}
              />
            </div>
          </div>

          {/* 数据表格 */}
          <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
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
