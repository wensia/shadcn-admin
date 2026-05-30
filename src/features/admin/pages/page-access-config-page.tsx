/**
 * 页面访问权限配置页面
 * 管理员可配置哪些普通员工能访问特定页面
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Shield, Search, UserPlus, Loader2 } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button, Input, Tag, Switch, Skeleton, Typography, Card } from '@douyinfe/semi-ui-19'
import { adminApi } from '../api'
import { showApiErrorToast } from '@/lib/api/error-toast'
import type { PageAccessConfigItem } from '../types'

const { Text } = Typography

// 可配置的页面列表
// yunke/call-records 已改为自动继承 CRM 权限（有身份+绑定云客即可访问），无需手动配置
const CONFIGURABLE_PAGES: { page_key: string; page_name: string; description: string }[] = [
]

export function PageAccessConfigPage() {
  useDocumentTitle('页面访问权限')
  const queryClient = useQueryClient()

  // 获取所有页面访问配置
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['page-access-configs'],
    queryFn: async () => {
      const response = await adminApi.getPageAccessConfigs()
      if (!response.success) throw new Error(response.message)
      return response.data || []
    },
  })

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6" style={{ color: 'var(--semi-color-text-2)' }} />
          <div>
            <h1 className="text-2xl font-bold">页面访问权限</h1>
            <Text type="tertiary" size="small">
              配置哪些普通员工可以访问特定页面（超级管理员默认拥有所有权限）
            </Text>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <Skeleton.Paragraph rows={1} style={{ width: 128, marginBottom: 8 }} />
                  <Skeleton.Paragraph rows={1} style={{ width: 192, marginBottom: 16 }} />
                  <Skeleton.Paragraph rows={3} style={{ width: '100%' }} />
                </Card>
              ))}
            </div>
          ) : (
            CONFIGURABLE_PAGES.map(page => {
              const config = configsData?.find(c => c.page_key === page.page_key)
              return (
                <PageAccessCard
                  key={page.page_key}
                  pageKey={page.page_key}
                  pageName={page.page_name}
                  description={page.description}
                  config={config}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['page-access-configs'] })}
                />
              )
            })
          )}
        </div>
      </div>
    </Main>
  )
}

function PageAccessCard({
  pageKey,
  pageName,
  description,
  config,
  onUpdate,
}: {
  pageKey: string
  pageName: string
  description: string
  config?: PageAccessConfigItem
  onUpdate: () => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isEnabled, setIsEnabled] = useState(config?.is_enabled ?? true)
  const employees = config?.employees ?? []
  const allowedEmployeeIds = config?.allowed_employee_ids ?? []
  const allowedEmployeeIdsKey = allowedEmployeeIds.join(',')

  // 搜索员工
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['employee-search', searchTerm, allowedEmployeeIdsKey],
    queryFn: async () => {
      if (!searchTerm.trim()) return []
      const response = await adminApi.getEmployees({ search: searchTerm, size: 10 })
      if (!response.success || !response.data) return []
      // 过滤掉已添加的员工和超级管理员
      const existingIds = new Set(allowedEmployeeIds)
      return response.data.items.filter(
        (emp: { id: string; is_superuser: boolean }) => !existingIds.has(emp.id) && !emp.is_superuser
      )
    },
    enabled: searchTerm.trim().length > 0,
  })

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: async (params: { employeeIds: string[]; enabled: boolean }) => {
      const response = await adminApi.updatePageAccessConfig(pageKey, {
        page_name: pageName,
        allowed_employee_ids: params.employeeIds,
        is_enabled: params.enabled,
      })
      if (!response.success) throw new Error(response.message)
      return response.data
    },
    onSuccess: () => {
      toast.success('配置已更新')
      onUpdate()
      setSearchTerm('')
    },
    onError: (error) => {
      showApiErrorToast(error)
    },
  })
  const { mutate: updatePageAccessConfig, isPending: isUpdating } = updateMutation

  // 添加员工
  const handleAddEmployee = (employeeId: string) => {
    if (allowedEmployeeIds.includes(employeeId)) return
    updatePageAccessConfig({
      employeeIds: [...allowedEmployeeIds, employeeId],
      enabled: isEnabled,
    })
  }

  // 移除员工
  const handleRemoveEmployee = (employeeId: string) => {
    updatePageAccessConfig({
      employeeIds: allowedEmployeeIds.filter(id => id !== employeeId),
      enabled: isEnabled,
    })
  }

  // 切换启用状态
  const handleToggleEnabled = (enabled: boolean) => {
    setIsEnabled(enabled)
    updatePageAccessConfig({
      employeeIds: allowedEmployeeIds,
      enabled,
    })
  }

  return (
    <Card
      title={pageName}
      headerExtraContent={
        <div className="flex items-center gap-2">
            <Text type="tertiary" size="small">启用访问控制</Text>
          <Switch
            checked={isEnabled}
            onChange={handleToggleEnabled}
            disabled={isUpdating}
          />
        </div>
      }
    >
      <Text type="tertiary" size="small">{description}</Text>

      <div className="mt-4 space-y-4">
        {/* 已授权员工列表 */}
        <div>
          <Text strong size="small">已授权员工 ({employees.length})</Text>
          <div className="mt-2 flex flex-wrap gap-2">
            {employees.length === 0 ? (
              <Text type="tertiary" size="small">暂无已授权员工</Text>
            ) : (
              employees.map(emp => (
                <Tag
                  key={emp.id}
                  closable
                  onClose={() => handleRemoveEmployee(emp.id)}
                  size="large"
                >
                  {emp.name}
                  <Text type="tertiary" size="small"> ({emp.username})</Text>
                </Tag>
              ))
            )}
          </div>
        </div>

        {/* 搜索添加员工 */}
        <div className="space-y-2">
          <Text strong size="small">添加员工</Text>
          <div className="relative">
            <Input
              prefix={<Search className="h-4 w-4" />}
              suffix={isSearching ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--semi-color-text-2)' }} /> : undefined}
              placeholder="搜索员工姓名或用户名..."
              value={searchTerm}
              onChange={(v) => setSearchTerm(v)}
            />
          </div>

          {/* 搜索结果 */}
          {searchTerm.trim() && searchResults && searchResults.length > 0 && (
            <div className="rounded-md border">
              {searchResults.map((emp: { id: string; name: string; username: string }) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
                >
                  <span className="text-sm">
                    {emp.name} <Text type="tertiary">({emp.username})</Text>
                  </span>
                  <Button
                    theme="borderless"
                    type="tertiary"
                    icon={<UserPlus className="h-3.5 w-3.5" />}
                    onClick={() => handleAddEmployee(emp.id)}
                    disabled={updateMutation.isPending}
                  >
                    添加
                  </Button>
                </div>
              ))}
            </div>
          )}
          {searchTerm.trim() && searchResults && searchResults.length === 0 && !isSearching && (
            <Text type="tertiary" size="small">未找到匹配的员工</Text>
          )}
        </div>
      </div>
    </Card>
  )
}
