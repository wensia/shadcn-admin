/**
 * 云客通话记录页面
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
    <div className="flex flex-col gap-6 h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">通话记录</h1>
          <p className="text-sm text-muted-foreground">
            查看云客系统通话记录和录音
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="shrink-0">
        <StatsCards stats={stats} isLoading={isStatsLoading} />
      </div>

      {/* 筛选工具栏 */}
      <div className="shrink-0">
        <CallRecordsToolbar
          filters={filters}
          onFilterChange={updateFilter}
          onReset={resetFilters}
          onRefresh={refetch}
          isLoading={isLoading}
        />
      </div>

      {/* 数据表格 */}
      <div className="flex-1 min-h-0">
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
    <Main fixed>
      <CallRecordsProvider>
        <CallRecordsContent />
      </CallRecordsProvider>
    </Main>
  )
}
