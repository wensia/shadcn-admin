/**
 * 云客通话记录页面
 * 使用 DataTableLayout 标准布局
 */

import { useState, useCallback } from 'react'
import { Button } from '@douyinfe/semi-ui-19'
import { IconRefresh } from '@douyinfe/semi-icons'
import { LeadDetailSheet } from '@/features/crm/leads/components/lead-detail-sheet'
import { DataTableLayout } from '@/components/semi/data-table-layout'
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
    <>
      <DataTableLayout
        title="通话记录"
        total={total}
        toolbar={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 统计面板 */}
            <StatsCards stats={stats} isLoading={isStatsLoading} />
            {/* 筛选区 */}
            <CallRecordsToolbar
              filters={filters}
              onFilterChange={updateFilter}
              onReset={resetFilters}
              isLoading={isLoading}
              extraActions={
                <Button
                  icon={<IconRefresh />}
                  theme="light"
                  onClick={refetch}
                  loading={isLoading}
                  title="刷新数据"
                />
              }
            />
          </div>
        }
      >
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
      </DataTableLayout>

      <LeadDetailSheet
        leadId={selectedLeadId}
        open={leadSheetOpen}
        onOpenChange={setLeadSheetOpen}
      />
    </>
  )
}

export function YunkeCallRecordsPage() {
  return (
    <CallRecordsProvider>
      <CallRecordsContent />
    </CallRecordsProvider>
  )
}
