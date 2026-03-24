/**
 * 待审批订单页面
 * Semi Design 重构版 — DataTableLayout + OrdersTable(SemiDataTable)
 * 包含领导审批和财务确认两个 Tab
 */

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Input,
  Tabs,
  TabPane,
  Tag,
} from '@douyinfe/semi-ui-19'
import { IconSearch } from '@douyinfe/semi-icons'
import { User, DollarSign } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { orderApi } from './api'
import { OrdersTable } from './components/orders-table'
import { ApprovalDialog } from './components/approval-dialog'
import type { OrderListItem, PendingApprovalParams } from './types'

export function PendingApprovalsPage() {
  useDocumentTitle('待审批订单')
  const queryClient = useQueryClient()

  // 查询订单配置（财务审批开关）
  const { data: orderConfig } = useQuery({
    queryKey: ['order-config'],
    queryFn: async () => {
      const response = await orderApi.getOrderConfig()
      return response.data
    }
  })
  const financeEnabled = orderConfig?.finance_approval_enabled ?? false

  // 当前Tab
  const [activeTab, setActiveTab] = useState<string>('leader')

  // 状态
  const [leaderPagination, setLeaderPagination] = useState({ page: 1, size: 20 })
  const [financePagination, setFinancePagination] = useState({ page: 1, size: 20 })
  const [leaderKeyword, setLeaderKeyword] = useState('')
  const [financeKeyword, setFinanceKeyword] = useState('')

  // 审批弹窗状态
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null)

  // 领导审批查询参数
  const leaderQueryParams: PendingApprovalParams = {
    page: leaderPagination.page,
    size: leaderPagination.size,
    keyword: leaderKeyword || undefined
  }

  // 财务确认查询参数
  const financeQueryParams: PendingApprovalParams = {
    page: financePagination.page,
    size: financePagination.size,
    keyword: financeKeyword || undefined
  }

  // 获取待领导审批列表
  const {
    data: leaderData,
    isLoading: isLeaderLoading,
    refetch: refetchLeader
  } = useQuery({
    queryKey: ['pending-leader-approvals', leaderQueryParams],
    queryFn: async () => {
      const response = await orderApi.getPendingLeaderApprovals(leaderQueryParams)
      return response.data
    }
  })

  // 获取待财务确认列表
  const {
    data: financeData,
    isLoading: isFinanceLoading,
    refetch: refetchFinance
  } = useQuery({
    queryKey: ['pending-finance-approvals', financeQueryParams],
    queryFn: async () => {
      const response = await orderApi.getPendingFinanceApprovals(financeQueryParams)
      return response.data
    }
  })

  // 点击行打开审批弹窗
  const handleRowClick = useCallback((order: OrderListItem) => {
    setSelectedOrder(order)
    setApprovalDialogOpen(true)
  }, [])

  // 刷新当前Tab数据
  const handleRefresh = useCallback(() => {
    if (activeTab === 'leader') {
      refetchLeader()
    } else {
      refetchFinance()
    }
  }, [activeTab, refetchLeader, refetchFinance])

  // 审批成功后刷新
  const handleApprovalSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pending-leader-approvals'] })
    queryClient.invalidateQueries({ queryKey: ['pending-finance-approvals'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }, [queryClient])

  const leaderOrders = leaderData?.items || []
  const leaderTotal = leaderData?.total || 0
  const financeOrders = financeData?.items || []
  const financeTotal = financeData?.total || 0

  return (
    <>
      <DataTableLayout
        title="待审批订单"
        total={activeTab === 'leader' ? leaderTotal : financeTotal}
        onRefresh={handleRefresh}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <TabPane
            tab={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} />
                领导审批
                {leaderTotal > 0 && (
                  <Tag style={{ marginLeft: 4 }}>{leaderTotal}</Tag>
                )}
              </span>
            }
            itemKey="leader"
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 12, paddingTop: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 4px' }}>
                <Input
                  prefix={<IconSearch />}
                  placeholder="搜索学员姓名、电话、订单号..."
                  value={leaderKeyword}
                  onChange={(val) => setLeaderKeyword(val)}
                  onEnterPress={() => setLeaderPagination(prev => ({ ...prev, page: 1 }))}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <OrdersTable
                  data={leaderOrders}
                  total={leaderTotal}
                  page={leaderPagination.page}
                  pageSize={leaderPagination.size}
                  isLoading={isLeaderLoading}
                  onPageChange={(page) => setLeaderPagination(prev => ({ ...prev, page }))}
                  onPageSizeChange={(size) => setLeaderPagination({ page: 1, size })}
                  onRowClick={handleRowClick}
                />
              </div>
            </div>
          </TabPane>

          {financeEnabled && (
            <TabPane
              tab={
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DollarSign size={14} />
                  财务确认
                  {financeTotal > 0 && (
                    <Tag style={{ marginLeft: 4 }}>{financeTotal}</Tag>
                  )}
                </span>
              }
              itemKey="finance"
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 12, paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 4px' }}>
                  <Input
                    prefix={<IconSearch />}
                    placeholder="搜索学员姓名、电话、订单号..."
                    value={financeKeyword}
                    onChange={(val) => setFinanceKeyword(val)}
                    onEnterPress={() => setFinancePagination(prev => ({ ...prev, page: 1 }))}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <OrdersTable
                    data={financeOrders}
                    total={financeTotal}
                    page={financePagination.page}
                    pageSize={financePagination.size}
                    isLoading={isFinanceLoading}
                    onPageChange={(page) => setFinancePagination(prev => ({ ...prev, page }))}
                    onPageSizeChange={(size) => setFinancePagination({ page: 1, size })}
                    onRowClick={handleRowClick}
                  />
                </div>
              </div>
            </TabPane>
          )}
        </Tabs>
      </DataTableLayout>

      {/* 审批弹窗 */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        order={selectedOrder}
        approvalType={activeTab as 'leader' | 'finance'}
        onSuccess={handleApprovalSuccess}
      />
    </>
  )
}

export default PendingApprovalsPage
