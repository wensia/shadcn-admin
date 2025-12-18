/**
 * Leads主页面
 * 线索管理的主入口组件
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LeadsTable } from './components/leads-table'
import { LeadsToolbar } from './components/leads-toolbar'
import { leadsApi } from './api'
import type { LeadListParams, LeadListItem } from './types'

export function LeadsPage() {
  const queryClient = useQueryClient()

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    size: 50
  })

  // 筛选参数
  const [filters, setFilters] = useState<LeadListParams>({})

  // 选中的行
  const [selectedRows, setSelectedRows] = useState<LeadListItem[]>([])

  // 获取线索列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', pagination, filters],
    queryFn: async () => {
      const response = await leadsApi.getLeads({
        ...filters,
        page: pagination.page,
        size: pagination.size,
        include_styles: true
      })
      return response.data
    }
  })

  // 刷新数据
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    toast.success('已刷新')
  }

  // 导出
  const handleExport = async () => {
    try {
      const blob = await leadsApi.exportLeads({ ...filters })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `线索数据_${new Date().getTime()}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('导出成功')
    } catch (error) {
      toast.error('导出失败')
    }
  }

  // 新建线索
  const handleCreate = () => {
    toast.info('打开创建线索对话框')
    // TODO: 实现创建对话框
  }

  // 高级筛选
  const handleFilter = () => {
    toast.info('打开高级筛选')
    // TODO: 实现筛选Sheet
  }

  // 批量分配
  const handleBatchAssign = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    toast.info(`批量分配 ${selectedRows.length} 条线索`)
    // TODO: 实现批量分配对话框
  }

  // 批量释放
  const handleBatchRelease = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    toast.info(`释放 ${selectedRows.length} 条线索到公海`)
    // TODO: 实现批量释放确认对话框
  }

  // 批量修改状态
  const handleBatchUpdateStatus = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    toast.info(`批量修改 ${selectedRows.length} 条线索状态`)
    // TODO: 实现批量修改状态对话框
  }

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择线索')
      return
    }
    toast.warning(`批量删除 ${selectedRows.length} 条线索`)
    // TODO: 实现批量删除确认对话框
  }

  // 行点击 - 打开详情
  const handleRowClick = (lead: LeadListItem) => {
    toast.info(`查看线索详情: ${lead.child_name || lead.id}`)
    // TODO: 实现详情Sheet
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">线索管理</h1>
        <p className="text-muted-foreground">管理和跟进销售线索</p>
      </div>

      {/* 工具栏 */}
      <LeadsToolbar
        selectedCount={selectedRows.length}
        onCreateClick={handleCreate}
        onRefreshClick={handleRefresh}
        onExportClick={handleExport}
        onFilterClick={handleFilter}
        onBatchAssign={handleBatchAssign}
        onBatchRelease={handleBatchRelease}
        onBatchUpdateStatus={handleBatchUpdateStatus}
        onBatchDelete={handleBatchDelete}
      />

      {/* 数据表格 */}
      <div className="flex-1 overflow-hidden">
        <LeadsTable
          data={data?.items || []}
          total={data?.total || 0}
          page={pagination.page}
          pageSize={pagination.size}
          isLoading={isLoading}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(size) => setPagination({ page: 1, size })}
          onRowClick={handleRowClick}
          onSelectionChange={setSelectedRows}
        />
      </div>
    </div>
  )
}
