/**
 * API密钥管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { Button, Input, Modal, Form, Typography, Tag, Banner, Select } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch } from '@douyinfe/semi-icons'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { apiKeysApi } from '../api'
import { type EmployeeApiKeyInfo, type ApiKeyCreateResponse, type ApiKeyInfo } from '../types'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

// 密钥状态筛选选项
const apiKeyFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'yes', label: '已创建密钥' },
  { value: 'no', label: '未创建密钥' },
]

interface ApiKeyFormValues {
  name?: string
  expires_in_days?: number
}

type ApiKeyTableItem = EmployeeApiKeyInfo & { id: string }

export function ApiKeysPage() {
  const queryClient = useQueryClient()
  const createFormRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [hasApiKeyFilter, setHasApiKeyFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [keyResultDialogOpen, setKeyResultDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeApiKeyInfo | null>(null)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResponse | null>(null)
  const [showKey, setShowKey] = useState(false)

  // 查询员工列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-api-keys', page, pageSize, searchValue, hasApiKeyFilter],
    queryFn: async () => {
      const params: { page?: number; size?: number; search?: string; has_api_key?: boolean } = {
        page,
        size: pageSize,
      }
      if (searchValue) params.search = searchValue
      if (hasApiKeyFilter !== 'all') params.has_api_key = hasApiKeyFilter === 'yes'
      return apiKeysApi.list(params)
    },
  })

  const items = useMemo<ApiKeyTableItem[]>(() =>
    (data?.items ?? []).map(item => ({ ...item, id: item.employee_id })),
    [data?.items]
  )
  const total = data?.total || 0

  // 创建密钥
  const createMutation = useMutation({
    mutationFn: (data: { employeeId: string; name: string; expires_in_days: number }) =>
      apiKeysApi.create(data.employeeId, {
        name: data.name,
        expires_in_days: data.expires_in_days,
      }),
    onSuccess: (response) => {
      setCreatedKey(response)
      setCreateDialogOpen(false)
      setKeyResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 重新生成密钥
  const regenerateMutation = useMutation({
    mutationFn: (employeeId: string) => apiKeysApi.regenerate(employeeId),
    onSuccess: (response) => {
      setCreatedKey(response)
      setKeyResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '重新生成失败')
    },
  })

  // 删除密钥
  const deleteMutation = useMutation({
    mutationFn: (employeeId: string) => apiKeysApi.delete(employeeId),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setSelectedEmployee(null)
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 列定义
  const columns: ColumnProps<ApiKeyTableItem>[] = [
      {
        title: '员工信息',
        dataIndex: 'name',
        width: 180,
        render: (text: string, record: ApiKeyTableItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={144} />
          return (
            <div>
              <Text strong>{text}</Text>
              <div><Text type="tertiary" size="small">{record.username}</Text></div>
            </div>
          )
        },
      },
      {
        title: 'API密钥状态',
        dataIndex: 'has_api_key',
        width: 140,
        render: (_value: boolean, record: ApiKeyTableItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          if (!record.has_api_key) {
            return <Tag type="ghost">未创建</Tag>
          }
          const apiKey = record.api_key
          if (apiKey?.is_expired) {
            return (
              <Tag color="red" type="light">
                <XCircle className="h-3 w-3" style={{ marginRight: 4 }} />
                已过期
              </Tag>
            )
          }
          return (
            <Tag color="green" type="light">
              <CheckCircle className="h-3 w-3" style={{ marginRight: 4 }} />
              有效
            </Tag>
          )
        },
      },
      {
        title: '密钥名称',
        dataIndex: 'api_key',
        width: 150,
        render: (_value: ApiKeyInfo | undefined, record: ApiKeyTableItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
          if (!record.has_api_key) return <Text type="tertiary">-</Text>
          return (
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
              <span>{record.api_key?.name || '-'}</span>
            </div>
          )
        },
      },
      {
        title: '密钥前缀',
        dataIndex: 'api_key_prefix',
        width: 120,
        render: (_value: string | undefined, record: ApiKeyTableItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          if (!record.api_key?.prefix) return <Text type="tertiary">-</Text>
          return (
            <code style={{ background: 'var(--semi-color-fill-0)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>
              {record.api_key.prefix}...
            </code>
          )
        },
      },
      {
        title: '过期时间',
        dataIndex: 'expires_at',
        width: 160,
        render: (_value: string | undefined, record: ApiKeyTableItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
          if (!record.api_key?.expires_at) return <Text type="tertiary">-</Text>
          return (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" style={{ color: 'var(--semi-color-text-2)' }} />
              <span style={record.api_key.is_expired ? { color: 'var(--semi-color-danger)' } : undefined}>
                {formatTime(record.api_key.expires_at)}
              </span>
            </div>
          )
        },
      },
      {
        title: '最后使用',
        dataIndex: 'last_used_at',
        width: 160,
        render: (_value: string | undefined, record: ApiKeyTableItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
          if (!record.api_key?.last_used_at) return <Text type="tertiary">从未使用</Text>
          return <Text>{formatTime(record.api_key.last_used_at)}</Text>
        },
      },
      {
        title: '操作',
        dataIndex: 'employee_id',
        width: 180,
        render: (_value: string, record: ApiKeyTableItem) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />

          if (!record.has_api_key) {
            return (
              <Button theme="outline" icon={<Plus className="h-4 w-4" />} onClick={() => handleCreateClick(record)}>
                创建密钥
              </Button>
            )
          }

          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button theme="borderless" type="tertiary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => handleRegenerateClick(record)} />
              <Button theme="borderless" type="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDeleteClick(record)} />
            </div>
          )
        },
      },
  ]

  // 处理函数
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const handleCreateClick = (employee: EmployeeApiKeyInfo) => {
    setSelectedEmployee(employee)
    setCreateDialogOpen(true)
    setTimeout(() => {
      createFormRef.current?.reset()
      createFormRef.current?.setValues({
        name: `${employee.name}的API密钥`,
        expires_in_days: 365,
      })
    }, 0)
  }

  const handleCreateSubmit = (formData: ApiKeyFormValues) => {
    if (!selectedEmployee) return
    createMutation.mutate({
      employeeId: selectedEmployee.employee_id,
      name: formData.name || '',
      expires_in_days: formData.expires_in_days || 365,
    })
  }

  const handleRegenerateClick = (employee: EmployeeApiKeyInfo) => {
    setSelectedEmployee(employee)
    regenerateMutation.mutate(employee.employee_id)
  }

  const handleDeleteClick = (employee: EmployeeApiKeyInfo) => {
    setSelectedEmployee(employee)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedEmployee) return
    deleteMutation.mutate(selectedEmployee.employee_id)
  }

  const handleCopyToClipboard = async (text: string) => {
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(text)
    if (success) {
      toast.success('API密钥已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  return (
    <>
      <DataTableLayout
        title="API密钥管理"
        total={total}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索姓名或用户名..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={hasApiKeyFilter}
              onChange={(v) => setHasApiKeyFilter(v as string)}
              optionList={apiKeyFilterOptions}
              style={{ width: 140 }}
            />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={total}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建密钥弹窗 */}
      <Modal
        title="创建API密钥"
        visible={createDialogOpen}
        onCancel={() => setCreateDialogOpen(false)}
        style={{ maxWidth: 600 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => createFormRef.current?.submitForm()} loading={createMutation.isPending}>创建密钥</Button>
          </div>
        }
      >
        <div style={{ marginBottom: 12, color: 'var(--semi-color-text-2)', fontSize: 14 }}>
          为员工 {selectedEmployee?.name}（{selectedEmployee?.username}）创建API密钥
        </div>
        <Form
          getFormApi={(api) => { createFormRef.current = api }}
          onSubmit={handleCreateSubmit}
          labelPosition="top"
        >
          <Form.Input field="name" label="密钥名称" placeholder="请输入密钥名称" rules={[{ required: true, message: '请输入密钥名称' }, { max: 100, message: '名称最多100个字符' }]} />
          <Form.InputNumber field="expires_in_days" label="有效期（天）" min={1} max={3650} style={{ width: '100%' }} initValue={365} />
          <div style={{ color: 'var(--semi-color-text-2)', fontSize: 12, marginTop: -8, marginBottom: 12 }}>最短1天，最长10年（3650天）</div>
        </Form>
      </Modal>

      {/* 密钥结果弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            API密钥已生成
          </div>
        }
        visible={keyResultDialogOpen}
        onCancel={() => {
          setKeyResultDialogOpen(false)
          setCreatedKey(null)
          setShowKey(false)
        }}
        footer={
          <Button theme="solid" type="primary" onClick={() => {
            setKeyResultDialogOpen(false)
            setCreatedKey(null)
            setShowKey(false)
          }}>
            我已安全保存
          </Button>
        }
        style={{ maxWidth: 550 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Banner
            type="danger"
            icon={<AlertTriangle className="h-4 w-4" />}
            title="重要提示"
            description="请立即复制并安全保存此API密钥，它只会显示一次！关闭此对话框后将无法再次查看完整密钥。"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
              <Text strong>员工：</Text>
              <span>{createdKey?.name}（{createdKey?.username}）</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
              <Text strong>密钥名称：</Text>
              <span>{createdKey?.info.name}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'flex-start' }}>
              <Text strong>API密钥：</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="flex items-center gap-2">
                  <code style={{ background: 'var(--semi-color-fill-0)', padding: '4px 8px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all', flex: 1 }}>
                    {showKey ? createdKey?.api_key : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button theme="borderless" type="tertiary" icon={showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={() => setShowKey(!showKey)} />
                </div>
                <Button theme="outline" className="rmf-copy-button" icon={<Copy className="h-4 w-4" />} block onClick={() => handleCopyToClipboard(createdKey?.api_key || '')}>
                  复制API密钥
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>删除</Button>
          </div>
        }
      >
        确定要删除员工 {selectedEmployee?.name} 的API密钥吗？删除后，使用该密钥的所有应用将无法访问API。
      </Modal>
    </>
  )
}
