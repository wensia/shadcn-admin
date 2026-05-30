/**
 * 工具用量配额管理页面（后台管理）
 * 配置每个用户每天可以使用每个工具的次数
 */

import { useState, useMemo, useCallback } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import {
  Button,
  Input,
  Select,
  Modal,
  Form,
  Tag,
  Table,
  Typography,
  InputNumber,
  Space,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconPlus, IconDelete, IconTick, IconRefresh } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { apiClient } from '@/lib/api/client'
import { listQuotas, setQuota, deleteQuota } from '../api'
import type { ToolUserQuotaListItem } from '../types'

const { Text } = Typography

// 工具选项
const TOOL_FILTER_OPTIONS = [
  { value: '', label: '全部工具' },
  { value: 'zhongkao', label: '中考志愿' },
]

const TOOL_CREATE_OPTIONS = [
  { value: 'zhongkao', label: '中考志愿' },
]

// 工具名称映射
const TOOL_NAMES: Record<string, string> = {
  zhongkao: '中考志愿',
}

// 员工类型（复用 leads 模块定义）
interface EmployeeItem {
  id: string
  username: string
  name: string
  is_active: boolean
  position?: { name: string }
  campus_name?: string
  department_name?: string
  employee_identities?: Array<{
    campus?: { name: string }
    department?: { name: string }
    position?: { name: string }
  }>
}

