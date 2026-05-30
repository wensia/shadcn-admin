/**
 * ASR 配置内容组件
 * 用于集成配置页面的 Tab 内容
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mic, Plus, Pencil, Trash2, Play, CheckCircle, AlertCircle, Star } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import type { SemiTagColor } from '@/lib/semi-types'
import { Table, Button, Input, Modal, Form, Tag, Skeleton, Typography, Tooltip } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { isSkeletonRow, SKELETON_ID_PREFIX } from '@/lib/table-utils'
import { asrConfigApi, type ASRConfigCreate, type ASRConfigUpdate } from '../../api'
import { ASR_PROVIDER_OPTIONS, type ASRConfigItem, type ASRProvider } from '../../types'
import { StatusBadge } from '../../components/status-badge'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

// 提供商字段配置
const PROVIDER_FIELD_CONFIGS: Record<ASRProvider, {
  required: string[]
  optional: string[]
  toggles: string[]
  labels: Record<string, string>
  descriptions?: Record<string, string>
}> = {
  volcengine: {
    required: ['app_id', 'access_token'],
    optional: ['resource_id'],
    toggles: ['enable_emotion_detection', 'enable_channel_split', 'enable_speaker_info', 'enable_itn', 'enable_punc'],
    labels: {
      app_id: 'APP ID',
      access_token: 'Access Token',
      resource_id: '资源 ID (X-Api-Resource-Id)',
      enable_emotion_detection: '启用情绪检测',
      enable_channel_split: '启用双声道识别',
      enable_speaker_info: '启用说话人分离',
      enable_itn: '启用文本规范化',
      enable_punc: '启用标点符号',
    },
    descriptions: {
      app_id: '火山引擎控制台获取，对应 HTTP 头 X-Api-App-Key',
      access_token: '火山引擎控制台获取，对应 HTTP 头 X-Api-Access-Key',
      resource_id: '仅支持 volc.seedasr.auc（豆包录音文件识别模型2.0）',
      enable_emotion_detection: '识别说话人情绪（angry/happy/neutral/sad/surprise）',
      enable_channel_split: '区分左右声道，适合双人对话录音',
      enable_speaker_info: '说话人聚类分离（最多10人）',
      enable_itn: '数字、时间等文本规范化',
      enable_punc: '自动添加标点符号',
    }
  },
  tencent: {
    required: ['secret_id', 'secret_key', 'app_id'],
    optional: ['engine_type'],
    toggles: [],
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
    toggles: [],
    labels: {
      access_key_id: 'Access Key ID',
      access_key_secret: 'Access Key Secret',
      app_key: 'App Key',
    }
  },
}

// 火山引擎默认值
const VOLCENGINE_DEFAULTS = {
  resource_id: 'volc.seedasr.auc',
  enable_emotion_detection: true,
  enable_channel_split: true,
  enable_speaker_info: false,
  enable_itn: true,
  enable_punc: true,
}

// 骨架屏数据
function createSkeletonData(count: number): ASRConfigItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    provider: 'volcengine' as ASRProvider,
    name: '',
    credentials: {},
    is_active: true,
    is_default: false,
    last_verified_at: null,
    notes: null,
  }))
}

export function ASRConfigContent() {
  const queryClient = useQueryClient()
  const formRef = useRef<FormApi | null>(null)

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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-asr-configs', page, pageSize, searchValue],
    queryFn: async () => {
      const response = await asrConfigApi.list({
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

  const getProviderLabel = (provider: string) => {
    const option = ASR_PROVIDER_OPTIONS.find(opt => opt.value === provider)
    return option?.label || provider
  }

  const getProviderTagColor = (provider: string): SemiTagColor => {
    switch (provider) {
      case 'volcengine': return 'blue'
      case 'tencent': return 'green'
      case 'alibaba': return 'orange'
      default: return 'grey'
    }
  }

  const columns: ColumnProps<ASRConfigItem>[] = [
      {
        title: '配置名称',
        dataIndex: 'name',
        width: 250,
        render: (_: unknown, record: ASRConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 160 }} />
          }
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{record.name}</span>
                {record.is_default && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                )}
              </div>
              {record.notes && (
                <Text type="tertiary" size="small" ellipsis={{ showTooltip: true }} style={{ maxWidth: 200 }}>
                  {record.notes}
                </Text>
              )}
            </div>
          )
        },
      },
      {
        title: '提供商',
        dataIndex: 'provider',
        width: 120,
        render: (_: unknown, record: ASRConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
          }
          return (
            <Tag color={getProviderTagColor(record.provider)} size="small">
              {getProviderLabel(record.provider)}
            </Tag>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'is_active',
        width: 100,
        render: (_: unknown, record: ASRConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
          }
          return <StatusBadge isActive={record.is_active} />
        },
      },
      {
        title: '最后验证',
        dataIndex: 'last_verified_at',
        width: 160,
        render: (_: unknown, record: ASRConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          }
          return record.last_verified_at
            ? formatTime(record.last_verified_at)
            : <Text type="tertiary">未验证</Text>
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 150,
        render: (_: unknown, record: ASRConfigItem) => {
          if (isSkeletonRow(record.id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
          }
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="编辑">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Pencil className="h-4 w-4" />} onClick={() => handleEdit(record)} />
                </span>
              </Tooltip>
              <Tooltip content="测试">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Play className="h-4 w-4" />} onClick={() => handleTest(record.id)} loading={testMutation.isPending} />
                </span>
              </Tooltip>
              <Tooltip content="删除">
                <span style={{ display: 'inline-flex' }}>
                  <Button theme="borderless" type="tertiary" icon={<Trash2 className="h-4 w-4 text-red-500" />} onClick={() => handleDeleteClick(record)} />
                </span>
              </Tooltip>
            </div>
          )
        },
      },
    ]

  const tableData = isLoading ? createSkeletonData(5) : (data?.items || [])

  const pagination = useMemo(() => ({
    currentPage: page,
    pageSize,
    total: data?.total || 0,
    onPageChange: setPage,
    onPageSizeChange: (s: number) => { setPageSize(s); setPage(1) },
    showSizeChanger: true,
    pageSizeOpts: [10, 20, 50, 100],
    showTotal: true,
    formatPageText: (info?: { currentStart?: number; currentEnd?: number; total?: number }) =>
      `第 ${info?.currentStart ?? 0}–${info?.currentEnd ?? 0} 条，共 ${info?.total ?? 0} 条`,
  }), [page, pageSize, data?.total])

  const handleCreate = () => {
    setEditingItem(null)
    setSelectedProvider('volcengine')
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)
    setTimeout(() => {
      formRef.current?.setValues({
        provider: 'volcengine',
        name: '',
        notes: '',
        is_default: false,
        is_active: true,
        volcengine_resource_id: VOLCENGINE_DEFAULTS.resource_id,
        volcengine_enable_emotion_detection: VOLCENGINE_DEFAULTS.enable_emotion_detection,
        volcengine_enable_channel_split: VOLCENGINE_DEFAULTS.enable_channel_split,
        volcengine_enable_speaker_info: VOLCENGINE_DEFAULTS.enable_speaker_info,
        volcengine_enable_itn: VOLCENGINE_DEFAULTS.enable_itn,
        volcengine_enable_punc: VOLCENGINE_DEFAULTS.enable_punc,
      })
    }, 0)
  }

  const handleEdit = (item: ASRConfigItem) => {
    setEditingItem(item)
    const provider = item.provider as ASRProvider
    setSelectedProvider(provider)
    setTestStatus({ tested: false, success: false, message: '' })
    setDialogOpen(true)

    const formValues: Record<string, unknown> = {
      provider,
      name: item.name,
      notes: item.notes || '',
      is_default: item.is_default,
      is_active: item.is_active,
    }

    if (provider === 'volcengine') {
      formValues.volcengine_app_id = String(item.credentials.app_id || '')
      formValues.volcengine_access_token = String(item.credentials.access_token || '')
      formValues.volcengine_resource_id = String(item.credentials.resource_id || VOLCENGINE_DEFAULTS.resource_id)
      formValues.volcengine_enable_emotion_detection = Boolean(item.credentials.enable_emotion_detection)
      formValues.volcengine_enable_channel_split = Boolean(item.credentials.enable_channel_split)
      formValues.volcengine_enable_speaker_info = Boolean(item.credentials.enable_speaker_info)
      formValues.volcengine_enable_itn = Boolean(item.credentials.enable_itn)
      formValues.volcengine_enable_punc = Boolean(item.credentials.enable_punc)
    } else if (provider === 'tencent') {
      formValues.tencent_secret_id = String(item.credentials.secret_id || '')
      formValues.tencent_secret_key = String(item.credentials.secret_key || '')
      formValues.tencent_app_id = String(item.credentials.app_id || '')
      formValues.tencent_engine_type = String(item.credentials.engine_type || '')
    } else if (provider === 'alibaba') {
      formValues.alibaba_access_key_id = String(item.credentials.access_key_id || '')
      formValues.alibaba_access_key_secret = String(item.credentials.access_key_secret || '')
      formValues.alibaba_app_key = String(item.credentials.app_key || '')
    }

    setTimeout(() => {
      formRef.current?.setValues(formValues)
    }, 0)
  }

  const handleDeleteClick = (item: ASRConfigItem) => {
    setDeletingItem(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteMutation.mutate(deletingItem.id)
    }
  }

  const handleTest = (id: string) => {
    testMutation.mutate(id)
  }

  const handleSubmit = (formData: Record<string, unknown>) => {
    const provider = formData.provider as ASRProvider
    const config = PROVIDER_FIELD_CONFIGS[provider]

    const credentials: Record<string, string | boolean> = {}

    if (provider === 'volcengine') {
      if (formData.volcengine_app_id) credentials.app_id = formData.volcengine_app_id as string
      if (formData.volcengine_access_token) credentials.access_token = formData.volcengine_access_token as string
      credentials.resource_id = VOLCENGINE_DEFAULTS.resource_id
      credentials.enable_emotion_detection = (formData.volcengine_enable_emotion_detection as boolean) ?? VOLCENGINE_DEFAULTS.enable_emotion_detection
      credentials.enable_channel_split = (formData.volcengine_enable_channel_split as boolean) ?? VOLCENGINE_DEFAULTS.enable_channel_split
      credentials.enable_speaker_info = (formData.volcengine_enable_speaker_info as boolean) ?? VOLCENGINE_DEFAULTS.enable_speaker_info
      credentials.enable_itn = (formData.volcengine_enable_itn as boolean) ?? VOLCENGINE_DEFAULTS.enable_itn
      credentials.enable_punc = (formData.volcengine_enable_punc as boolean) ?? VOLCENGINE_DEFAULTS.enable_punc
    } else if (provider === 'tencent') {
      if (formData.tencent_secret_id) credentials.secret_id = formData.tencent_secret_id as string
      if (formData.tencent_secret_key) credentials.secret_key = formData.tencent_secret_key as string
      if (formData.tencent_app_id) credentials.app_id = formData.tencent_app_id as string
      if (formData.tencent_engine_type) credentials.engine_type = formData.tencent_engine_type as string
    } else if (provider === 'alibaba') {
      if (formData.alibaba_access_key_id) credentials.access_key_id = formData.alibaba_access_key_id as string
      if (formData.alibaba_access_key_secret) credentials.access_key_secret = formData.alibaba_access_key_secret as string
      if (formData.alibaba_app_key) credentials.app_key = formData.alibaba_app_key as string
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
        name: formData.name as string,
        notes: formData.notes as string,
        is_active: formData.is_active as boolean,
        is_default: formData.is_default as boolean,
      }

      const filteredCredentials: Record<string, string | boolean> = {}
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === 'boolean') {
          filteredCredentials[key] = value
        } else if (value && !String(value).includes('***')) {
          filteredCredentials[key] = value
        }
      }
      if (Object.keys(filteredCredentials).length > 0) {
        updateData.credentials = filteredCredentials
      }

      updateMutation.mutate({ id: editingItem.id, data: updateData })
    } else {
      const createData: ASRConfigCreate = {
        provider,
        name: formData.name as string,
        credentials,
        is_default: formData.is_default as boolean,
        notes: formData.notes as string,
      }
      createMutation.mutate(createData)
    }
  }

  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const renderCredentialFields = () => {
    const config = PROVIDER_FIELD_CONFIGS[selectedProvider]
    const prefix = selectedProvider

    const renderTextField = (fieldKey: string, required: boolean) => {
      const formKey = `${prefix}_${fieldKey}`
      const label = config.labels[fieldKey]
      const description = config.descriptions?.[fieldKey]
      const isPasswordField = fieldKey.includes('secret') || fieldKey.includes('token') || fieldKey.includes('key')
      const isDisabled = fieldKey === 'resource_id' && prefix === 'volcengine'

      return (
        <Form.Input
          key={formKey}
          field={formKey}
          label={<span>{label}{required && <span className="text-red-500 ml-1">*</span>}</span>}
          placeholder={`请输入${label}`}
          mode={isPasswordField ? 'password' : undefined}
          disabled={isDisabled}
          extraText={description}
        />
      )
    }

    const renderToggleField = (fieldKey: string) => {
      const formKey = `${prefix}_${fieldKey}`
      const label = config.labels[fieldKey]
      const description = config.descriptions?.[fieldKey]

      return (
        <div key={formKey} className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">{label}</div>
            {description && <div className="text-xs text-gray-500">{description}</div>}
          </div>
          <Form.Switch field={formKey} noLabel />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="text-sm font-medium text-gray-500">凭证信息</div>
        {config.required.map(field => renderTextField(field, true))}
        {config.optional.map(field => renderTextField(field, false))}

        {config.toggles.length > 0 && (
          <>
            <div className="text-sm font-medium text-gray-500 pt-2">功能配置</div>
            {config.toggles.map(field => renderToggleField(field))}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索配置名称或提供商..."
              style={{ width: 256 }}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
            />
            <Button theme="outline" onClick={handleSearch}>搜索</Button>
            <Button theme="borderless" type="tertiary" icon={<IconRefresh />} onClick={() => refetch()} />
          </div>
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
            新增配置
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-hidden">
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            pagination={data && data.total > 0 ? pagination : false}
            loading={false}
            empty="暂无数据"
          />
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingItem ? '编辑 ASR 配置' : '新增 ASR 配置'}
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => formRef.current?.submitForm()} loading={createMutation.isPending || updateMutation.isPending}>
              保存
            </Button>
          </div>
        }
        width={600}
        style={{ maxHeight: '90vh' }}
      >
        <div className="text-sm text-gray-500 mb-4">
          {editingItem ? '修改语音识别服务配置' : '添加一个新的语音识别服务配置'}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <Form
            getFormApi={(api) => { formRef.current = api }}
            onSubmit={handleSubmit}
            labelPosition="top"
          >
            <Form.Select
              field="provider"
              label="服务提供商"
              optionList={ASR_PROVIDER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
              disabled={!!editingItem}
              onChange={(v) => setSelectedProvider(v as ASRProvider)}
              rules={[{ required: true, message: '请选择服务提供商' }]}
            />

            <Form.Input
              field="name"
              label="配置名称"
              placeholder="请输入配置名称"
              rules={[{ required: true, message: '请输入配置名称' }]}
            />

            {renderCredentialFields()}

            <Form.TextArea
              field="notes"
              label="备注"
              placeholder="请输入备注（可选）"
            />

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">设为默认</div>
                <div className="text-xs text-gray-500">使用此配置作为默认 ASR 服务</div>
              </div>
              <Form.Switch field="is_default" noLabel />
            </div>

            {editingItem && (
              <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">启用状态</div>
                  <div className="text-xs text-gray-500">设置该配置是否启用</div>
                </div>
                <Form.Switch field="is_active" noLabel />
              </div>
            )}
          </Form>

          {testStatus.tested && (
            <div className={`mt-4 rounded-md border p-3 ${testStatus.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {testStatus.success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
                <span className={testStatus.success ? 'text-green-700' : 'text-red-700'}>{testStatus.message}</span>
              </div>
            </div>
          )}
        </div>
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
