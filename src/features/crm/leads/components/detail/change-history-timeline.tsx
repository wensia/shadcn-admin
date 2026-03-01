/**
 * ChangeHistoryTimeline 变更历史组件 - Semi Design 版本
 */

import * as React from 'react'
import { Table, Tag, Button, Pagination } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { FileEdit, UserCog, ArrowRight } from 'lucide-react'
import { formatTime } from '@/lib/utils/time'
import { EmptyState } from './empty-state'
import type { LeadInfoChangeLog, LeadOwnershipChangeLog } from '../../types'
import { infoChangeTypeLabels, ownershipChangeTypeLabels } from '../../types'

// Semi Design 配色
const semiColors = {
  orange: '#ff7d00',
  green: '#00b42a',
  midGray: '#86909c',
}

type ChangeFilter = 'all' | 'info' | 'ownership'

interface ChangeHistoryTimelineProps {
  infoChanges: LeadInfoChangeLog[]
  ownershipChanges: LeadOwnershipChangeLog[]
  isLoading?: boolean
  className?: string
}

export function ChangeHistoryTimeline({
  infoChanges,
  ownershipChanges,
  isLoading,
  className,
}: ChangeHistoryTimelineProps) {
  const [filter, setFilter] = React.useState<ChangeFilter>('all')

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', fontSize: 13, color: 'var(--semi-color-text-2)' }}>
        加载中...
      </div>
    )
  }

  const hasInfoChanges = infoChanges && infoChanges.length > 0
  const hasOwnershipChanges = ownershipChanges && ownershipChanges.length > 0
  const hasNoData = !hasInfoChanges && !hasOwnershipChanges

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 筛选按钮 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          size="small"
          theme={filter === 'all' ? 'solid' : 'light'}
          onClick={() => setFilter('all')}
        >
          全部 ({(infoChanges?.length || 0) + (ownershipChanges?.length || 0)})
        </Button>
        <Button
          size="small"
          theme={filter === 'info' ? 'solid' : 'light'}
          onClick={() => setFilter('info')}
        >
          信息变更 ({infoChanges?.length || 0})
        </Button>
        <Button
          size="small"
          theme={filter === 'ownership' ? 'solid' : 'light'}
          onClick={() => setFilter('ownership')}
        >
          归属变更 ({ownershipChanges?.length || 0})
        </Button>
      </div>

      {hasNoData ? (
        <EmptyState
          icon={<FileEdit />}
          title="暂无变更记录"
          description="线索的信息和归属变更将在这里展示"
        />
      ) : (
        <>
          {(filter === 'all' || filter === 'info') && hasInfoChanges && (
            <InfoChangeTable data={infoChanges} showTitle={filter === 'all'} />
          )}
          {(filter === 'all' || filter === 'ownership') && hasOwnershipChanges && (
            <OwnershipChangeTable data={ownershipChanges} showTitle={filter === 'all'} />
          )}
          {filter === 'info' && !hasInfoChanges && (
            <EmptyState icon={<FileEdit />} title="暂无信息变更" description="线索信息变更记录将在这里展示" />
          )}
          {filter === 'ownership' && !hasOwnershipChanges && (
            <EmptyState icon={<UserCog />} title="暂无归属变更" description="线索归属变更记录将在这里展示" />
          )}
        </>
      )}
    </div>
  )
}

