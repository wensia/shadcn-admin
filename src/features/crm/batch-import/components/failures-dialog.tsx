/**
 * 失败记录弹窗
 * Semi Design 重构
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Tag,
  Table,
  Select,
  Toast,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  IconDownload,
} from '@douyinfe/semi-icons'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { batchImportApi } from '../api'
import { failureTypeLabels, type BatchImportItem, type ImportFailureItem, type FailureType } from '../types'

interface FailuresDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: BatchImportItem | null
}

// 失败类型颜色
const failureTypeColorMap: Record<FailureType, 'grey' | 'red' | 'orange'> = {
  duplicate: 'grey',
  duplicate_in_file: 'grey',
  validation_error: 'red',
  system_error: 'red',
  database_error: 'red',
  format_error: 'orange',
  permission_error: 'red',
  other: 'orange',
  unknown: 'orange',
}

// 格式化日期时间
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\//g, '/')
  } catch {
    return '-'
  }
}

export function FailuresDialog({ open, onOpenChange, batch }: FailuresDialogProps) {
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })

  // 表格全高
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState<number>(300)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const headerH = el.querySelector('.semi-table-thead')?.getBoundingClientRect().height ?? 47
      const available = el.clientHeight - headerH
      if (available > 100) setScrollY(available)
    }
    // 延迟测量等待 Modal 渲染
    const timer = setTimeout(measure, 100)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      clearTimeout(timer)
      ro.disconnect()
    }
  }, [open])

  // 重置分页状态
  useEffect(() => {
    if (open && batch) {
      const timer = window.setTimeout(() => {
        setPagination({ page: 1, pageSize: 20 })
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [open, batch])

  // 获取失败记录列表
  const { data: failuresData, isLoading: loadingFailures } = useQuery({
    queryKey: ['batch-import-failures', batch?.id, pagination],
    queryFn: () => batchImportApi.getFailureList(batch!.id, {
      page: pagination.page,
      page_size: pagination.pageSize,
    }),
    enabled: !!batch && open,
  })

  const failureList = failuresData?.data?.items || []
  const totalCount = failuresData?.data?.total || 0
  const typeCounts = failuresData?.data?.type_counts || {}

  // 下载失败记录
  const handleDownload = useCallback(async () => {
    if (!batch) return

    try {
      const blob = await batchImportApi.downloadFailures(batch.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `失败记录_${batch.batch_name}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      Toast.success('下载成功')
    } catch (error: unknown) {
      showApiErrorToast(error, '下载失败')
    }
  }, [batch])

  // 表格列定义
  const columns = useMemo<ColumnProps<ImportFailureItem>[]>(() => [
    { title: '行号', dataIndex: 'row_number', width: 60 },
    { title: '孩子姓名', dataIndex: 'child_name', width: 100, render: (t: string) => t || '-' },
    { title: '家长电话', dataIndex: 'parent_phone', width: 120, render: (t: string) => t || '-' },
    {
      title: '失败类型',
      dataIndex: 'failure_type',
      width: 100,
      render: (type: FailureType) => (
        <Tag color={failureTypeColorMap[type] || 'grey'} type="light">
          {failureTypeLabels[type] || type}
        </Tag>
      ),
    },
    {
      title: '失败原因',
      dataIndex: 'failure_reason',
      render: (text: string, record: ImportFailureItem) => (
        <span style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>
          {text}
          {record.failure_type === 'duplicate_in_file' && record.duplicate_count_in_batch && (
            <span style={{ marginLeft: 8, color: 'var(--semi-color-warning)' }}>
              (文件内重复 {record.duplicate_count_in_batch} 次)
            </span>
          )}
        </span>
      ),
    },
    { title: '线索创建时间', dataIndex: 'existing_lead_created_at', width: 150, render: (t: string) => formatDateTime(t) },
    { title: '上次导入时间', dataIndex: 'existing_lead_last_import_time', width: 150, render: (t: string) => formatDateTime(t) },
    { title: '上次激活时间', dataIndex: 'existing_lead_activated_at', width: 150, render: (t: string) => formatDateTime(t) },
    { title: '上次回访时间', dataIndex: 'existing_lead_last_followup_at', width: 150, render: (t: string) => formatDateTime(t) },
  ], [])

  return (
    <Modal
      visible={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <span>失败记录 - {batch?.batch_name}</span>
          <Button icon={<IconDownload />} onClick={handleDownload}>
            下载失败记录
          </Button>
        </div>
      }
      onCancel={() => onOpenChange(false)}
      width={1200}
      footer={null}
      style={{ maxHeight: '80vh' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(80vh - 60px)', overflow: 'hidden' }}
    >
      {batch && (
        <>
          {/* 失败类型统计 */}
          {Object.keys(typeCounts).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12, borderBottom: '1px solid var(--semi-color-border)', marginBottom: 12, flexShrink: 0 }}>
              {Object.entries(typeCounts).map(([type, count]) => (
                <Tag
                  key={type}
                  color={failureTypeColorMap[type as FailureType] || 'grey'}
                  type="light"
                >
                  {failureTypeLabels[type as FailureType] || type}
                  <span style={{ fontWeight: 700, marginLeft: 4 }}>{count}</span>
                </Tag>
              ))}
            </div>
          )}

          {/* 失败记录表格 */}
          <div ref={wrapperRef} style={{ flex: 1, overflow: 'hidden' }}>
            <Table
              columns={columns}
              dataSource={failureList}
              rowKey="id"
              pagination={false}
              scroll={{ y: scrollY }}
              loading={loadingFailures}
              empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无失败记录</div>}
            />
          </div>

          {/* 分页 */}
          <div style={{ borderTop: '1px solid var(--semi-color-border)', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginTop: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              共 {totalCount} 条失败记录
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Select
                value={pagination.pageSize}
                onChange={(v) => setPagination((p) => ({ ...p, pageSize: Number(v), page: 1 }))}
                optionList={[10, 20, 50, 100].map((size) => ({ value: size, label: String(size) }))}
                style={{ width: 80 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  上一页
                </Button>
                <span style={{ padding: '0 8px', fontSize: 12 }}>
                  第 {pagination.page} 页 / 共 {Math.ceil(totalCount / pagination.pageSize) || 1} 页
                </span>
                <Button
                  disabled={pagination.page >= Math.ceil(totalCount / pagination.pageSize)}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  下一页
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
