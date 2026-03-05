/**
 * AI 配置内容组件
 * 用于集成配置页面的 Tab 内容
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BrainCircuit, Plus, Pencil, Trash2, Play, Star } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Button, Input, Modal, Form, Tag, Skeleton, Typography } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { IconSearch } from '@douyinfe/semi-icons'
import { isSkeletonRow } from '@/lib/table-utils'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { aiConfigApi, type AIConfigCreate, type AIConfigUpdate } from '../../api'
import { AI_PROVIDER_OPTIONS, type AIConfigItem, type AIProvider } from '../../types'
import { StatusBadge } from '../../components/status-badge'

const { Text } = Typography

interface AIConfigFormValues {
  provider: AIProvider
  name: string
  api_key: string
  base_url: string
  default_model: string
  endpoint_id?: string
  notes?: string
  is_default: boolean
  is_active: boolean
}

// 提供商默认值
const PROVIDER_DEFAULTS: Record<AIProvider, { base_url: string; default_model: string }> = {
  doubao: {
    base_url: 'https://ark.cn-beijing.volces.com/api/v3',
    default_model: 'doubao-seed-1-8-251228',
  },
  deepseek: {
    base_url: 'https://api.deepseek.com/v1',
    default_model: 'deepseek-chat',
  },
  kimi: {
    base_url: 'https://api.moonshot.cn/v1',
    default_model: 'moonshot-v1-8k',
  },
  openai: {
    base_url: '',
    default_model: 'gemini-2.5-flash',
  },
  volcengine_voice: {
    base_url: '',
    default_model: 'cn-beijing',
  },
}

export function AIConfigContent() {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi>()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AIConfigItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<AIConfigItem | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('doubao')
  const [testStatus, setTestStatus] = useState<{ tested: boolean; success: boolean; message: string }>({
    tested: false,
    success: false,
    message: '',
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-ai-configs', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await aiConfigApi.list({
        skip: (page - 1) * pageSize,
        limit: pageSize,
      })
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

  const createMutation = useMutation({
    mutationFn: (data: AIConfigCreate) => aiConfigApi.create(data),
    onSuccess: () => {
      toast.success('创建成功')
      setDialogOpen(false)
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs-all'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '创建失败')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AIConfigUpdate }) =>
      aiConfigApi.update(id, data),
    onSuccess: () => {
      toast.success('更新成功')
      setDialogOpen(false)
      setEditingItem(null)
      setTestStatus({ tested: false, success: false, message: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs-all'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiConfigApi.delete(id),
    onSuccess: () => {
      toast.success('删除成功')
      setDeleteDialogOpen(false)
      setDeletingItem(null)
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ai-configs-all'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '删除失败')
    },
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => aiConfigApi.test(id),
    onSuccess: (result) => {
      setTestStatus({
        tested: true,
        success: result.success,
        message: result.message || 'AI 配置测试成功',
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
        message: error.message || 'AI 配置测试失败',
      })
      showApiErrorToast(error, '测试失败')
    },
  })

  const getProviderLabel = (provider: string) =>
    AI_PROVIDER_OPTIONS.find(opt => opt.value === provider)?.label || provider

  const getProviderTagColor = (provider: string): string | undefined =>
    provider === 'doubao' ? 'blue' : provider === 'kimi' ? undefined : undefined

  const columns: ColumnProps<AIConfigItem>[] = [
      {
        title: '配置名称',
        dataIndex: 'name',
        width: 220,
        render: (_: unknown, record: AIConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 160 }} />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-purple-500" />
                <span className="font-medium">{record.name}</span>
                {record.is_default && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              {record.notes && (
                <Text type="tertiary" size="small" className="line-clamp-1">{record.notes}</Text>
              )}
            </div>
          )
        },
      },
      {
        title: '提供商',
        dataIndex: 'provider',
        width: 140,
        render: (_: unknown, record: AIConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
          }
          return (
            <Tag color={getProviderTagColor(record.provider)} size="small">
              {getProviderLabel(record.provider)}
            </Tag>
          )
        },
      },
      {
        title: '模型',
        dataIndex: 'default_model',
        width: 200,
        render: (_: unknown, record: AIConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          }
          return (
            <span className="font-mono text-xs">
              {record.default_model || record.endpoint_id || '-'}
            </span>
          )
        },
      },
      {
        title: 'API Key',
        dataIndex: 'api_key_masked',
        width: 140,
        render: (_: unknown, record: AIConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
          }
          return (
            <Text type="tertiary" className="font-mono text-xs">
              {record.api_key_masked}
            </Text>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_: unknown, record: AIConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
          }
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 150,
        render: (_: unknown, record: AIConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
          }
          return (
            <div className="flex items-center gap-1">
              <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} onClick={() => handleEdit(record)} title="编辑" />
              <Button theme="borderless" type="tertiary" icon={<Play className="h-4 w-4" />} onClick={() => testMutation.mutate(record.id)} disabled={testMutation.isPending} title="测试" />
              <Button theme="borderless" type="tertiary" icon={<Trash2 className="h-4 w-4 text-red-500" />} onClick={() => handleDeleteClick(record)} title="删除" />
            </div>
          )
        },
      },
    ]

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0

  const handleCreate = () => {
    setEditingItem(null)
    setSelectedProvider('doubao')
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    // 延迟设置表单值，等待 Form 挂载
    setTimeout(() => {
      formRef.current?.setValues({
        provider: 'doubao',
        name: '',
        api_key: '',
        base_url: PROVIDER_DEFAULTS.doubao.base_url,
        default_model: PROVIDER_DEFAULTS.doubao.default_model,
        endpoint_id: '',
        notes: '',
        is_default: false,
        is_active: true,
      })
    }, 0)
  }

  const handleEdit = (item: AIConfigItem) => {
    setEditingItem(item)
    setSelectedProvider(item.provider)
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        provider: item.provider,
        name: item.name,
        api_key: item.api_key_masked,
        base_url: item.base_url,
        default_model: item.default_model || '',
        endpoint_id: item.endpoint_id || '',
        notes: item.notes || '',
        is_default: item.is_default,
        is_active: item.is_active,
      })
    }, 0)
  }

  const handleDeleteClick = (item: AIConfigItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  // 提供商切换时更新默认值
  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider)
    if (!editingItem) {
      const defaults = PROVIDER_DEFAULTS[provider]
      formRef.current?.setValues({
        base_url: defaults.base_url,
        default_model: defaults.default_model,
        endpoint_id: '',
      })
    }
  }

  const handleSubmit = (formData: AIConfigFormValues) => {
    if (editingItem) {
      const updateData: AIConfigUpdate = {
        name: formData.name,
        base_url: formData.base_url,
        default_model: formData.default_model,
        endpoint_id: formData.endpoint_id || undefined,
        is_active: formData.is_active,
        is_default: formData.is_default,
        notes: formData.notes,
      }
      // 只有非脱敏值才更新 api_key
      if (formData.api_key && !formData.api_key.includes('***')) {
        updateData.api_key = formData.api_key
      }
      updateMutation.mutate({ id: editingItem.id, data: updateData })
    } else {
      const createData: AIConfigCreate = {
        provider: formData.provider,
        name: formData.name,
        api_key: formData.api_key,
        base_url: formData.base_url,
        default_model: formData.default_model,
        endpoint_id: formData.endpoint_id || undefined,
        is_default: formData.is_default,
        notes: formData.notes,
      }
      createMutation.mutate(createData)
    }
  }

  const handleSearch = () => { setPage(1); refetch() }

  const isVoiceProvider = selectedProvider === 'volcengine_voice'

  const apiKeyLabel = isVoiceProvider ? 'Access Key (AK)' : 'API Key'
  const baseUrlLabel = isVoiceProvider ? 'Secret Key (SK)' : 'Base URL'
  const modelLabel = isVoiceProvider ? '地域 (Region)' : '默认模型'
  const endpointLabel = isVoiceProvider ? '语音互动 App ID' : '端点 ID（可选）'

  const providerDescription = isVoiceProvider
    ? '火山引擎 Access Key'
    : selectedProvider === 'doubao'
      ? '火山引擎方舟平台 API Key'
      : selectedProvider === 'deepseek'
        ? 'DeepSeek 平台 API Key'
        : selectedProvider === 'openai'
          ? 'OpenAI 兼容 API Key（如 Antigravity Manager）'
          : 'Moonshot 平台 API Key'

  const baseUrlDescription = isVoiceProvider
    ? '火山引擎 Secret Key'
    : `默认: ${PROVIDER_DEFAULTS[selectedProvider]?.base_url || ''}`

  const modelPlaceholder = isVoiceProvider
    ? '例如: cn-beijing'
    : selectedProvider === 'doubao'
      ? '例如: doubao-seed-1-8-251228'
      : selectedProvider === 'openai'
        ? '例如: gemini-2.5-flash'
        : '模型名称'

  const modelDescription = isVoiceProvider
    ? '火山引擎服务地域，默认 cn-beijing'
    : selectedProvider === 'doubao'
      ? '可直接使用模型名称（如 doubao-seed-1-8-251228），也可使用端点 ID'
      : selectedProvider === 'openai'
        ? '反向代理中配置的模型名称（如 gemini-2.5-flash）'
        : '调用时使用的模型名称'

  return (
    <>
      <DataTableLayout
        title="模型配置"
        total={total}
        headerActions={
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新增配置
          </Button>
        }
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Input
              prefix={<IconSearch />}
              placeholder="搜索配置名称或提供商..."
              style={{ width: 256 }}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
            />
            <Button theme="outline" onClick={handleSearch}>搜索</Button>
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
          scrollX={950}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </DataTableLayout>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑 AI 配置' : '新增 AI 配置'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={550}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button
              theme="solid"
              type="primary"
              onClick={() => formRef.current?.submitForm()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              保存
            </Button>
          </div>
        }
        bodyStyle={{ maxHeight: '60vh', overflow: 'auto' }}
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 16 }}>
          {editingItem ? '修改 AI 大模型服务配置' : '添加一个新的 AI 大模型服务配置'}
        </Text>
        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={handleSubmit}
          labelPosition="top"
        >
          <Form.Select
            field="provider"
            label="服务提供商"
            rules={[{ required: true, message: '请选择服务提供商' }]}
            optionList={AI_PROVIDER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
            disabled={!!editingItem}
            onChange={(v) => handleProviderChange(v as AIProvider)}
          />

          <Form.Input
            field="name"
            label="配置名称"
            placeholder="例如：豆包通话分析"
            rules={[
              { required: true, message: '请输入配置名称' },
              { max: 100, message: '名称最多100个字符' },
            ]}
          />

          <Form.Input
            field="api_key"
            label={apiKeyLabel}
            placeholder={isVoiceProvider ? '请输入 Access Key' : '请输入 API Key'}
            mode="password"
            rules={[{ required: true, message: isVoiceProvider ? '请输入 Access Key' : '请输入 API 密钥' }]}
            extraText={providerDescription}
          />

          <Form.Input
            field="base_url"
            label={baseUrlLabel}
            placeholder={isVoiceProvider ? '请输入 Secret Key' : 'API 基础地址'}
            mode={isVoiceProvider ? 'password' : undefined}
            extraText={baseUrlDescription}
          />

          <Form.Input
            field="default_model"
            label={modelLabel}
            placeholder={modelPlaceholder}
            extraText={modelDescription}
          />

          {(selectedProvider === 'doubao' || isVoiceProvider) && (
            <Form.Input
              field="endpoint_id"
              label={endpointLabel}
              placeholder={isVoiceProvider ? '语音互动应用 App ID' : 'ep-xxxxxx'}
              extraText={isVoiceProvider ? '火山引擎语音互动 RTC 应用 ID' : '火山方舟端点 ID，如已填写默认模型名称则可留空'}
              rules={isVoiceProvider ? [{ required: true, message: '请输入语音互动 App ID' }] : undefined}
            />
          )}

          <Form.TextArea
            field="notes"
            label="备注"
            placeholder="请输入备注（可选）"
            rules={[{ max: 500, message: '备注最多500个字符' }]}
          />

          <div className="flex items-center justify-between rounded-lg border p-3 mb-3">
            <div>
              <div className="text-sm font-medium">设为默认</div>
              <Text type="tertiary" size="small">使用此配置作为默认 AI 服务</Text>
            </div>
            <Form.Switch field="is_default" noLabel />
          </div>

          {editingItem && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">启用状态</div>
                <Text type="tertiary" size="small">设置该配置是否启用</Text>
              </div>
              <Form.Switch field="is_active" noLabel />
            </div>
          )}

          {testStatus.tested && (
            <div
              className={`flex items-center gap-2 rounded-md border p-3 mt-3 ${
                testStatus.success ? 'border-green-300 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-700'
              }`}
            >
              {testStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span className="text-sm">{testStatus.message}</span>
            </div>
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
            <Button
              theme="solid"
              type="danger"
              onClick={handleDeleteConfirm}
              loading={deleteMutation.isPending}
            >
              删除
            </Button>
          </div>
        }
      >
        <p>确定要删除 AI 配置「{deletingItem?.name}」吗？此操作不可撤销。</p>
      </Modal>
    </>
  )
}
