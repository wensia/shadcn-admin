/**
 * API密钥管理 - Tab 内容组件
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { Table, Button, Input, Modal, Form, Tag, Skeleton, Typography, Checkbox, Tooltip } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { apiKeysApi } from '../../api'
import type { EmployeeApiKeyInfo, ApiKeyCreateResponse, ApiKeyInfo } from '../../types'
import { DEFAULT_API_SCOPES } from '../../types'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

// 骨架屏数据
const SKELETON_PREFIX = '__skeleton__'
const isSkeletonRow = (id: string) => id.startsWith(SKELETON_PREFIX)

function createSkeletonData(count: number): EmployeeApiKeyInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    employee_id: `${SKELETON_PREFIX}${i}`,
    username: '',
    name: '',
    is_active: true,
    has_api_key: false,
  }))
}

// 权限名称映射
const PERMISSION_LABELS: Record<string, string> = {
  read: '查看',
  create: '创建',
  update: '更新',
  delete: '删除',
}

export function ApiKeysContent() {
  const queryClient = useQueryClient()
  const createFormRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [keyResultDialogOpen, setKeyResultDialogOpen] = useState(false)
  const [scopesDialogOpen, setScopesDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeApiKeyInfo | null>(null)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResponse | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<Record<string, string[]>>({})
  // 配置密钥对话框相关状态
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [employeeSearchValue, setEmployeeSearchValue] = useState('')
  const [configSelectedEmployee, setConfigSelectedEmployee] = useState<EmployeeApiKeyInfo | null>(null)

  // 查询已配置密钥的员工列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-api-keys', page, pageSize, searchValue],
    queryFn: async () => {
      const params: { page?: number; size?: number; search?: string; has_api_key?: boolean } = {
        page,
        size: pageSize,
        has_api_key: true,
      }
      if (searchValue) params.search = searchValue
      return apiKeysApi.list(params)
    },
  })

  // 查询未配置密钥的员工列表（用于配置密钥对话框）
  const { data: availableEmployees, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['admin-api-keys-available', employeeSearchValue],
    queryFn: async () => {
      const params: { page?: number; size?: number; search?: string; has_api_key?: boolean } = {
        page: 1,
        size: 50,
        has_api_key: false,
      }
      if (employeeSearchValue) params.search = employeeSearchValue
      return apiKeysApi.list(params)
    },
    enabled: configDialogOpen,
  })

  const employees = data?.items || []
  const total = data?.total || 0

  // 创建密钥
  const createMutation = useMutation({
    mutationFn: (data: { employeeId: string; formData: { name: string; expires_in_days: number; scopes: Record<string, string[]> } }) =>
      apiKeysApi.create(data.employeeId, {
        name: data.formData.name,
        scopes: Object.keys(data.formData.scopes).length > 0 ? data.formData.scopes : undefined,
        expires_in_days: data.formData.expires_in_days,
      }),
    onSuccess: (response) => {
      setCreatedKey(response)
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

  // 更新权限
  const updateScopesMutation = useMutation({
    mutationFn: (data: { employeeId: string; scopes: Record<string, string[]> }) =>
      apiKeysApi.updateScopes(data.employeeId, { scopes: data.scopes }),
    onSuccess: () => {
      toast.success('权限更新成功')
      setScopesDialogOpen(false)
      setSelectedEmployee(null)
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新权限失败')
    },
  })

  // 渲染权限标签
  const renderScopes = (apiKey?: ApiKeyInfo) => {
    if (!apiKey?.scopes || Object.keys(apiKey.scopes).length === 0) {
      return <Tag>无权限</Tag>
    }

    const scopeEntries = Object.entries(apiKey.scopes)
    const displayScopes = scopeEntries.slice(0, 2)
    const remainingCount = scopeEntries.length - 2

    return (
      <div className="flex flex-wrap gap-1">
        {displayScopes.map(([scope, permissions]) => {
          const scopeInfo = DEFAULT_API_SCOPES[scope as keyof typeof DEFAULT_API_SCOPES]
          return (
            <Tag key={scope} color="blue" size="small">
              {scopeInfo?.description || scope}
              <span className="ml-1 opacity-60">
                ({permissions.length})
              </span>
            </Tag>
          )
        })}
        {remainingCount > 0 && (
          <Tag size="small">
            +{remainingCount}
          </Tag>
        )}
      </div>
    )
  }

  // 列定义
  const columns: ColumnProps<EmployeeApiKeyInfo>[] = useMemo(
    () => [
      {
        title: '员工信息',
        dataIndex: 'name',
        width: 180,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={2} style={{ width: 144 }} />
          }
          return (
            <div>
              <div className="font-medium">{record.name}</div>
              <Text type="tertiary" size="small">{record.username}</Text>
            </div>
          )
        },
      },
      {
        title: 'API密钥状态',
        dataIndex: 'api_key_status',
        width: 140,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
          }
          if (!record.has_api_key) {
            return <Tag>未创建</Tag>
          }
          const apiKey = record.api_key
          if (apiKey?.is_expired) {
            return (
              <Tag color="red" size="small">
                <XCircle className="h-3 w-3 mr-1 inline" />
                已过期
              </Tag>
            )
          }
          return (
            <Tag color="green" size="small">
              <CheckCircle className="h-3 w-3 mr-1 inline" />
              有效
            </Tag>
          )
        },
      },
      {
        title: '密钥名称',
        dataIndex: 'api_key.name',
        width: 150,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
          }
          if (!record.has_api_key) {
            return <Text type="tertiary">-</Text>
          }
          return (
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-gray-400" />
              <span>{record.api_key?.name || '-'}</span>
            </div>
          )
        },
      },
      {
        title: '密钥前缀',
        dataIndex: 'api_key.prefix',
        width: 120,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
          }
          if (!record.api_key?.prefix) {
            return <Text type="tertiary">-</Text>
          }
          return (
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
              {record.api_key.prefix}...
            </code>
          )
        },
      },
      {
        title: '权限范围',
        dataIndex: 'scopes',
        width: 200,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          }
          if (!record.has_api_key) {
            return <Text type="tertiary">-</Text>
          }
          return renderScopes(record.api_key)
        },
      },
      {
        title: '过期时间',
        dataIndex: 'api_key.expires_at',
        width: 160,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 112 }} />
          }
          if (!record.api_key?.expires_at) {
            return <Text type="tertiary">-</Text>
          }
          return (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span className={record.api_key.is_expired ? 'text-red-500' : ''}>
                {formatTime(record.api_key.expires_at)}
              </span>
            </div>
          )
        },
      },
      {
        title: '最后使用',
        dataIndex: 'api_key.last_used_at',
        width: 160,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 112 }} />
          }
          if (!record.api_key?.last_used_at) {
            return <Text type="tertiary">从未使用</Text>
          }
          return formatTime(record.api_key.last_used_at)
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 140,
        render: (_: unknown, record: EmployeeApiKeyInfo) => {
          if (isSkeletonRow(record.employee_id)) {
            return <Skeleton.Paragraph rows={1} style={{ width: 96 }} />
          }
          return (
            <div className="flex items-center gap-1">
              <Tooltip content="编辑权限">
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<Shield className="h-4 w-4" />}
                  size="small"
                  onClick={() => handleScopesClick(record)}
                />
              </Tooltip>
              <Tooltip content="重新生成">
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<IconRefresh />}
                  size="small"
                  onClick={() => handleRegenerateClick(record)}
                />
              </Tooltip>
              <Tooltip content="删除">
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<Trash2 className="h-4 w-4 text-red-500" />}
                  size="small"
                  onClick={() => handleDeleteClick(record)}
                />
              </Tooltip>
            </div>
          )
        },
      },
    ],
    []
  )

  // 表格数据
  const tableData = isLoading ? createSkeletonData(5) : employees

  // 分页配置
  const pagination = useMemo(() => ({
    currentPage: page,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: (s: number) => { setPageSize(s); setPage(1) },
    showSizeChanger: true,
    pageSizeOpts: [10, 20, 50, 100],
    showTotal: true,
    formatPageText: (info: { currentStart: number; currentEnd: number; total: number }) =>
      `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
  }), [page, pageSize, total])

  // 处理函数
  const handleSearch = () => {
    setPage(1)
    refetch()
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

  const handleScopesClick = (employee: EmployeeApiKeyInfo) => {
    setSelectedEmployee(employee)
    setSelectedScopes(employee.api_key?.scopes || {})
    setScopesDialogOpen(true)
  }

  const handleScopesSubmit = () => {
    if (!selectedEmployee) return
    updateScopesMutation.mutate({
      employeeId: selectedEmployee.employee_id,
      scopes: selectedScopes,
    })
  }

  const toggleScope = (scope: string, permission: string) => {
    setSelectedScopes((prev) => {
      const current = prev[scope] || []
      if (current.includes(permission)) {
        const newPermissions = current.filter((p) => p !== permission)
        if (newPermissions.length === 0) {
          const { [scope]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [scope]: newPermissions }
      } else {
        return { ...prev, [scope]: [...current, permission] }
      }
    })
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

  // 创建表单中的权限 scope 状态
  const [createScopes, setCreateScopes] = useState<Record<string, string[]>>({})

  const toggleCreateScope = (scope: string, permission: string) => {
    setCreateScopes((prev) => {
      const current = prev[scope] || []
      if (current.includes(permission)) {
        const newPermissions = current.filter((p) => p !== permission)
        if (newPermissions.length === 0) {
          const { [scope]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [scope]: newPermissions }
      } else {
        return { ...prev, [scope]: [...current, permission] }
      }
    })
  }

  const handleCreateSubmit = (values: { name: string; expires_in_days: number }) => {
    if (!configSelectedEmployee) return
    createMutation.mutate(
      {
        employeeId: configSelectedEmployee.employee_id,
        formData: { ...values, scopes: createScopes },
      },
      {
        onSuccess: (response) => {
          setCreatedKey(response)
          setConfigDialogOpen(false)
          setConfigSelectedEmployee(null)
          setEmployeeSearchValue('')
          setCreateScopes({})
          setKeyResultDialogOpen(true)
          queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] })
          queryClient.invalidateQueries({ queryKey: ['admin-api-keys-available'] })
        },
      }
    )
  }

  return (
    <>
      <div className="flex h-full flex-col gap-4">
        {/* 工具栏 */}
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索姓名或用户名..."
              style={{ width: 256 }}
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
            />
            <Button theme="outline" onClick={handleSearch}>搜索</Button>
            <Button
              theme="borderless"
              type="tertiary"
              icon={<IconRefresh />}
              onClick={() => refetch()}
            />
          </div>
          <Button theme="solid" type="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setConfigDialogOpen(true)}>
            配置密钥
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-hidden">
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="employee_id"
            pagination={total > 0 ? pagination : false}
            loading={false}
            empty="暂无数据"
          />
        </div>
      </div>

      {/* 密钥结果对话框 */}
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
        width={550}
      >
        <div className="space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">重要提示</div>
                <div className="text-sm text-red-700">
                  请立即复制并安全保存此API密钥，它只会显示一次！关闭此对话框后将无法再次查看完整密钥。
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm font-medium">员工：</span>
              <span>{createdKey?.name}（{createdKey?.username}）</span>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
              <span className="text-sm font-medium">密钥名称：</span>
              <span>{createdKey?.info.name}</span>
            </div>
            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
              <span className="text-sm font-medium">API密钥：</span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm break-all flex-1">
                    {showKey ? createdKey?.api_key : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button
                    theme="borderless"
                    type="tertiary"
                    icon={showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    size="small"
                    onClick={() => setShowKey(!showKey)}
                  />
                </div>
                <Button
                  theme="outline"
                  block
                  icon={<Copy className="h-4 w-4" />}
                  onClick={() => handleCopyToClipboard(createdKey?.api_key || '')}
                >
                  复制API密钥
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 编辑权限对话框 */}
      <Modal
        title="编辑API密钥权限"
        visible={scopesDialogOpen}
        onCancel={() => setScopesDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setScopesDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={handleScopesSubmit} loading={updateScopesMutation.isPending}>
              保存权限
            </Button>
          </div>
        }
        width={600}
        style={{ maxHeight: '90vh' }}
      >
        <div className="text-sm text-gray-500 mb-4">
          修改员工 {selectedEmployee?.name} 的API密钥权限范围
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.entries(DEFAULT_API_SCOPES).map(([scope, info]) => (
            <div key={scope} className="border rounded-lg p-3">
              <div className="font-medium mb-2">{info.description}</div>
              <div className="flex flex-wrap gap-2">
                {info.permissions.map((permission) => {
                  const isChecked = selectedScopes[scope]?.includes(permission)
                  return (
                    <Checkbox
                      key={permission}
                      checked={isChecked}
                      onChange={() => toggleScope(scope, permission)}
                    >
                      {PERMISSION_LABELS[permission] || permission}
                    </Checkbox>
                  )
                })}
              </div>
            </div>
          ))}
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
        确定要删除员工 {selectedEmployee?.name} 的API密钥吗？删除后，使用该密钥的所有应用将无法访问API。
      </Modal>

      {/* 配置密钥对话框 */}
      <Modal
        title="配置 API 密钥"
        visible={configDialogOpen}
        onCancel={() => {
          setConfigDialogOpen(false)
          setConfigSelectedEmployee(null)
          setEmployeeSearchValue('')
          setCreateScopes({})
        }}
        footer={configSelectedEmployee ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => {
              setConfigDialogOpen(false)
              setConfigSelectedEmployee(null)
              setEmployeeSearchValue('')
              setCreateScopes({})
            }}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => createFormRef.current?.submitForm()} loading={createMutation.isPending}>
              创建密钥
            </Button>
          </div>
        ) : null}
        width={700}
        style={{ maxHeight: '90vh' }}
      >
        <div className="text-sm text-gray-500 mb-4">
          {configSelectedEmployee
            ? `为员工 ${configSelectedEmployee.name}（${configSelectedEmployee.username}）创建 API 密钥`
            : '选择一个员工来配置 API 密钥'}
        </div>

        {!configSelectedEmployee ? (
          <div className="flex flex-col gap-4">
            <Input
              prefix={<IconSearch />}
              placeholder="搜索员工姓名或用户名..."
              value={employeeSearchValue}
              onChange={(v) => setEmployeeSearchValue(v)}
            />
            <div className="max-h-[400px] overflow-auto border rounded-md">
              {isLoadingAvailable ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton.Paragraph key={i} rows={1} style={{ width: '100%' }} />
                  ))}
                </div>
              ) : (availableEmployees?.items || []).length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  {employeeSearchValue ? '未找到匹配的员工' : '所有员工都已配置 API 密钥'}
                </div>
              ) : (
                <div className="divide-y">
                  {(availableEmployees?.items || []).map((emp) => (
                    <div
                      key={emp.employee_id}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        setConfigSelectedEmployee(emp)
                        setCreateScopes({})
                        setTimeout(() => {
                          createFormRef.current?.setValues({
                            name: `${emp.name}的API密钥`,
                            expires_in_days: 365,
                          })
                        }, 0)
                      }}
                    >
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <Text type="tertiary" size="small">{emp.username}</Text>
                      </div>
                      <Button theme="outline" size="small">选择</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {(availableEmployees?.total || 0) > 50 && (
              <div className="text-sm text-gray-400 text-center">
                显示前 50 个结果，请使用搜索缩小范围
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                theme="borderless"
                type="tertiary"
                size="small"
                onClick={() => setConfigSelectedEmployee(null)}
              >
                ← 返回选择
              </Button>
            </div>

            <Form
              getFormApi={(api) => { createFormRef.current = api }}
              onSubmit={handleCreateSubmit}
              labelPosition="top"
              initValues={{
                name: `${configSelectedEmployee.name}的API密钥`,
                expires_in_days: 365,
              }}
            >
              <Form.Input
                field="name"
                label="密钥名称"
                placeholder="请输入密钥名称"
                rules={[{ required: true, message: '请输入密钥名称' }]}
              />
              <Form.InputNumber
                field="expires_in_days"
                label="有效期（天）"
                min={1}
                max={3650}
                extraText="最短1天，最长10年（3650天）"
                rules={[{ required: true, message: '请输入有效期' }]}
              />
            </Form>

            <div className="space-y-2">
              <div className="text-sm font-medium">权限范围</div>
              <div className="text-xs text-gray-500">选择此 API 密钥可访问的功能和权限</div>
              <div className="space-y-3 mt-2">
                {Object.entries(DEFAULT_API_SCOPES).map(([scope, info]) => (
                  <div key={scope} className="border rounded-lg p-3">
                    <div className="font-medium mb-2">{info.description}</div>
                    <div className="flex flex-wrap gap-2">
                      {info.permissions.map((permission) => {
                        const isChecked = createScopes[scope]?.includes(permission)
                        return (
                          <Checkbox
                            key={permission}
                            checked={isChecked}
                            onChange={() => toggleCreateScope(scope, permission)}
                          >
                            {PERMISSION_LABELS[permission] || permission}
                          </Checkbox>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
