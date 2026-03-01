/**
 * 待审批订单页面
 * Semi Design 重构版 - 包含领导审批和财务确认两个Tab
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Tabs,
  TabPane,
  Tag,
  Typography,
} from '@douyinfe/semi-ui-19'
import { IconRefresh, IconSearch } from '@douyinfe/semi-icons'
import { User, DollarSign, ClipboardList } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { orderApi } from './api'
import { OrdersTable } from './components/orders-table'
import { ApprovalDialog } from './components/approval-dialog'
import type { OrderListItem, PendingApprovalParams } from './types'

const { Title: SemiTitle, Text } = Typography

export function PendingApprovalsPage() {
  useDocumentTitle('待审批订单')
  const queryClient = useQueryClient()

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
  const handleRowClick = (order: OrderListItem) => {
    setSelectedOrder(order)
    setApprovalDialogOpen(true)
  }

  // 刷新当前Tab数据
  const handleRefresh = () => {
    if (activeTab === 'leader') {
      refetchLeader()
    } else {
      refetchFinance()
    }
  }

  // 审批成功后刷新
  const handleApprovalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-leader-approvals'] })
    queryClient.invalidateQueries({ queryKey: ['pending-finance-approvals'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  const leaderOrders = leaderData?.items || []
  const leaderTotal = leaderData?.total || 0
  const financeOrders = financeData?.items || []
  const financeTotal = financeData?.total || 0

  return (
    <Main fixed style={{ minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16, overflow: 'hidden' }}>
        {/* 页面标题 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <SemiTitle heading={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={24} />
              待审批订单
            </SemiTitle>
            <Text type="tertiary">审核订单并决定是否通过</Text>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          tabBarExtraContent={
            <Button icon={<IconRefresh />} onClick={handleRefresh} />
          }
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
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16, paddingTop: 16 }}>
              {/* 搜索栏 */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Input
                  prefix={<IconSearch />}
                  placeholder="搜索学员姓名、电话、订单号..."
                  value={leaderKeyword}
                  onChange={(val) => setLeaderKeyword(val)}
                  onEnterPress={() => setLeaderPagination({ ...leaderPagination, page: 1 })}
                  style={{ flex: 1 }}
                />
              </div>
              {/* 表格 */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <OrdersTable
                  data={leaderOrders}
                  total={leaderTotal}
                  page={leaderPagination.page}
                  pageSize={leaderPagination.size}
                  isLoading={isLeaderLoading}
                  onPageChange={(page) => setLeaderPagination({ ...leaderPagination, page })}
                  onPageSizeChange={(size) => setLeaderPagination({ page: 1, size })}
                  onRowClick={handleRowClick}
                />
              </div>
            </div>
          </TabPane>

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
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16, paddingTop: 16 }}>
              {/* 搜索栏 */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Input
                  prefix={<IconSearch />}
                  placeholder="搜索学员姓名、电话、订单号..."
                  value={financeKeyword}
                  onChange={(val) => setFinanceKeyword(val)}
                  onEnterPress={() => setFinancePagination({ ...financePagination, page: 1 })}
                  style={{ flex: 1 }}
                />
              </div>
              {/* 表格 */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <OrdersTable
                  data={financeOrders}
                  total={financeTotal}
                  page={financePagination.page}
                  pageSize={financePagination.size}
                  isLoading={isFinanceLoading}
                  onPageChange={(page) => setFinancePagination({ ...financePagination, page })}
                  onPageSizeChange={(size) => setFinancePagination({ page: 1, size })}
                  onRowClick={handleRowClick}
                />
              </div>
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* 审批弹窗 */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        order={selectedOrder}
        approvalType={activeTab as 'leader' | 'finance'}
        onSuccess={handleApprovalSuccess}
      />
    </Main>
  )
}

export default PendingApprovalsPage
