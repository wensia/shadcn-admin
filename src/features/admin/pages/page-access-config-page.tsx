/**
 * 页面访问权限配置页面
 * 管理员可配置哪些普通员工能访问特定页面
 */

import { useState, useCallback } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Shield, Search, X, UserPlus, Loader2 } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi } from '../api'
import { showApiErrorToast } from '@/lib/api/error-toast'
import type { PageAccessConfigItem } from '../types'

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
          <Shield className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">页面访问权限</h1>
            <p className="text-sm text-muted-foreground">
              配置哪些普通员工可以访问特定页面（超级管理员默认拥有所有权限）
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
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
  const employees = config?.employees || []

  // 搜索员工
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['employee-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return []
      const response = await adminApi.getEmployees({ search: searchTerm, size: 10 })
      if (!response.success || !response.data) return []
      // 过滤掉已添加的员工和超级管理员
      const existingIds = new Set(config?.allowed_employee_ids || [])
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

  // 添加员工
  const handleAddEmployee = useCallback((employeeId: string) => {
    const currentIds = config?.allowed_employee_ids || []
    if (currentIds.includes(employeeId)) return
    updateMutation.mutate({
      employeeIds: [...currentIds, employeeId],
      enabled: isEnabled,
    })
  }, [config?.allowed_employee_ids, isEnabled, updateMutation])

  // 移除员工
  const handleRemoveEmployee = useCallback((employeeId: string) => {
    const currentIds = config?.allowed_employee_ids || []
    updateMutation.mutate({
      employeeIds: currentIds.filter(id => id !== employeeId),
      enabled: isEnabled,
    })
  }, [config?.allowed_employee_ids, isEnabled, updateMutation])

  // 切换启用状态
  const handleToggleEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
    updateMutation.mutate({
      employeeIds: config?.allowed_employee_ids || [],
      enabled,
    })
  }, [config?.allowed_employee_ids, updateMutation])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{pageName}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`enabled-${pageKey}`} className="text-sm text-muted-foreground">
              启用访问控制
            </Label>
            <Switch
              id={`enabled-${pageKey}`}
              checked={isEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 已授权员工列表 */}
        <div>
          <Label className="text-sm font-medium">已授权员工 ({employees.length})</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无已授权员工</p>
            ) : (
              employees.map(emp => (
                <Badge key={emp.id} variant="secondary" className="gap-1 pr-1">
                  {emp.name}
                  <span className="text-muted-foreground">({emp.username})</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-destructive/20"
                    onClick={() => handleRemoveEmployee(emp.id)}
                    disabled={updateMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* 搜索添加员工 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">添加员工</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索员工姓名或用户名..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
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
                    {emp.name} <span className="text-muted-foreground">({emp.username})</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1"
                    onClick={() => handleAddEmployee(emp.id)}
                    disabled={updateMutation.isPending}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    添加
                  </Button>
                </div>
              ))}
            </div>
          )}
          {searchTerm.trim() && searchResults && searchResults.length === 0 && !isSearching && (
            <p className="text-sm text-muted-foreground">未找到匹配的员工</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
