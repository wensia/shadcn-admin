/**
 * 待审批订单页面
 * 包含领导审批和财务确认两个Tab
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Search, User, DollarSign, ClipboardList } from 'lucide-react'
import { orderApi } from './api'
import { OrdersTable } from './components/orders-table'
import { ApprovalDialog } from './components/approval-dialog'
import type { OrderListItem, PendingApprovalParams } from './types'

export function PendingApprovalsPage() {
  useDocumentTitle('待审批订单')
  const queryClient = useQueryClient()

  // 当前Tab
  const [activeTab, setActiveTab] = useState<'leader' | 'finance'>('leader')

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
    <Main fixed className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* 页面标题 */}
        <div className="flex flex-shrink-0 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              待审批订单
            </h1>
            <p className="text-muted-foreground">审核订单并决定是否通过</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'leader' | 'finance')}
          className="flex flex-1 flex-col min-h-0"
        >
          <div className="flex items-center justify-between flex-shrink-0">
            <TabsList>
              <TabsTrigger value="leader" className="gap-2">
                <User className="h-4 w-4" />
                领导审批
                {leaderTotal > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {leaderTotal}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="finance" className="gap-2">
                <DollarSign className="h-4 w-4" />
                财务确认
                {financeTotal > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {financeTotal}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* 领导审批Tab */}
          <TabsContent value="leader" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* 搜索栏 */}
            <div className="flex gap-4 items-center mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索学员姓名、电话、订单号..."
                  value={leaderKeyword}
                  onChange={(e) => setLeaderKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setLeaderPagination({ ...leaderPagination, page: 1 })
                    }
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* 表格 */}
            <div className="flex-1 min-h-0">
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
          </TabsContent>

          {/* 财务确认Tab */}
          <TabsContent value="finance" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* 搜索栏 */}
            <div className="flex gap-4 items-center mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索学员姓名、电话、订单号..."
                  value={financeKeyword}
                  onChange={(e) => setFinanceKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setFinancePagination({ ...financePagination, page: 1 })
                    }
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* 表格 */}
            <div className="flex-1 min-h-0">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* 审批弹窗 */}
      <ApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        order={selectedOrder}
        approvalType={activeTab}
        onSuccess={handleApprovalSuccess}
      />
    </Main>
  )
}

export default PendingApprovalsPage
