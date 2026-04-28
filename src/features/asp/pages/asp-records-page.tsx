/**
 * ASP 学习力测评记录管理页面
 * 遵循 DataTableLayout + SemiDataTable 标准布局
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Tag,
  Input,
  Select,
  Typography,
  SideSheet,
  Descriptions,
  Progress,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch } from '@douyinfe/semi-icons'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import type { SemiTagColor } from '@/lib/semi-types'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import { getAspRecords, getAspRecordDetail } from '../api'
import { STAGE_OPTIONS, type AspRecordListItem } from '../types'

const { Text } = Typography

/* ── 分数颜色 ── */
function scoreColor(s: number | null) {
  if (s == null) return '#999'
  if (s >= 85) return '#4a9d6e'
  if (s >= 70) return '#3d5a80'
  if (s >= 55) return '#d4920a'
  return '#ee6c4d'
}

function ScoreCell({ value }: { value: number | null }) {
  if (value == null) return <Text type="tertiary">-</Text>
  return <Text strong style={{ color: scoreColor(value) }}>{value}</Text>
}

function StageTag({ stage, label }: { stage: string; label: string }) {
  const colorMap: Record<string, SemiTagColor> = {
    primary: 'green',
    junior: 'blue',
    'high-arts': 'pink',
    'high-science': 'purple',
  }
  return <Tag color={colorMap[stage] || 'grey'}>{label}</Tag>
}

