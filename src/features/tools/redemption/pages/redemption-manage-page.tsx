/**
 * 兑换码管理页面（后台管理）
 * 使用 Semi Design 组件
 */

import { useState, useMemo } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { Button, Input, Select, Modal, Form, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconPlus } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { copyToClipboard } from '@/lib/utils'
import {
  listRedemptionCodes,
  batchCreateCodes,
  revokeCode,
} from '../api'
import type { RedemptionCodeListItem, BatchCreateResponse } from '../types'

const { Text } = Typography

// 工具选项
const TOOL_OPTIONS = [
  { value: '', label: '全部工具' },
  { value: 'zhongkao', label: '中考志愿' },
]

// 状态选项
const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'ACTIVE', label: '有效' },
  { value: 'EXPIRED', label: '已过期' },
  { value: 'REVOKED', label: '已撤销' },
]

// 工具名称映射
const TOOL_NAMES: Record<string, string> = {
  zhongkao: '中考志愿',
}

function StatusTag({ status, isExhausted }: { status: string; isExhausted: boolean }) {
  if (isExhausted) {
    return <Tag color="orange" size="small">已用尽</Tag>
  }
  switch (status) {
    case 'ACTIVE':
      return <Tag color="green" size="small">有效</Tag>
    case 'EXPIRED':
      return <Tag color="grey" size="small">已过期</Tag>
    case 'REVOKED':
      return <Tag color="red" size="small">已撤销</Tag>
    default:
      return <Tag size="small">{status}</Tag>
  }
}

