/**
 * 激活线索弹窗
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
import { format } from 'date-fns'
import { DialogBodySkeleton } from '@/components/semi/dialog-body-skeleton'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { batchImportApi } from '../api'
import type { BatchImportItem, ActivatedLeadItem } from '../types'

interface ActivatedLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: BatchImportItem | null
}

export function ActivatedLeadsDialog({ open, onOpenChange, batch }: ActivatedLeadsDialogProps) {
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
      const resetTimer = window.setTimeout(() => {
        setPagination({ page: 1, pageSize: 20 })
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }
  }, [open, batch])

  // 获取激活线索列表（API 返回全部数据，前端分页）
  const { data, isLoading } = useQuery({
    queryKey: ['batch-import-activated-leads', batch?.id],
    queryFn: () => batchImportApi.getActivatedLeads(batch!.id, {}),
    enabled: !!batch && open,
  })

  // API 返回的 data 可能是数组或分页对象
  const responseData = data?.data
  const allLeads = Array.isArray(responseData)
    ? responseData
    : (responseData?.items || [])
  const totalCount = allLeads.length

  // 前端分页
  const leadsList = allLeads.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  )

  // 下载激活线索
  const handleDownload = useCallback(async () => {
    if (!batch) return

    try {
      const blob = await batchImportApi.downloadActivatedLeads(batch.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `激活线索_${batch.batch_name}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      Toast.success('下载成功')
    } catch (error: unknown) {
      showApiErrorToast(error, '下载失败')
    }
  }, [batch])

  // 表格列定义
  const columns = useMemo<ColumnProps<ActivatedLeadItem>[]>(() => [
    { title: '行号', dataIndex: 'row_number', width: 60 },
    { title: '孩子姓名', dataIndex: 'child_name', width: 100, render: (t: string) => t || '-' },
    { title: '家长姓名', dataIndex: 'parent_name', width: 100, render: (t: string) => t || '-' },
    { title: '家长电话', dataIndex: 'parent_phone', width: 120, render: (t: string) => t || '-' },
    { title: '年级', dataIndex: 'grade', width: 80, render: (t: string) => t || '-' },
    { title: '意向课程', dataIndex: 'intended_course', width: 100, render: (t: string) => t || '-' },
    { title: '课程顾问', dataIndex: 'advisor_name', width: 100, render: (t: string) => t || '-' },
    { title: '所属校区', dataIndex: 'campus_name', width: 100, render: (t: string) => t || '-' },
    {
      title: '激活时间',
      dataIndex: 'activated_at',
      width: 140,
      render: (t: string) => t ? format(new Date(t), 'yyyy-MM-dd HH:mm') : '-',
    },
    {
      title: '变更信息',
      dataIndex: 'changes',
      width: 200,
      render: (_: unknown, record: ActivatedLeadItem) => {
        const tags = []
        if (record.status_change) tags.push({ label: `状态: ${record.status_change}`, key: 'status' })
        if (record.campus_change) tags.push({ label: `校区: ${record.campus_change}`, key: 'campus' })
        if (record.advisor_change) tags.push({ label: `顾问: ${record.advisor_change}`, key: 'advisor' })

        if (tags.length === 0) return '-'

        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map(tag => (
              <Tag key={tag.key} type="ghost" size="small">{tag.label}</Tag>
            ))}
          </div>
        )
      },
    },
  ], [])

  return (
    <Modal
      visible={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <span>激活线索 - {batch?.batch_name}</span>
          <Button icon={<IconDownload />} onClick={handleDownload}>
            下载激活线索
          </Button>
        </div>
      }
      onCancel={() => onOpenChange(false)}
      width={1000}
      footer={null}
      style={{ maxHeight: '80vh' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(80vh - 60px)', overflow: 'hidden' }}
    >
      {batch && (
        <>
          {/* 激活线索表格 */}
          <div ref={wrapperRef} style={{ flex: 1, overflow: 'hidden' }}>
            {isLoading && leadsList.length === 0 ? (
              <DialogBodySkeleton variant="list" rows={8} compact />
            ) : (
            <Table
              columns={columns}
              dataSource={leadsList}
              rowKey="id"
              pagination={false}
              scroll={{ y: scrollY }}
              loading={isLoading}
              empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无激活线索</div>}
            />
            )}
          </div>

          {/* 分页 */}
          <div style={{ borderTop: '1px solid var(--semi-color-border)', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginTop: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--semi-color-text-2)' }}>
              共 {totalCount} 条激活线索
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