/* ── 详情侧栏 ── */
function DetailSheet({
  visible,
  recordId,
  onClose,
}: {
  visible: boolean
  recordId: string | null
  onClose: () => void
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['asp-record-detail', recordId],
    queryFn: () => getAspRecordDetail(recordId!),
    enabled: visible && !!recordId,
    select: (resp) => resp.data,
  })

  const result = detail?.result ?? {}
  const scores = [
    { label: '记忆力', key: 'memory_score', value: result.memory_score as number },
    { label: '执行力', key: 'execution_score', value: result.execution_score as number },
    { label: '心理韧性', key: 'resilience_score', value: result.resilience_score as number },
    { label: '学科掌握', key: 'subject_score', value: result.subject_score as number },
    { label: '综合分', key: 'overall_score', value: result.overall_score as number },
  ]

  const report = (result.report ?? []) as Array<{ title: string; content: string }>

  return (
    <SideSheet
      title={detail ? `${detail.name} 的测评详情` : 'ASP 测评详情'}
      visible={visible}
      onCancel={onClose}
      width={520}
      placement="right"
    >
      {isLoading ? (
        <Text type="tertiary">加载中...</Text>
      ) : detail ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 基本信息 */}
          <Descriptions
            data={[
              { key: '姓名', value: detail.name },
              { key: '手机号', value: detail.phone },
              { key: '学段', value: detail.stage_label },
              { key: '推荐人', value: detail.referred_by || '-' },
              { key: '来源渠道', value: detail.source_channel || '-' },
              { key: '提交时间', value: formatTime(detail.submitted_at) },
            ]}
          />

          {/* 分数概览 */}
          <div>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>分数概览</Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {scores.map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 70, flexShrink: 0, fontSize: 13 }}>{s.label}</Text>
                  <Progress
                    percent={s.value ?? 0}
                    showInfo={false}
                    style={{ flex: 1 }}
                    stroke={scoreColor(s.value)}
                  />
                  <Text strong style={{ width: 36, textAlign: 'right', color: scoreColor(s.value) }}>
                    {s.value ?? '-'}
                  </Text>
                </div>
              ))}
            </div>
          </div>

          {/* 报告内容 */}
          {report.length > 0 && (
            <div>
              <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>分析报告</Text>
              {report.map((section, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                    {section.title}
                  </Text>
                  <Text
                    type="tertiary"
                    style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                  >
                    {section.content}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Text type="tertiary">记录不存在</Text>
      )}
    </SideSheet>
  )
}

/* ── 主页面 ── */
export function AspRecordsPage() {
  useDocumentTitle('ASP 测评记录')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [nameFilter, setNameFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [stageFilter, setStageFilter] = useState<string | undefined>()

  const [detailId, setDetailId] = useState<string | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const queryParams = useMemo(
    () => ({
      page,
      size: pageSize,
      name: nameFilter || undefined,
      phone: phoneFilter || undefined,
      stage: stageFilter || undefined,
    }),
    [page, pageSize, nameFilter, phoneFilter, stageFilter]
  )

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['asp-records', queryParams],
    queryFn: () => getAspRecords(queryParams),
    select: (resp) => resp.data,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const openDetail = useCallback((record: AspRecordListItem) => {
    setDetailId(record.id)
    setSheetVisible(true)
  }, [])

  const columns: ColumnProps<AspRecordListItem>[] = useMemo(
    () => [
      {
        title: '姓名',
        dataIndex: 'name',
        width: 100,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : <Text strong>{record.name}</Text>,
      },
      {
        title: '手机号',
        dataIndex: 'phone',
        width: 130,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : record.phone,
      },
      {
        title: '学段',
        dataIndex: 'stage',
        width: 100,
        render: (_, record) =>
          isSkeletonRow(record.id) ? (
            <SemiSkeletonCell />
          ) : (
            <StageTag stage={record.stage} label={record.stage_label} />
          ),
      },
      {
        title: '综合分',
        dataIndex: 'overall_score',
        width: 80,
        align: 'center' as const,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : <ScoreCell value={record.overall_score} />,
      },
      {
        title: '记忆力',
        dataIndex: 'memory_score',
        width: 80,
        align: 'center' as const,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : <ScoreCell value={record.memory_score} />,
      },
      {
        title: '执行力',
        dataIndex: 'execution_score',
        width: 80,
        align: 'center' as const,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : <ScoreCell value={record.execution_score} />,
      },
      {
        title: '韧性',
        dataIndex: 'resilience_score',
        width: 80,
        align: 'center' as const,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : <ScoreCell value={record.resilience_score} />,
      },
      {
        title: '学科',
        dataIndex: 'subject_score',
        width: 80,
        align: 'center' as const,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : <ScoreCell value={record.subject_score} />,
      },
      {
        title: '推荐人',
        dataIndex: 'referred_by',
        width: 100,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : (record.referred_by || '-'),
      },
      {
        title: '提交时间',
        dataIndex: 'submitted_at',
        width: 160,
        render: (_, record) =>
          isSkeletonRow(record.id) ? <SemiSkeletonCell /> : formatTime(record.submitted_at),
      },
    ],
    []
  )

  const toolbar = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <Input
        prefix={<IconSearch />}
        placeholder="搜索姓名"
        value={nameFilter}
        onChange={(v) => { setNameFilter(v); setPage(1) }}
        showClear
        style={{ width: 160 }}
      />
      <Input
        prefix={<IconSearch />}
        placeholder="搜索手机号"
        value={phoneFilter}
        onChange={(v) => { setPhoneFilter(v); setPage(1) }}
        showClear
        style={{ width: 160 }}
      />
      <Select
        placeholder="学段"
        value={stageFilter}
        onChange={(v) => { setStageFilter(v as string | undefined); setPage(1) }}
        optionList={STAGE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        showClear
        style={{ width: 120 }}
      />
    </div>
  )

  return (
    <>
      <DataTableLayout
        title="ASP 测评记录"
        total={total}
        toolbar={toolbar}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      >
        <SemiDataTable<AspRecordListItem>
          columns={columns}
          data={items}
          total={total}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          onRowClick={openDetail}
        />
      </DataTableLayout>

      <DetailSheet
        visible={sheetVisible}
        recordId={detailId}
        onClose={() => setSheetVisible(false)}
      />
    </>
  )
}