export function RedemptionManagePage() {
  useDocumentTitle('兑换码管理')

  const queryClient = useQueryClient()

  // 筛选状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [toolFilter, setToolFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 批量生成弹窗
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [createFormApi, setCreateFormApi] = useState<FormApi | null>(null)

  // 生成结果弹窗
  const [resultModalVisible, setResultModalVisible] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchCreateResponse | null>(null)

  // 批次筛选
  const [batchFilter, setBatchFilter] = useState('')

  // 撤销弹窗
  const [revokeModalVisible, setRevokeModalVisible] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<RedemptionCodeListItem | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  // 查询
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['redemption-codes', page, pageSize, toolFilter, statusFilter, searchKeyword, batchFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (toolFilter) params.tool_id = toolFilter
      if (statusFilter) params.status = statusFilter
      if (searchKeyword) params.keyword = searchKeyword
      if (batchFilter) params.batch_id = batchFilter
      const res = await listRedemptionCodes(params as Parameters<typeof listRedemptionCodes>[0])
      return res.data
    },
  })

  // 批量创建
  const createMutation = useMutation({
    mutationFn: batchCreateCodes,
    onSuccess: (res) => {
      setCreateModalVisible(false)
      createFormApi?.setValues({})
      queryClient.invalidateQueries({ queryKey: ['redemption-codes'] })
      // 打开结果弹窗
      if (res.data) {
        setBatchResult(res.data)
        setResultModalVisible(true)
      }
    },
    onError: (err) => showApiErrorToast(err, '批量生成失败'),
  })

  // 撤销
  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => revokeCode(id, reason),
    onSuccess: () => {
      toast.success('兑换码已撤销')
      setRevokeModalVisible(false)
      setRevokeTarget(null)
      setRevokeReason('')
      queryClient.invalidateQueries({ queryKey: ['redemption-codes'] })
    },
    onError: (err) => showApiErrorToast(err, '撤销失败'),
  })

  // 表格列
  const columns: ColumnProps<RedemptionCodeListItem>[] = useMemo(() => [
    {
      title: '兑换码',
      dataIndex: 'code',
      width: 200,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
        return (
          <Text
            copyable
            style={{ fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 13 }}
          >
            {record.code}
          </Text>
        )
      },
    },
    {
      title: '工具',
      dataIndex: 'tool_id',
      width: 100,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        return TOOL_NAMES[record.tool_id] || record.tool_id
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={50} />
        return <StatusTag status={record.status} isExhausted={record.is_exhausted} />
      },
    },
    {
      title: '使用/上限',
      dataIndex: 'used_count',
      width: 100,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        return `${record.used_count} / ${record.max_uses}`
      },
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      width: 170,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={130} />
        if (!record.expires_at) return <Text type="tertiary">永不过期</Text>
        return new Date(record.expires_at).toLocaleString('zh-CN')
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={130} />
        return new Date(record.created_at).toLocaleString('zh-CN')
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      width: 150,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={100} />
        return record.notes || <Text type="tertiary">-</Text>
      },
    },
    {
      title: '批次',
      dataIndex: 'batch_id',
      width: 100,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        if (!record.batch_id) return <Text type="tertiary">-</Text>
        const short = record.batch_id.slice(0, 8)
        return (
          <Tag
            size="small"
            style={{ cursor: 'pointer', fontFamily: "'Fira Code', monospace", fontSize: 11 }}
            onClick={(e) => {
              e.stopPropagation()
              setBatchFilter(record.batch_id!)
              setPage(1)
            }}
          >
            {short}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_text: unknown, record: RedemptionCodeListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={40} />
        if (record.status !== 'ACTIVE') return null
        return (
          <Button
            theme="light"
            type="danger"
            size="small"
            disabled={record.is_exhausted}
            data-stop-row-click
            onClick={() => {
              setRevokeTarget(record)
              setRevokeReason('')
              setRevokeModalVisible(true)
            }}
          >
            撤销
          </Button>
        )
      },
    },
  ], [])

  function handleSearch() {
    setSearchKeyword(keyword)
    setPage(1)
  }

  function handleCreateSubmit() {
    createFormApi?.validate().then((values: Record<string, unknown>) => {
      createMutation.mutate({
        tool_id: values.tool_id as string,
        count: values.count as number,
        max_uses: values.max_uses as number,
        expires_hours: (values.expires_hours as number) || null,
        notes: (values.notes as string) || null,
      })
    })
  }

  return (
    <DataTableLayout
      title="兑换码管理"
      total={listData?.total}
      headerActions={
        <Button
          theme="solid"
          icon={<IconPlus />}
          onClick={() => setCreateModalVisible(true)}
        >
          批量生成
        </Button>
      }
      onRefresh={() => refetch()}
      isRefreshing={isLoading}
      toolbar={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Select
            value={toolFilter}
            onChange={(v) => { setToolFilter(v as string); setPage(1) }}
            optionList={TOOL_OPTIONS}
            style={{ width: 140 }}
            placeholder="工具"
          />
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
            optionList={STATUS_OPTIONS}
            style={{ width: 120 }}
            placeholder="状态"
          />
          <Input
            prefix={<IconSearch />}
            placeholder="搜索兑换码/备注"
            value={keyword}
            onChange={setKeyword}
            onEnterPress={handleSearch}
            style={{ width: 200 }}
          />
          {batchFilter && (
            <Tag
              size="large"
              closable
              onClose={() => { setBatchFilter(''); setPage(1) }}
              color="blue"
              style={{ fontFamily: "'Fira Code', monospace" }}
            >
              批次: {batchFilter.slice(0, 8)}
            </Tag>
          )}
        </div>
      }
    >
      <SemiDataTable<RedemptionCodeListItem>
        columns={columns}
        data={listData?.items ?? []}
        total={listData?.total ?? 0}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        scrollX={1160}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      {/* 批量生成弹窗 */}
      <Modal
        title="批量生成兑换码"
        visible={createModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => setCreateModalVisible(false)}
        okButtonProps={{ loading: createMutation.isPending }}
        maskClosable={false}
      >
        <Form
          getFormApi={(api: FormApi) => setCreateFormApi(api)}
          labelPosition="left"
          labelWidth={90}
          initValues={{ tool_id: 'zhongkao', count: 10, max_uses: 1 }}
        >
          <Form.Select
            field="tool_id"
            label="工具"
            rules={[{ required: true, message: '请选择工具' }]}
            optionList={TOOL_OPTIONS.filter((o) => o.value !== '')}
            style={{ width: '100%' }}
          />
          <Form.InputNumber
            field="count"
            label="生成数量"
            rules={[{ required: true, message: '请输入数量' }]}
            min={1}
            max={100}
            style={{ width: '100%' }}
          />
          <Form.InputNumber
            field="max_uses"
            label="最大使用次数"
            rules={[{ required: true, message: '请输入次数' }]}
            min={1}
            max={9999}
            style={{ width: '100%' }}
          />
          <Form.InputNumber
            field="expires_hours"
            label="有效期(小时)"
            min={1}
            style={{ width: '100%' }}
            placeholder="留空表示永不过期"
          />
          <Form.Input
            field="notes"
            label="备注"
            placeholder="可选，用于标记用途"
            style={{ width: '100%' }}
          />
        </Form>
      </Modal>

      {/* 撤销确认弹窗 */}
      <Modal
        title="撤销兑换码"
        visible={revokeModalVisible}
        onOk={() => {
          if (revokeTarget) {
            revokeMutation.mutate({ id: revokeTarget.id, reason: revokeReason || undefined })
          }
        }}
        onCancel={() => {
          setRevokeModalVisible(false)
          setRevokeTarget(null)
        }}
        okButtonProps={{ loading: revokeMutation.isPending, type: 'danger' }}
        okText="确认撤销"
        maskClosable={false}
      >
        <div style={{ marginBottom: 12 }}>
          确定要撤销兑换码{' '}
          <Text strong style={{ fontFamily: "'Fira Code', monospace" }}>
            {revokeTarget?.code}
          </Text>{' '}
          吗？撤销后该兑换码将无法再使用。
        </div>
        <Input
          placeholder="撤销原因（可选）"
          value={revokeReason}
          onChange={setRevokeReason}
        />
      </Modal>

      {/* 生成结果弹窗 */}
      <Modal
        title="生成结果"
        visible={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={async () => {
                if (!batchResult) return
                const ok = await copyToClipboard(batchResult.codes.join('\n'))
                if (ok) toast.success('已复制全部兑换码')
                else toast.error('复制失败')
              }}
            >
              复制全部
            </Button>
            <Button
              onClick={() => {
                if (!batchResult) return
                const header = '兑换码,工具,最大使用次数,过期时间,备注,批次ID'
                const rows = batchResult.codes.map(code =>
                  [code, batchResult.tool_id, batchResult.max_uses, batchResult.expires_at || '永不过期', batchResult.notes || '', batchResult.batch_id].join(',')
                )
                const csv = [header, ...rows].join('\r\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `兑换码_${batchResult.batch_id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.success('CSV 已下载')
              }}
            >
              导出 CSV
            </Button>
            <Button theme="solid" onClick={() => setResultModalVisible(false)}>
              关闭
            </Button>
          </div>
        }
        width={560}
        maskClosable={false}
      >
        {batchResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 摘要信息 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', padding: 12, background: 'var(--semi-color-fill-0)', borderRadius: 8, fontSize: 13 }}>
              <div><Text type="tertiary">批次ID：</Text><Text style={{ fontFamily: "'Fira Code', monospace" }}>{batchResult.batch_id.slice(0, 8)}</Text></div>
              <div><Text type="tertiary">工具：</Text><Text>{TOOL_NAMES[batchResult.tool_id] || batchResult.tool_id}</Text></div>
              <div><Text type="tertiary">数量：</Text><Text strong>{batchResult.created}</Text></div>
              <div><Text type="tertiary">最大使用次数：</Text><Text>{batchResult.max_uses}</Text></div>
              <div><Text type="tertiary">过期时间：</Text><Text>{batchResult.expires_at ? new Date(batchResult.expires_at).toLocaleString('zh-CN') : '永不过期'}</Text></div>
              {batchResult.notes && <div><Text type="tertiary">备注：</Text><Text>{batchResult.notes}</Text></div>}
            </div>
            {/* 兑换码列表 */}
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--semi-color-border)', borderRadius: 6, padding: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {batchResult.codes.map((code) => (
                  <div
                    key={code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: 'var(--semi-color-fill-0)',
                    }}
                  >
                    <Text
                      copyable
                      style={{ fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 13, letterSpacing: 1 }}
                    >
                      {code}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DataTableLayout>
  )
}
