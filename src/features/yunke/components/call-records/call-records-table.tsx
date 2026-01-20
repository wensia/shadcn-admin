/**
 * 通话记录数据表格
 */

import { useMemo, useRef, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { createSkeletonData } from '@/components/ui/table-skeleton'
import { cn } from '@/lib/utils'
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
}

export function CallRecordsTable({
  records,
  total,
  page,
  size,
  isLoading,
  onPageChange,
  onSizeChange,
}: CallRecordsTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // 生成表格数据（加载时使用骨架屏占位数据）
  const displayData = useMemo(() => {
    return isLoading ? createSkeletonData<CallRecord>(size) : records
  }, [isLoading, records, size])

  // 处理播放录音
  const handlePlayRecord = (record: CallRecord) => {
    setSelectedRecord(record)
    setModalOpen(true)
  }

  // 处理查看转写
  const handleViewTranscript = (record: CallRecord) => {
    setSelectedRecord(record)
    setModalOpen(true)
  }

  // 创建列定义
  const columns = useMemo(
    () =>
      createCallRecordsColumns({
        onPlayRecord: handlePlayRecord,
        onViewTranscript: handleViewTranscript,
      }),
    []
  )

  // 初始化表格
  const table = useReactTable({
    data: displayData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / size),
  })

  const totalPages = Math.ceil(total / size)

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <div
        ref={tableContainerRef}
        className={cn(
          'min-h-0 flex-1 overflow-auto rounded-md border',
          isLoading && 'opacity-60 pointer-events-none'
        )}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.column.columnDef.size }}
                    className="whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.columnDef.size }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无通话记录
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <SimplePagination
        page={page}
        pageSize={size}
        total={total}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onSizeChange}
      />

      {/* 录音详情弹窗 */}
      <RecordDetailModal
        record={selectedRecord}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
