/**
 * ASR 配置管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mic, Plus, Pencil, Trash2, Play, Star } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import type { SemiTagColor } from '@/lib/semi-types'

import { Form, Button, Modal, Input, Typography, Tag, Banner } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { asrConfigApi, type ASRConfigCreate, type ASRConfigUpdate } from '../api'
import { ASR_PROVIDER_OPTIONS, type ASRConfigItem, type ASRProvider } from '../types'
import { StatusBadge } from '../components/status-badge'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

interface ASRConfigFormValues {
  provider: ASRProvider
  name: string
  notes?: string
  is_default: boolean
  is_active: boolean
  volcengine_app_id?: string
  volcengine_access_token?: string
  volcengine_cluster?: string
  tencent_secret_id?: string
  tencent_secret_key?: string
  tencent_app_id?: string
  tencent_engine_type?: string
  alibaba_access_key_id?: string
  alibaba_access_key_secret?: string
  alibaba_app_key?: string
}

// 提供商字段配置（本地定义，不依赖后端）
const PROVIDER_FIELD_CONFIGS: Record<ASRProvider, { required: string[]; optional: string[]; labels: Record<string, string> }> = {
  volcengine: {
    required: ['app_id', 'access_token'],
    optional: ['cluster'],
    labels: {
      app_id: 'App ID',
      access_token: 'Access Token',
      cluster: '集群 ID',
    }
  },
  tencent: {
    required: ['secret_id', 'secret_key', 'app_id'],
    optional: ['engine_type'],
    labels: {
      secret_id: 'Secret ID',
      secret_key: 'Secret Key',
      app_id: 'App ID',
      engine_type: '引擎类型',
    }
  },
  alibaba: {
    required: ['access_key_id', 'access_key_secret', 'app_key'],
    optional: [],
    labels: {
      access_key_id: 'Access Key ID',
      access_key_secret: 'Access Key Secret',
      app_key: 'App Key',
    }
  },
}


export function ASRConfigPage() {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ASRConfigItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ASRConfigItem | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<ASRProvider>('volcengine')
  const [testStatus, setTestStatus] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false,
    success: false,
    message: '',
  })

  // 查询数据
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-asr-configs', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await asrConfigApi.list({
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
      // 客户端搜索过滤
      if (searchValue) {
        const filtered = response.items.filter(item =>
          item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.provider.toLowerCase().includes(searchValue.toLowerCase())
        )
        return { items: filtered, total: filtered.length }
      }
      return response
    },
  })

  // 创建
  const createMutation = useMutation({
    mutationFn: (data: ASRConfigCreate) => asrConfigApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-asr-configs'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  // 更新
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ASRConfigUpdate }) =>
      asrConfigApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-asr-configs'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 删除
  const deleteMutation = useMutation({
    mutationFn: (id: string) => asrConfigApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-asr-configs'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  // 测试
  const testMutation = useMutation({
    mutationFn: (id: string) => asrConfigApi.test(id),
    onSuccess: (result) => {
      setTestStatus({
        tested: true,
        success: result.success,
        message: result.message || 'ASR 配置测试成功',
      })
      if (result.success) {
        toast.success('测试成功')
      } else {
        toast.error(result.message || '测试失败')
      }
    },
    onError: (error: Error) => {
      setTestStatus({
        tested: true,
        success: false,
        message: error.message || 'ASR 配置测试失败',
      })
      showApiErrorToast(error, '测试失败')
    },
  })

  // 提供商标签
  const getProviderLabel = (provider: string) => {
    const option = ASR_PROVIDER_OPTIONS.find(opt => opt.value === provider)
    return option?.label || provider
  }

  // 提供商徽章颜色
  const getProviderTagColor = (provider: string): SemiTagColor | undefined => {
    switch (provider) {
      case 'volcengine':
        return 'blue'
      case 'tencent':
        return undefined // default
      case 'alibaba':
        return 'grey'
      default:
        return undefined
    }
  }

  // 列定义
  const columns: ColumnProps<ASRConfigItem>[] = [
      {
        title: '配置名称',
        dataIndex: 'name',
        width: 250,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={160} />
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic className="h-4 w-4" style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 500 }}>{record!.name}</span>
                {record!.is_default && (
                  <Star className="h-3.5 w-3.5" style={{ fill: '#facc15', color: '#facc15' }} />
                )}
              </div>
              {record!.notes && (
                <Text type="tertiary" size="small" ellipsis={{ rows: 1 }}>{record!.notes}</Text>
              )}
            </div>
          )
        },
      },
      {
        title: '提供商',
        dataIndex: 'provider',
        width: 120,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={64} />
          }
          return (
            <Tag color={getProviderTagColor(record!.provider)}>
              {getProviderLabel(record!.provider)}
            </Tag>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={56} />
          }
          return <StatusBadge isActive={record!.is_active} />
        },
      },
      {
        title: '最后验证',
        dataIndex: 'last_verified_at',
        width: 160,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={128} />
          }
          return record!.last_verified_at
            ? formatTime(record!.last_verified_at)
            : <Text type="tertiary">未验证</Text>
        },
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 150,
        render: (_, record) => {
          if (isSkeletonRow(record!.id)) {
            return <SemiSkeletonCell width={96} />
          }
          return (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Pencil className="h-4 w-4" />}
                size="small"
                onClick={() => handleEdit(record!)}
              />
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Play className="h-4 w-4" />}
                size="small"
                onClick={() => testMutation.mutate(record!.id)}
                disabled={testMutation.isPending}
              />
              <Button
                theme="borderless"
                type="danger"
                icon={<Trash2 className="h-4 w-4" />}
                size="small"
                onClick={() => handleDeleteClick(record!)}
              />
            </div>
          )
        },
      },
    ]

  const items = useMemo(() => data?.items ?? [], [data?.items])

  // 打开新增对话框
  const handleCreate = () => {
    setEditingItem(null)
    setSelectedProvider('volcengine')
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.reset()
      formRef.current?.setValues({ provider: 'volcengine', is_default: false, is_active: true })
    }, 0)
  }

  // 打开编辑对话框
  const handleEdit = (item: ASRConfigItem) => {
    setEditingItem(item)
    const provider = item.provider as ASRProvider
    setSelectedProvider(provider)
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    setTimeout(() => {
      const values: ASRConfigFormValues = {
        provider,
        name: item.name,
        notes: item.notes || '',
        is_default: item.is_default,
        is_active: item.is_active,
      }

      // 根据提供商填充凭证字段
      if (provider === 'volcengine') {
        values.volcengine_app_id = String(item.credentials.app_id || '')
        values.volcengine_access_token = String(item.credentials.access_token || '')
        values.volcengine_cluster = String(item.credentials.cluster || '')
      } else if (provider === 'tencent') {
        values.tencent_secret_id = String(item.credentials.secret_id || '')
        values.tencent_secret_key = String(item.credentials.secret_key || '')
        values.tencent_app_id = String(item.credentials.app_id || '')
        values.tencent_engine_type = String(item.credentials.engine_type || '')
      } else if (provider === 'alibaba') {
        values.alibaba_access_key_id = String(item.credentials.access_key_id || '')
        values.alibaba_access_key_secret = String(item.credentials.access_key_secret || '')
        values.alibaba_app_key = String(item.credentials.app_key || '')
      }

      formRef.current?.setValues(values)
    }, 0)
  }

  // 点击删除按钮
  const handleDeleteClick = (item: ASRConfigItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  // 确认删除
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 提交表单
  const handleSubmit = (values: ASRConfigFormValues) => {
    const provider = values.provider
    const config = PROVIDER_FIELD_CONFIGS[provider]

    // 构建凭证对象
    const credentials: Record<string, string> = {}

    if (provider === 'volcengine') {
      if (values.volcengine_app_id) credentials.app_id = values.volcengine_app_id
      if (values.volcengine_access_token) credentials.access_token = values.volcengine_access_token
      if (values.volcengine_cluster) credentials.cluster = values.volcengine_cluster
    } else if (provider === 'tencent') {
      if (values.tencent_secret_id) credentials.secret_id = values.tencent_secret_id
      if (values.tencent_secret_key) credentials.secret_key = values.tencent_secret_key
      if (values.tencent_app_id) credentials.app_id = values.tencent_app_id
      if (values.tencent_engine_type) credentials.engine_type = values.tencent_engine_type
    } else if (provider === 'alibaba') {
      if (values.alibaba_access_key_id) credentials.access_key_id = values.alibaba_access_key_id
      if (values.alibaba_access_key_secret) credentials.access_key_secret = values.alibaba_access_key_secret
      if (values.alibaba_app_key) credentials.app_key = values.alibaba_app_key
    }

    // 验证必填字段
    for (const field of config.required) {
      if (!credentials[field]) {
        toast.error(`请填写必填字段: ${config.labels[field]}`)
        return
      }
    }

    if (editingItem) {
      const updateData: ASRConfigUpdate = {
        name: values.name,
        notes: values.notes,
        is_active: values.is_active,
        is_default: values.is_default,
      }

      const hasCredentialUpdate = Object.values(credentials).some(v => v && !v.includes('***'))
      if (hasCredentialUpdate) {
        const filteredCredentials: Record<string, string> = {}
        for (const [key, value] of Object.entries(credentials)) {
          if (value && !value.includes('***')) {
            filteredCredentials[key] = value
          }
        }
        if (Object.keys(filteredCredentials).length > 0) {
          updateData.credentials = filteredCredentials
        }
      }

      updateMutation.mutate({ id: editingItem.id, data: updateData })
    } else {
      const createData: ASRConfigCreate = {
        provider,
        name: values.name,
        credentials,
        is_default: values.is_default,
        notes: values.notes,
      }
      createMutation.mutate(createData)
    }
  }

  // 搜索
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  // 提供商选项
  const providerOptions = useMemo(() =>
    ASR_PROVIDER_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
    })), []
  )

  // 渲染凭证字段
  const renderCredentialFields = () => {
    const config = PROVIDER_FIELD_CONFIGS[selectedProvider]
    const prefix = selectedProvider

    const renderField = (fieldKey: string, required: boolean) => {
      const formKey = `${prefix}_${fieldKey}`
      const label = config.labels[fieldKey]
      const isPasswordField = fieldKey.includes('secret') || fieldKey.includes('token') || fieldKey.includes('key')

      return (
        <Form.Input
          key={formKey}
          field={formKey}
          label={
            <span>
              {label}
              {required && <span style={{ color: 'var(--semi-color-danger)', marginLeft: 4 }}>*</span>}
            </span>
          }
          placeholder={`请输入${label}`}
          mode={isPasswordField ? 'password' : undefined}
        />
      )
    }

    return (
      <>
        <Text type="tertiary" size="small" style={{ fontWeight: 500 }}>凭证信息</Text>
        {config.required.map(field => renderField(field, true))}
        {config.optional.map(field => renderField(field, false))}
      </>
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <DataTableLayout
        title="ASR 配置管理"
        total={data?.total}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新增配置
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索配置名称或提供商..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
          </div>
        }
      >
        <SemiDataTable
          columns={columns}
          data={items}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑 ASR 配置' : '新增 ASR 配置'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        style={{ maxWidth: 600 }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={isPending}>
              保存
            </Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
          onValueChange={(values) => {
            if (values.provider && values.provider !== selectedProvider) {
              setSelectedProvider(values.provider as ASRProvider)
            }
          }}
        >
          <Form.Select
            field="provider"
            label="服务提供商"
            optionList={providerOptions}
            disabled={!!editingItem}
            rules={[{ required: true, message: '请选择服务提供商' }]}
            style={{ width: '100%' }}
          />

          <Form.Input
            field="name"
            label="配置名称"
            placeholder="请输入配置名称"
            rules={[{ required: true, message: '请输入配置名称' }]}
          />

          {/* 凭证字段 */}
          {renderCredentialFields()}

          <Form.TextArea
            field="notes"
            label="备注"
            placeholder="请输入备注（可选）"
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, border: '1px solid var(--semi-color-border)', padding: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 500 }}>设为默认</div>
              <Text type="tertiary" size="small">使用此配置作为默认 ASR 服务</Text>
            </div>
            <Form.Switch field="is_default" noLabel />
          </div>

          {editingItem && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, border: '1px solid var(--semi-color-border)', padding: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 500 }}>启用状态</div>
                <Text type="tertiary" size="small">设置该配置是否启用</Text>
              </div>
              <Form.Switch field="is_active" noLabel />
            </div>
          )}

          {/* 测试结果提示 */}
          {testStatus.tested && (
            <Banner
              type={testStatus.success ? 'success' : 'danger'}
              description={testStatus.message}
            />
          )}
        </Form>
      </Modal>

      {/* 删除确认对话框 */}
      <Modal
        title="确认删除"
        visible={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="danger" onClick={handleDeleteConfirm} loading={deleteMutation.isPending}>
              删除
            </Button>
          </div>
        }
      >
        确定要删除 ASR 配置「{deletingItem?.name}」吗？此操作不可撤销。
      </Modal>
    </>
  )
}
