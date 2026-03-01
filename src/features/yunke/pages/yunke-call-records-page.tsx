/**
 * 云客通话记录页面
 * 布局参考线索管理页面
 */

import { useState, useCallback } from 'react'
import { Main } from '@/components/layout/main'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import {
  CallRecordsProvider,
  useCallRecords,
  StatsCards,
  CallRecordsTable,
  CallRecordsToolbar,
} from '../components/call-records'

function CallRecordsContent() {
  const {
    records,
    total,
    stats,
    isLoading,
    isStatsLoading,
    filters,
    updateFilter,
    resetFilters,
    page,
    size,
    setPage,
    setSize,
    refetch,
  } = useCallRecords()

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [leadSheetOpen, setLeadSheetOpen] = useState(false)

  const handleViewLead = useCallback((leadId: string) => {
    setSelectedLeadId(leadId)
    setLeadSheetOpen(true)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
      {/* 统计卡片 */}
      <div style={{ flexShrink: 0 }}>
        <StatsCards stats={stats} isLoading={isStatsLoading} />
      </div>

      {/* 筛选工具栏 */}
      <div style={{ flexShrink: 0 }}>
        <CallRecordsToolbar
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          onRefresh={refetch}
          isLoading={isLoading}
        />
      </div>

      {/* 数据表格容器 */}
      <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <CallRecordsTable
          records={records}
          total={total}
          page={page}
          size={size}
          isLoading={isLoading}
          onPageChange={setPage}
          onSizeChange={setSize}
          onViewLead={handleViewLead}
        />
      </div>

      {/* 线索详情抽屉 */}
      <LeadDetailSheet
        leadId={selectedLeadId}
        open={leadSheetOpen}
        onOpenChange={setLeadSheetOpen}
      />
    </div>
  )
}

export function YunkeCallRecordsPage() {
  return (
    <Main fixed style={{ minHeight: 0 }}>
      <CallRecordsProvider>
        <CallRecordsContent />
      </CallRecordsProvider>
    </Main>
  )
}