export function QuotaManagePage() {
  useDocumentTitle('用量配额管理')

  const queryClient = useQueryClient()

  // 筛选状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [toolFilter, setToolFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 新增弹窗
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<EmployeeItem | null>(null)
  const [userSearchText, setUserSearchText] = useState('')
  const [userPage, setUserPage] = useState(1)
  const userPageSize = 5
  const [createToolId, setCreateToolId] = useState('zhongkao')
  const [createDailyLimit, setCreateDailyLimit] = useState<number>(5)

  // 编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editTarget, setEditTarget] = useState<ToolUserQuotaListItem | null>(null)
  const [editFormApi, setEditFormApi] = useState<FormApi | null>(null)

  // 查询配额列表
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['tool-quotas', page, pageSize, toolFilter, searchKeyword],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (toolFilter) params.tool_id = toolFilter
      if (searchKeyword) params.keyword = searchKeyword
      const res = await listQuotas(params as Parameters<typeof listQuotas>[0])
      return res.data
    },
  })

  // 查询员工列表（新增弹窗用）
  const { data: userData, isLoading: userLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['quota-employees', userPage, userPageSize, userSearchText],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { items: EmployeeItem[]; total: number } }>('/employees', {
        params: {
          page: userPage,
          size: userPageSize,
          search: userSearchText || undefined,
          is_active: true,
          include_identities: true,
          use_cache: false,
        },
      })
      return res.data
    },
    enabled: createModalVisible,
  })

  // 设置配额
  const setMutation = useMutation({
    mutationFn: setQuota,
    onSuccess: () => {
      toast.success('配额设置成功')
      setCreateModalVisible(false)
      setEditModalVisible(false)
      setEditTarget(null)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['tool-quotas'] })
    },
    onError: (err) => showApiErrorToast(err, '设置失败'),
  })

  // 删除配额
  const deleteMutation = useMutation({
    mutationFn: deleteQuota,
    onSuccess: () => {
      toast.success('配额已删除，用户已恢复无限制')
      queryClient.invalidateQueries({ queryKey: ['tool-quotas'] })
    },
    onError: (err) => showApiErrorToast(err, '删除失败'),
  })

  const resetCreateModal = useCallback(() => {
    setSelectedUser(null)
    setUserSearchText('')
    setUserPage(1)
    setCreateToolId('zhongkao')
    setCreateDailyLimit(5)
  }, [])

  // 员工表格列
  const userColumns: ColumnProps<EmployeeItem>[] = useMemo(() => [
    {
      title: '选择',
      key: 'selection',
      dataIndex: 'id',
      width: 56,
      align: 'center' as const,
      render: (_: unknown, record: EmployeeItem) => {
        const isSelected = selectedUser?.id === record.id
        return (
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: `2px solid ${isSelected ? 'var(--semi-color-primary)' : 'var(--semi-color-border)'}`,
              background: isSelected ? 'var(--semi-color-primary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            {isSelected && <IconTick style={{ color: '#fff', fontSize: 10 }} />}
          </div>
        )
      },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 96,
      render: (name: unknown, record: EmployeeItem) => (
        <Text strong={selectedUser?.id === record.id} style={{ fontSize: 13 }}>
          {name as string}
        </Text>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 112,
      render: (text: unknown) => (
        <Text type="tertiary" style={{ fontSize: 13 }}>{text as string}</Text>
      ),
    },
    {
      title: '职位',
      key: 'position',
      dataIndex: 'id',
      width: 96,
      render: (_: unknown, record: EmployeeItem) => {
        const pos = record.employee_identities?.[0]?.position?.name || record.position?.name
        return pos ? <Tag>{pos}</Tag> : null
      },
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 112,
      render: (_: unknown, record: EmployeeItem) => {
        const campus = record.employee_identities?.[0]?.campus?.name || record.campus_name || '-'
        return <Text style={{ fontSize: 13 }}>{campus}</Text>
      },
    },
  ], [selectedUser])

  // 主表格列
  const columns: ColumnProps<ToolUserQuotaListItem>[] = useMemo(() => [
    {
      title: '用户',
      dataIndex: 'user_name',
      width: 180,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={140} />
        return `${record.user_name}（${record.user_username}）`
      },
    },
    {
      title: '工具',
      dataIndex: 'tool_id',
      width: 100,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        return TOOL_NAMES[record.tool_id] || record.tool_id
      },
    },
    {
      title: '每日限额',
      dataIndex: 'daily_limit',
      width: 110,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        if (record.daily_limit === 0) {
          return <Tag color="red" size="small">已封禁</Tag>
        }
        return <span>{record.daily_limit} 次/天</span>
      },
    },
    {
      title: '今日已用',
      dataIndex: 'today_used',
      width: 110,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={70} />
        if (record.daily_limit === 0) return <span style={{ color: 'var(--semi-color-text-2)' }}>-</span>
        const exceeded = record.today_used >= record.daily_limit
        return (
          <span style={{ color: exceeded ? 'var(--semi-color-danger)' : undefined }}>
            {record.today_used} / {record.daily_limit}
          </span>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 80,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={40} />
        return record.is_active
          ? <Tag color="green" size="small">启用</Tag>
          : <Tag color="grey" size="small">停用</Tag>
      },
    },
    {
      title: '更新人',
      dataIndex: 'updated_by_name',
      width: 100,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={60} />
        return record.updated_by_name || '-'
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={130} />
        return new Date(record.updated_at).toLocaleString('zh-CN')
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_text: unknown, record: ToolUserQuotaListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              theme="light"
              data-stop-row-click
              onClick={() => {
                setEditTarget(record)
                setEditModalVisible(true)
              }}
            >
              编辑
            </Button>
            <Button
              theme="light"
              type="danger"
              icon={<IconDelete />}
              data-stop-row-click
              onClick={() => {
                Modal.confirm({
                  title: '删除配额',
                  content: `确定删除 ${record.user_name} 的 ${TOOL_NAMES[record.tool_id] || record.tool_id} 配额吗？删除后该用户将恢复无限制。`,
                  onOk: () => deleteMutation.mutate(record.id),
                })
              }}
            />
          </div>
        )
      },
    },
  ], [deleteMutation])

  function handleSearch() {
    setSearchKeyword(keyword)
    setPage(1)
  }

  function handleCreateSubmit() {
    if (!selectedUser) {
      toast.warning('请选择用户')
      return
    }
    setMutation.mutate({
      user_id: selectedUser.id,
      tool_id: createToolId,
      daily_limit: createDailyLimit,
    })
  }

  function handleEditSubmit() {
    editFormApi?.validate().then((values: Record<string, unknown>) => {
      if (!editTarget) return
      setMutation.mutate({
        user_id: editTarget.user_id,
        tool_id: editTarget.tool_id,
        daily_limit: values.daily_limit as number,
      })
    })
  }

  const totalUserPages = Math.max(1, Math.ceil((userData?.total || 0) / userPageSize))

  return (
    <DataTableLayout
      title="用量配额管理"
      total={listData?.total}
      headerActions={
        <Button
          theme="solid"
          icon={<IconPlus />}
          onClick={() => { resetCreateModal(); setCreateModalVisible(true) }}
        >
          新增配额
        </Button>
      }
      onRefresh={() => refetch()}
      isRefreshing={isLoading}
      toolbar={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Select
            value={toolFilter}
            onChange={(v) => { setToolFilter(v as string); setPage(1) }}
            optionList={TOOL_FILTER_OPTIONS}
            style={{ width: 140 }}
            placeholder="工具"
          />
          <Input
            prefix={<IconSearch />}
            placeholder="搜索用户名/姓名"
            value={keyword}
            onChange={setKeyword}
            onEnterPress={handleSearch}
            style={{ width: 200 }}
          />
        </div>
      }
    >
      <SemiDataTable<ToolUserQuotaListItem>
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

      {/* 新增配额弹窗 - 表格选人 */}
      <Modal
        title="新增配额"
        visible={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); resetCreateModal() }}
        width={720}
        bodyStyle={{ padding: 0 }}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text type="tertiary" style={{ fontSize: 13 }}>共 {userData?.total || 0} 位员工</Text>
              <Button disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)}>上一页</Button>
              <Text style={{ fontSize: 13 }}>{userPage} / {totalUserPages}</Text>
              <Button disabled={userPage >= totalUserPages} onClick={() => setUserPage((p) => p + 1)}>下一页</Button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button onClick={() => { setCreateModalVisible(false); resetCreateModal() }}>取消</Button>
              <Button
                theme="solid"
                onClick={handleCreateSubmit}
                disabled={!selectedUser || setMutation.isPending}
                loading={setMutation.isPending}
              >
                {selectedUser ? `确定 - ${selectedUser.name}` : '请先选择用户'}
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ padding: 16 }}>
          {/* 配额设置区 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <Space>
              <Text type="tertiary" style={{ fontSize: 13 }}>工具</Text>
              <Select
                value={createToolId}
                onChange={(v) => setCreateToolId(v as string)}
                optionList={TOOL_CREATE_OPTIONS}
                style={{ width: 140 }}
              />
            </Space>
            <Space>
              <Text type="tertiary" style={{ fontSize: 13 }}>每日限额</Text>
              <InputNumber
                value={createDailyLimit}
                onChange={(v) => setCreateDailyLimit(v as number)}
                min={0}
                max={10000}
                style={{ width: 100 }}
                innerButtons
              />
              <Text type="tertiary" style={{ fontSize: 12 }}>次/天（0=禁止）</Text>
            </Space>
          </div>

          {/* 搜索栏 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Space>
              <Text type="tertiary" style={{ fontSize: 13 }}>搜索员工</Text>
              <Input
                prefix={<IconSearch />}
                value={userSearchText}
                onChange={(v) => { setUserSearchText(v); setUserPage(1) }}
                placeholder="输入姓名或用户名搜索"
                style={{ width: 200 }}
              />
            </Space>
            <Button
              icon={<IconRefresh />}
              theme="borderless"
              onClick={() => { resetCreateModal(); refetchUsers() }}
              title="刷新"
            />
          </div>

          {/* 员工表格 */}
          <Table<EmployeeItem>
            columns={userColumns}
            dataSource={userData?.items || []}
            rowKey="id"
            loading={userLoading}
            pagination={false}
            onRow={(record) => ({
              onClick: () => {
                if (record) {
                  setSelectedUser(selectedUser?.id === record.id ? null : record)
                }
              },
              style: {
                cursor: 'pointer',
                background: record && selectedUser?.id === record.id
                  ? 'var(--semi-color-primary-light-default)'
                  : undefined,
              },
            })}
            empty={
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Text type="tertiary">暂无员工数据</Text>
              </div>
            }
          />
        </div>
      </Modal>

      {/* 编辑配额弹窗 */}
      <Modal
        title="编辑配额"
        visible={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => { setEditModalVisible(false); setEditTarget(null) }}
        okButtonProps={{ loading: setMutation.isPending }}
        maskClosable={false}
      >
        {editTarget && (
          <Form
            getFormApi={(api: FormApi) => setEditFormApi(api)}
            labelPosition="left"
            labelWidth={90}
            initValues={{ daily_limit: editTarget.daily_limit }}
          >
            <Form.Slot label="用户">
              <Text>{editTarget.user_name}（{editTarget.user_username}）</Text>
            </Form.Slot>
            <Form.Slot label="工具">
              <Text>{TOOL_NAMES[editTarget.tool_id] || editTarget.tool_id}</Text>
            </Form.Slot>
            <Form.Slot label="每日限额">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Form.InputNumber
                  field="daily_limit"
                  noLabel
                  rules={[{ required: true, message: '请输入限额' }]}
                  min={0}
                  max={10000}
                  style={{ width: 160 }}
                  innerButtons
                />
                <span style={{ color: 'var(--semi-color-text-2)', fontSize: 13 }}>
                  次/天（0 = 完全禁止）
                </span>
              </div>
            </Form.Slot>
          </Form>
        )}
      </Modal>
    </DataTableLayout>
  )
}
