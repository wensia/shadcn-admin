/**
 * 中考分析记录管理页面（后台管理）
 * 使用 Semi Design 组件
 */

import { useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery } from '@tanstack/react-query'
import { Select, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { listAnalysisRecords } from '../api'
import type { AnalysisRecordItem } from '../api'

const { Text } = Typography

// 访问方式选项
const AUTH_TYPE_OPTIONS = [
  { value: '', label: '全部方式' },
  { value: 'user', label: '登录用户' },
  { value: 'ticket', label: '兑换码' },
  { value: 'superuser', label: '超级管理员' },
]

// 区选项
const DISTRICT_OPTIONS = [
  { value: '', label: '全部区' },
  { value: '南开区', label: '南开区' },
]

// 访问方式标签颜色
function AuthTypeTag({ type }: { type: string }) {
  switch (type) {
    case 'superuser':
      return <Tag color="red" size="small">超管</Tag>
    case 'user':
      return <Tag color="blue" size="small">用户</Tag>
    case 'ticket':
      return <Tag color="orange" size="small">兑换码</Tag>
    default:
      return <Tag size="small">{type}</Tag>
  }
}

export function ZhongkaoRecordsPage() {
  useDocumentTitle('中考分析记录')

  // 筛选状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [authTypeFilter, setAuthTypeFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')

  // 查询
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['zhongkao-records', page, pageSize, authTypeFilter, districtFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (authTypeFilter) params.auth_type = authTypeFilter
      if (districtFilter) params.district = districtFilter
      const res = await listAnalysisRecords(params as Parameters<typeof listAnalysisRecords>[0])
      return res.data
    },
  })

  // 表格列
  const columns: ColumnProps<AnalysisRecordItem>[] = useMemo(() => [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={130} />
        return new Date(record.created_at).toLocaleString('zh-CN')
      },
    },
    {
      title: '一模分数',
      dataIndex: 'score',
      width: 90,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
        return <Text strong>{record.score}</Text>
      },
    },
    {
      title: '区',
      dataIndex: 'district',
      width: 80,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
        return record.district
      },
    },
    {
      title: '区排名',
      dataIndex: 'district_rank',
      width: 80,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
        return record.district_rank.toLocaleString()
      },
    },
    {
      title: '对标中考',
      dataIndex: 'target_score',
      width: 90,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
        return record.target_score
      },
    },
    {
      title: '市排名',
      dataIndex: 'city_rank',
      width: 80,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
        return record.city_rank.toLocaleString()
      },
    },
    {
      title: '访问方式',
      dataIndex: 'auth_type',
      width: 100,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        return <AuthTypeTag type={record.auth_type} />
      },
    },
    {
      title: '用户/兑换码',
      dataIndex: 'user_name',
      width: 150,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
        if (record.user_name) return record.user_name
        if (record.redemption_code) {
          return (
            <Text
              style={{ fontFamily: "var(--font-mono-local)", fontSize: 12 }}
              type="tertiary"
            >
              {record.redemption_code}
            </Text>
          )
        }
        return <Text type="tertiary">-</Text>
      },
    },
    {
      title: 'IP',
      dataIndex: 'client_ip',
      width: 130,
      render: (_text: unknown, record: AnalysisRecordItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={90} />
        return record.client_ip || <Text type="tertiary">-</Text>
      },
    },
  ], [])

  return (
    <DataTableLayout
      title="中考分析记录"
      total={listData?.total}
      onRefresh={() => refetch()}
      isRefreshing={isLoading}
      toolbar={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Select
            value={authTypeFilter}
            onChange={(v) => { setAuthTypeFilter(v as string); setPage(1) }}
            optionList={AUTH_TYPE_OPTIONS}
            style={{ width: 140 }}
            placeholder="访问方式"
          />
          <Select
            value={districtFilter}
            onChange={(v) => { setDistrictFilter(v as string); setPage(1) }}
            optionList={DISTRICT_OPTIONS}
            style={{ width: 120 }}
            placeholder="区"
          />
        </div>
      }
    >
      <SemiDataTable<AnalysisRecordItem>
        columns={columns}
        data={listData?.items ?? []}
        total={listData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        scrollX={970}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />
    </DataTableLayout>
  )
}
