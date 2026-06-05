/**
 * 通话记录数据表格 - 使用 SemiDataTable 通用组件
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  activeRecordId?: string
  onOpenRecord?: (recordId: string) => void
  onCloseRecord?: () => void
}

function createRecordStub(id: string): CallRecord {
  return {
    id,
    source: '',
    record_id: '',
    caller: null,
    callee: null,
    call_time: null,
    duration: null,
    call_type: null,
    call_result: null,
    customer_name: null,
    staff_name: null,
    department: null,
    has_recording: false,
    transcript_status: null,
    ai_analysis_status: null,
    ai_analyzed_at: null,
    created_at: '',
  }
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
  activeRecordId,
  onOpenRecord,
  onCloseRecord,
}: CallRecordsTableProps) {
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const isRouteBound = Boolean(onOpenRecord || onCloseRecord)
  const detailOpen = isRouteBound ? Boolean(activeRecordId) : modalOpen

  useEffect(() => {
    if (!isRouteBound) return
    if (!activeRecordId) {
      setSelectedRecord(null)
      setModalOpen(false)
      return
    }
    if (selectedRecord?.id === activeRecordId) return

    const matchedRecord = records.find((record) => record.id === activeRecordId)
    setSelectedRecord(matchedRecord ?? createRecordStub(activeRecordId))
    setModalOpen(true)
  }, [activeRecordId, isRouteBound, records, selectedRecord?.id])

  // 处理查看详情（录音/转写）
  const handlePlayRecord = useCallback((record: CallRecord) => {
    setSelectedRecord(record)
    setModalOpen(true)
    onOpenRecord?.(record.id)
  }, [onOpenRecord])

  const handleDetailOpenChange = useCallback((open: boolean) => {
    setModalOpen(open)
    if (!open) {
      setSelectedRecord(null)
      onCloseRecord?.()
    }
  }, [onCloseRecord])

  // 创建列定义
  const columns = useMemo(
    () =>
      createCallRecordsColumns({
        onPlayRecord: handlePlayRecord,
        onViewLead,
      }),
    [handlePlayRecord, onViewLead]
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
        open={detailOpen}
        onOpenChange={handleDetailOpenChange}
      />
    </>
  )
}
