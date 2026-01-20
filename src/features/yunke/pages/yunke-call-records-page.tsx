/**
 * 云客通话记录页面
 * 布局参考线索管理页面
 */

import { Main } from '@/components/layout/main'
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* 统计卡片 - flex-shrink-0 防止收缩 */}
      <div className="flex-shrink-0">
        <StatsCards stats={stats} isLoading={isStatsLoading} />
      </div>

      {/* 筛选工具栏 - flex-shrink-0 */}
      <div className="flex-shrink-0">
        <CallRecordsToolbar
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          onRefresh={refetch}
          isLoading={isLoading}
        />
      </div>

      {/* 数据表格容器 - flex-1 min-h-0 允许收缩和滚动 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CallRecordsTable
          records={records}
          total={total}
          page={page}
          size={size}
          isLoading={isLoading}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </div>
    </div>
  )
}

export function YunkeCallRecordsPage() {
  return (
    <Main fixed className="min-h-0">
      <CallRecordsProvider>
        <CallRecordsContent />
      </CallRecordsProvider>
    </Main>
  )
}
