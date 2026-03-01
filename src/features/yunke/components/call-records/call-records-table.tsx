/**
 * 通话记录数据表格 - 使用 SemiDataTable 通用组件
 */

import { useMemo, useState } from 'react'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { createCallRecordsColumns } from './call-records-columns'
import { RecordDetailModal } from './record-detail-modal'
import type { CallRecord } from '../../types'

interface CallRecordsTableProps {
  records: CallRecord[]
  total: number
  page: number
  size: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
  onViewLead?: (leadId: string) => void
}

export function CallRecordsTable({
  records,
  total,
  page,
  size,
  isLoading,
  onPageChange,
  onSizeChange,
  onViewLead,
}: CallRecordsTableProps) {
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // 处理查看详情（录音/转写）
  const handlePlayRecord = (record: CallRecord) => {
    setSelectedRecord(record)
    setModalOpen(true)
  }

  // 创建列定义
  const columns = useMemo(
    () =>
      createCallRecordsColumns({
        onPlayRecord: handlePlayRecord,
        onViewLead,
      }),
    [onViewLead]
  )

  return (
    <>
      <SemiDataTable<CallRecord>
        columns={columns}
        data={records}
        total={total}
        page={page}
        pageSize={size}
        isLoading={isLoading}
        onPageChange={onPageChange}
        onPageSizeChange={onSizeChange}
        emptyText="暂无通话记录"
      />

      {/* 录音详情弹窗 */}
      <RecordDetailModal
        record={selectedRecord}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