/** 信息变更表格 */
function InfoChangeTable({ data, showTitle }: { data: LeadInfoChangeLog[]; showTitle?: boolean }) {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  // 展开 changes 数组
  const flattenedData = React.useMemo(() => {
    const rows: Array<{
      id: string
      rowKey: string
      changed_at: string
      changed_by_name: string
      change_type: string
      field_name: string
      old_value: string | null | undefined
      new_value: string | null | undefined
      isFirstInGroup: boolean
      groupSize: number
    }> = []

    data.forEach((log) => {
      if (log.changes && log.changes.length > 0) {
        log.changes.forEach((change, idx) => {
          rows.push({
            id: log.id,
            rowKey: `${log.id}-${idx}`,
            changed_at: log.changed_at,
            changed_by_name: log.changed_by_name || '-',
            change_type: log.change_type,
            field_name: change.field_name,
            old_value: change.old_value,
            new_value: change.new_value,
            isFirstInGroup: idx === 0,
            groupSize: log.changes!.length,
          })
        })
      } else if (log.field_name) {
        rows.push({
          id: log.id,
          rowKey: log.id,
          changed_at: log.changed_at,
          changed_by_name: log.changed_by_name || '-',
          change_type: log.change_type,
          field_name: log.field_name,
          old_value: log.old_value,
          new_value: log.new_value,
          isFirstInGroup: true,
          groupSize: 1,
        })
      }
    })
    return rows
  }, [data])

  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize
    return flattenedData.slice(start, start + pageSize)
  }, [flattenedData, page, pageSize])

  React.useEffect(() => { setPage(1) }, [data])

  const columns: ColumnProps<(typeof flattenedData)[0]>[] = [
    {
      title: '变更时间',
      dataIndex: 'changed_at',
      width: 140,
      render: (text, record) => {
        if (!record) return null
        if (record.isFirstInGroup) {
          return { children: <span style={{ fontSize: 13 }}>{formatTime(text as string)}</span>, props: { rowSpan: record.groupSize } }
        }
        return { children: null, props: { rowSpan: 0 } }
      },
    },
    {
      title: '变更类型',
      dataIndex: 'change_type',
      width: 90,
      render: (text, record) => {
        if (!record) return null
        if (record.isFirstInGroup) {
          return {
            children: <Tag size="small">{infoChangeTypeLabels[text as keyof typeof infoChangeTypeLabels] || text}</Tag>,
            props: { rowSpan: record.groupSize },
          }
        }
        return { children: null, props: { rowSpan: 0 } }
      },
    },
    {
      title: '字段',
      dataIndex: 'field_name',
      width: 100,
      render: (text) => <span style={{ fontSize: 13, fontWeight: 500 }}>{text as string}</span>,
    },
    {
      title: '原值',
      dataIndex: 'old_value',
      render: (text) => (
        <span style={{ textDecoration: 'line-through', color: semiColors.midGray, fontSize: 13 }}>
          {(text as string) || '-'}
        </span>
      ),
    },
    {
      title: '',
      dataIndex: 'arrow',
      width: 30,
      render: () => <ArrowRight style={{ width: 12, height: 12, color: 'var(--semi-color-text-2)' }} />,
    },
    {
      title: '新值',
      dataIndex: 'new_value',
      render: (text) => (
        <span style={{ color: semiColors.green, fontSize: 13 }}>
          {(text as string) || '-'}
        </span>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'changed_by_name',
      width: 80,
      render: (text, record) => {
        if (!record) return null
        if (record.isFirstInGroup) {
          return { children: <span style={{ fontSize: 13 }}>{text as string}</span>, props: { rowSpan: record.groupSize } }
        }
        return { children: null, props: { rowSpan: 0 } }
      },
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {showTitle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileEdit style={{ width: 14, height: 14, color: semiColors.orange }} />
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>信息变更</h3>
          <Tag size="small" style={{ background: semiColors.orange, color: '#fff' }}>{data.length}</Tag>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="rowKey"
        pagination={false}
        size="small"
        bordered
      />
      {flattenedData.length > 10 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            total={flattenedData.length}
            currentPage={page}
            pageSize={pageSize}
            pageSizeOpts={[10, 20, 50]}
            showSizeChanger
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </div>
      )}
    </div>
  )
}

/** 归属变更表格 */
function OwnershipChangeTable({ data, showTitle }: { data: LeadOwnershipChangeLog[]; showTitle?: boolean }) {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, page, pageSize])

  React.useEffect(() => { setPage(1) }, [data])

  const columns: ColumnProps<LeadOwnershipChangeLog>[] = [
    {
      title: '变更时间',
      dataIndex: 'changed_at',
      width: 140,
      render: (text) => <span style={{ fontSize: 13 }}>{formatTime(text as string)}</span>,
    },
    {
      title: '变更类型',
      dataIndex: 'change_type',
      width: 90,
      render: (text) => (
        <Tag size="small">
          {ownershipChangeTypeLabels[text as keyof typeof ownershipChangeTypeLabels] || text}
        </Tag>
      ),
    },
    {
      title: '顾问变更',
      dataIndex: 'advisor_change',
      render: (_text, record) => {
        if (!record) return null
        const hasChange = record.previous_advisor_name || record.current_advisor_name
        if (!hasChange) return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <span style={{ textDecoration: 'line-through', color: semiColors.midGray }}>
              {record.previous_advisor_name || '无'}
            </span>
            <ArrowRight style={{ width: 12, height: 12, color: 'var(--semi-color-text-2)', flexShrink: 0 }} />
            <span style={{ color: semiColors.green }}>
              {record.current_advisor_name || '无'}
            </span>
          </div>
        )
      },
    },
    {
      title: '校区变更',
      dataIndex: 'campus_change',
      render: (_text, record) => {
        if (!record) return null
        const hasChange = record.previous_campus_name || record.current_campus_name
        if (!hasChange) return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <span style={{ textDecoration: 'line-through', color: semiColors.midGray }}>
              {record.previous_campus_name || '无'}
            </span>
            <ArrowRight style={{ width: 12, height: 12, color: 'var(--semi-color-text-2)', flexShrink: 0 }} />
            <span style={{ color: semiColors.green }}>
              {record.current_campus_name || '无'}
            </span>
          </div>
        )
      },
    },
    {
      title: '操作人',
      dataIndex: 'changed_by_name',
      width: 80,
      render: (text) => <span style={{ fontSize: 13 }}>{(text as string) || '-'}</span>,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {showTitle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCog style={{ width: 14, height: 14, color: semiColors.orange }} />
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>归属变更</h3>
          <Tag size="small" style={{ background: semiColors.orange, color: '#fff' }}>{data.length}</Tag>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="id"
        pagination={false}
        size="small"
        bordered
      />
      {data.length > 10 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            total={data.length}
            currentPage={page}
            pageSize={pageSize}
            pageSizeOpts={[10, 20, 50]}
            showSizeChanger
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </div>
      )}
    </div>
  )
}
