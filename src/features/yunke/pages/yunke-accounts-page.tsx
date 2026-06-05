/**
 * 云客子账号管理页面 - Semi Design
 * 按凭证分 Tab 展示子账号
 */

import { useState, useMemo, useEffect, type ComponentProps } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Phone,
  Building2,
  RefreshCw,
  Link,
  Unlink,
  Copy,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertCircle,
  Check,
  UserPlus,
  Smartphone,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Table, Button, Input, Tag, Modal, Tabs, TabPane, Typography, Banner, Dropdown, TextArea, Select } from '@douyinfe/semi-ui-19'
import { IconSearch, IconMore } from '@douyinfe/semi-icons'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { yunkeApi, yunkeCredentialsApi, yunkeOnboardingApi } from '../api'
import type { YunkeSubAccount, YunkeAvailableEmployee, YunkePasswordResetResponse, YunkeCredential } from '../types'
import { CreateConsultantDialog } from '../components/create-consultant-dialog'
import { adminApi } from '@/features/admin/api'

const { Text } = Typography
const EMPTY_EMPLOYEES: YunkeAvailableEmployee[] = []

type SubAccountFilters = {
  crmBindingStatus: '' | 'bound' | 'unbound'
  campusId: string
  departmentId: string
}

function normalizeDeviceIdInput(value: string) {
  const seen = new Set<string>()
  return value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

// 子账号表格组件
function SubAccountsTable({
  credential,
  searchValue,
  filters,
}: {
  credential: YunkeCredential
  searchValue: string
  filters: SubAccountFilters
}) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [bindDialogOpen, setBindDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  // 绑定员工弹窗状态
  const [bindSearchText, setBindSearchText] = useState('')
  const [bindPage, setBindPage] = useState(1)
  const [selectedBindEmployee, setSelectedBindEmployee] = useState<YunkeAvailableEmployee | null>(null)
  const bindPageSize = 5
  const [confirmAction, setConfirmAction] = useState<{
    type: 'resetPassword' | 'unbind' | 'offboard'
    account?: YunkeSubAccount
  } | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<YunkeSubAccount | null>(null)
  const [passwordResult, setPasswordResult] = useState<YunkePasswordResetResponse | null>(null)

  useEffect(() => {
    setPage(1)
  }, [credential.id, searchValue, filters.crmBindingStatus, filters.campusId, filters.departmentId])

  // 查询子账号列表
  const { data, isLoading } = useQuery({
    queryKey: [
      'yunke-sub-accounts',
      credential.id,
      page,
      pageSize,
      searchValue,
      filters.crmBindingStatus,
      filters.campusId,
      filters.departmentId,
    ],
    queryFn: async () => {
      const params: {
        page?: number
        page_size?: number
        real_name?: string
        crm_binding_status?: 'bound' | 'unbound'
        campus_id?: string
        department_id?: string
      } = {
        page,
        page_size: pageSize,
      }
      if (searchValue) params.real_name = searchValue
      if (filters.crmBindingStatus) params.crm_binding_status = filters.crmBindingStatus
      if (filters.campusId) params.campus_id = filters.campusId
      if (filters.departmentId) params.department_id = filters.departmentId
      return yunkeCredentialsApi.getSubAccountsByCredential(credential.id, params)
    },
    enabled: credential.status === 1,
  })

  // 查询可绑定员工列表
  const { data: employeesData } = useQuery({
    queryKey: ['yunke-available-employees'],
    queryFn: () => yunkeApi.getAvailableEmployees(),
  })

  const employees = employeesData ?? EMPTY_EMPLOYEES
  const accounts = data?.users || []
  const total = data?.total || 0

  // 过滤后的员工列表（前端搜索）
  const filteredEmployees = useMemo(() => {
    if (!bindSearchText.trim()) return employees
    const searchLower = bindSearchText.toLowerCase()
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchLower) ||
        emp.username.toLowerCase().includes(searchLower)
    )
  }, [employees, bindSearchText])

  // 分页后的员工列表
  const paginatedEmployees = useMemo(() => {
    const start = (bindPage - 1) * bindPageSize
    return filteredEmployees.slice(start, start + bindPageSize)
  }, [filteredEmployees, bindPage, bindPageSize])

  const totalBindPages = Math.max(1, Math.ceil(filteredEmployees.length / bindPageSize))

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: (data: { yunke_user_id: string; phone: string; credential_id: string }) => yunkeApi.resetPassword(data),
    onSuccess: (response) => {
      setPasswordResult(response)
      setPasswordDialogOpen(true)
      toast.success('密码重置成功')
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '密码重置失败')
    },
  })

  // 绑定员工
  const bindMutation = useMutation({
    mutationFn: (data: {
      yunke_phone: string
      yunke_user_id: string
      employee_id: string
      source_account_id?: string
      company_code?: string | null
      real_name?: string
    }) =>
      yunkeApi.bindEmployee(data),
    onSuccess: () => {
      toast.success('绑定成功')
      setBindDialogOpen(false)
      setSelectedAccount(null)
      setSelectedBindEmployee(null)
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '绑定失败')
    },
  })

  // 解绑员工
  const unbindMutation = useMutation({
    mutationFn: (data: { employee_id: string; yunke_phone?: string; yunke_user_id?: string }) => yunkeApi.unbindEmployee(data),
    onSuccess: () => {
      toast.success('解绑成功')
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '解绑失败')
    },
  })

  // 为员工执行云客登录
  const loginForEmployeeMutation = useMutation({
    mutationFn: (data: { employee_id: string; yunke_phone?: string; yunke_user_id?: string }) => yunkeApi.loginForEmployee(data),
    onSuccess: (response) => {
      toast.success(response.message || '登录成功')
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '登录失败')
    },
  })

  // 云客子账号离职处理
  const offboardMutation = useMutation({
    mutationFn: (data: { yunke_user_id: string }) =>
      yunkeOnboardingApi.offboardSubAccount({
        yunke_admin_account_id: credential.id,
        yunke_user_id: data.yunke_user_id,
      }),
    onSuccess: (res) => {
      const unboundCount = res?.rmf_unbound_employees?.length ?? 0
      toast.success(
        unboundCount > 0
          ? `已离职处理，同步解绑 RuiMF 员工 ${unboundCount} 位`
          : '已离职处理'
      )
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '离职处理失败')
    },
  })

  // 状态图标映射
  const getStatusInfo = (status: string | number) => {
    const statusMap: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
      active: { icon: CheckCircle, color: 'green', label: '正常' },
      '1': { icon: CheckCircle, color: 'green', label: '正常' },
      paused: { icon: PauseCircle, color: 'grey', label: '暂停' },
      inactive: { icon: XCircle, color: 'red', label: '停用' },
      '0': { icon: XCircle, color: 'red', label: '停用' },
    }
    return statusMap[String(status)] || statusMap.active
  }

  // 列定义
  const columns: ColumnProps<YunkeSubAccount>[] = [
      {
        title: '账号信息',
        dataIndex: 'username',
        width: 200,
        render: (_text: string, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={160} />
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User style={{ width: 16, height: 16, color: 'var(--semi-color-success)' }} />
              <div>
                <div style={{ fontWeight: 500 }}>{record.real_name || record.username}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                  <Phone style={{ width: 12, height: 12 }} />
                  <span>{record.phone || record.username}</span>
                </div>
              </div>
            </div>
          )
        },
      },
      {
        title: '部门',
        dataIndex: 'department_name',
        width: 150,
        render: (text: string, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
              <span>{text || '未分配'}</span>
            </div>
          )
        },
      },
      {
        title: '职位',
        dataIndex: 'position',
        width: 120,
        render: (_text: string, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          return (
            <Tag type="ghost">{record.position || record.role_name || '未设置'}</Tag>
          )
        },
      },
      {
        title: '绑定用户',
        dataIndex: 'bound_employee',
        width: 220,
        render: (_: unknown, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
          const bound = record.bound_employee
          if (bound) {
            const crmScopeText = [bound.campus_name, bound.department_name].filter(Boolean).join(' / ')
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <Tag color="grey" type="light" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Link style={{ width: 12, height: 12 }} />
                    {bound.name}
                  </Tag>
                  {crmScopeText && (
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--semi-color-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {crmScopeText}
                    </div>
                  )}
                </div>
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<Unlink style={{ width: 12, height: 12 }} />}
                  style={{ width: 24, height: 24, padding: 0, flex: '0 0 auto' }}
                  onClick={() => handleUnbindClick(record)}
                />
              </div>
            )
          }
          return (
            <Button
              theme="outline"
              style={{ height: 28, fontSize: 12 }}
              onClick={() => handleBindClick(record)}
            >
              <Link style={{ width: 12, height: 12, marginRight: 4 }} />
              绑定员工
            </Button>
          )
        },
      },
      {
        title: '登录状态',
        dataIndex: 'login_status',
        width: 100,
        render: (_: unknown, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
          const loginStatus = record.login_status
          const bound = record.bound_employee

          if (!bound) {
            return <Text type="tertiary" size="small">未绑定</Text>
          }

          if (loginStatus?.is_logged_in) {
            return (
              <Tag color="green" type="light" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle style={{ width: 12, height: 12 }} />
                已登录
              </Tag>
            )
          }

          if (loginStatus?.has_password) {
            return (
              <Tag color="grey" type="light" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <XCircle style={{ width: 12, height: 12 }} />
                未登录
              </Tag>
            )
          }

          return (
            <Tag type="ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--semi-color-text-2)' }}>
              <AlertCircle style={{ width: 12, height: 12 }} />
              无密码
            </Tag>
          )
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (_: unknown, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
          const statusInfo = getStatusInfo(record.status)
          const Icon = statusInfo.icon
          return (
            <Tag color={statusInfo.color as ComponentProps<typeof Tag>['color']} type="light" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon style={{ width: 12, height: 12 }} />
              {statusInfo.label}
            </Tag>
          )
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 80,
        fixed: 'right' as const,
        render: (_: unknown, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={40} />
          const bound = record.bound_employee
          const loginStatus = record.login_status
          const isLoggedIn = loginStatus?.is_logged_in
          const canLogin = bound && loginStatus?.has_password
          const loginDisabled =
            !bound || !loginStatus?.has_password || loginForEmployeeMutation.isPending

          return (
            <Dropdown
              trigger="click"
              position="bottomRight"
              render={
                <Dropdown.Menu>
                  <Dropdown.Item
                    disabled={loginDisabled}
                    onClick={() => {
                      if (bound && canLogin) {
                        loginForEmployeeMutation.mutate({
                          employee_id: bound.id,
                          yunke_phone: record.phone,
                          yunke_user_id: record.id,
                        })
                      }
                    }}
                  >
                    {isLoggedIn ? '重新登录' : '登录'}
                    {!bound && (
                      <Text type="tertiary" size="small" style={{ marginLeft: 6 }}>
                        (请先绑定员工)
                      </Text>
                    )}
                    {bound && !loginStatus?.has_password && (
                      <Text type="tertiary" size="small" style={{ marginLeft: 6 }}>
                        (请先重置密码)
                      </Text>
                    )}
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleResetPasswordClick(record)}>
                    重置密码
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    type="danger"
                    disabled={offboardMutation.isPending}
                    onClick={() => handleOffboardClick(record)}
                  >
                    离职处理
                  </Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <Button
                theme="borderless"
                icon={<IconMore />}
                style={{ height: 28, width: 32 }}
              />
            </Dropdown>
          )
        },
      },
  ]

  // 处理函数
  const handleResetPasswordClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setConfirmAction({ type: 'resetPassword', account })
    setConfirmDialogOpen(true)
  }

  const handleBindClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setBindSearchText('')
    setBindPage(1)
    setSelectedBindEmployee(null)
    setBindDialogOpen(true)
  }

  const handleUnbindClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setConfirmAction({ type: 'unbind', account })
    setConfirmDialogOpen(true)
  }

  const handleOffboardClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setConfirmAction({ type: 'offboard', account })
    setConfirmDialogOpen(true)
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return

    switch (confirmAction.type) {
      case 'resetPassword':
        if (confirmAction.account) {
          resetPasswordMutation.mutate({
            yunke_user_id: confirmAction.account.id,
            phone: confirmAction.account.phone,
            credential_id: credential.id,
          })
        }
        break
      case 'unbind':
        if (confirmAction.account?.bound_employee) {
          unbindMutation.mutate({
            employee_id: confirmAction.account.bound_employee.id,
            yunke_phone: confirmAction.account.phone,
            yunke_user_id: confirmAction.account.id,
          })
        }
        break
      case 'offboard':
        if (confirmAction.account?.id) {
          offboardMutation.mutate({ yunke_user_id: confirmAction.account.id })
        }
        break
    }
    setConfirmDialogOpen(false)
    setConfirmAction(null)
  }

  const handleBindEmployee = () => {
    if (!selectedAccount || !selectedBindEmployee) return
    bindMutation.mutate({
      yunke_phone: selectedAccount.phone,
      yunke_user_id: selectedAccount.id,
      employee_id: selectedBindEmployee.id,
      source_account_id: selectedAccount.source_account_id || credential.id,
      company_code: credential.company_code,
      real_name: selectedAccount.real_name,
    })
  }

  const handleSelectBindEmployee = (emp: YunkeAvailableEmployee) => {
    if (selectedBindEmployee?.id === emp.id) {
      setSelectedBindEmployee(null)
    } else {
      setSelectedBindEmployee(emp)
    }
  }

  const handleCopyToClipboard = async (text: string, label: string) => {
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(text)
    if (success) {
      toast.success(`${label}已复制到剪贴板`)
    } else {
      toast.error('复制失败')
    }
  }

  const copyAllInfo = async () => {
    if (!passwordResult || !selectedAccount) return
    const allInfo = `姓名：${selectedAccount.real_name}\n账号：${selectedAccount.username}\n密码：${passwordResult.new_password}`
    const { copyToClipboard } = await import('@/lib/utils')
    const success = await copyToClipboard(allInfo)
    if (success) {
      toast.success('已复制所有信息到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  const getConfirmMessage = () => {
    if (!confirmAction) return { title: '', description: '' }

    switch (confirmAction.type) {
      case 'resetPassword':
        return {
          title: '确认重置密码',
          description: `确定要重置用户 ${confirmAction.account?.real_name}（${confirmAction.account?.username}）的云客密码吗？系统将自动生成新的随机密码。`,
        }
      case 'unbind':
        return {
          title: '确认解绑',
          description: `确定要解绑用户 ${confirmAction.account?.real_name} 与员工 ${confirmAction.account?.bound_employee?.name} 的绑定关系吗？`,
        }
      case 'offboard':
        return {
          title: '确认离职处理',
          description: `确定要将云客员工 ${confirmAction.account?.real_name}（${confirmAction.account?.username}）做离职处理吗？此操作会在云客侧解绑账号和设备，并同步清空 RuiMF 员工的云客绑定。`,
        }
    }
  }

  const confirmMessage = getConfirmMessage()

  // 绑定员工弹窗的列定义
  const bindColumns: ColumnProps<YunkeAvailableEmployee>[] = useMemo(() => [
    {
      title: '选择',
      dataIndex: 'select',
      width: 56,
      align: 'center' as const,
      render: (_: unknown, record: YunkeAvailableEmployee) => {
        const isSelected = selectedBindEmployee?.id === record.id
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
              cursor: 'pointer',
            }}
          >
            {isSelected && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
          </div>
        )
      },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 112,
      render: (text: string) => (
        <span style={{ fontSize: 12 }}>{text}</span>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 128,
      render: (text: string) => (
        <Text type="tertiary" size="small">{text}</Text>
      ),
    },
    {
      title: '校区',
      dataIndex: 'campus_name',
      width: 112,
      render: (text: string) => (
        <span style={{ fontSize: 12 }}>{text || '未分配'}</span>
      ),
    },
    {
      title: '已绑定云客',
      dataIndex: 'bound_yunke',
      render: (_: unknown, record: YunkeAvailableEmployee) => {
        const boundAccounts = record.bound_yunke_accounts?.length
          ? record.bound_yunke_accounts
          : record.bound_yunke
            ? [record.bound_yunke]
            : []
        if (boundAccounts.length > 0) {
          return (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {boundAccounts.slice(0, 2).map((account, index) => (
                <Tag key={`${account.yunke_user_id || account.phone || index}`} color="orange" type="ghost" size="small">
                  {account.phone || account.yunke_user_id}
                </Tag>
              ))}
              {boundAccounts.length > 2 && (
                <Tag color="grey" type="light" size="small">+{boundAccounts.length - 2}</Tag>
              )}
            </div>
          )
        }
        return <Text type="tertiary" size="small">-</Text>
      },
    },
  ], [selectedBindEmployee])

  // 凭证未登录时显示提示
  if (credential.status !== 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--semi-color-text-2)' }}>
        <AlertCircle style={{ width: 48, height: 48, marginBottom: 16 }} />
        <p style={{ fontSize: 18, fontWeight: 500 }}>凭证未登录</p>
        <Text type="tertiary">请先在「账号凭证管理」页面登录此凭证</Text>
      </div>
    )
  }

  return (
    <>
      {/* 表格 */}
      <SemiDataTable<YunkeSubAccount>
        columns={columns}
        data={accounts}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        emptyText="暂无数据"
      />

      {/* 绑定员工对话框 */}
      <Modal
        title="选择要绑定的员工"
        visible={bindDialogOpen}
        onCancel={() => setBindDialogOpen(false)}
        width={720}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button theme="outline" onClick={() => setBindDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleBindEmployee}
              disabled={!selectedBindEmployee || bindMutation.isPending}
              loading={bindMutation.isPending}
            >
              {bindMutation.isPending
                ? '绑定中...'
                : selectedBindEmployee
                  ? `绑定到 ${selectedBindEmployee.name}`
                  : '请先选择员工'}
            </Button>
          </div>
        }
      >
        <Text type="tertiary" style={{ display: 'block', marginBottom: 12 }}>
          为云客账号 {selectedAccount?.real_name}（{selectedAccount?.phone}）选择要绑定的 CRM 员工；员工已有云客账号时会追加绑定。
        </Text>

        {/* 搜索栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Input
            prefix={<IconSearch />}
            value={bindSearchText}
            onChange={(v) => {
              setBindSearchText(v)
              setBindPage(1)
            }}
            placeholder="输入姓名或用户名搜索"
            style={{ width: 224 }}
          />
          <Text type="tertiary">
            共 {filteredEmployees.length} 位员工
          </Text>
        </div>

        {/* 员工表格 */}
        <Table
          columns={bindColumns}
          dataSource={paginatedEmployees}
          rowKey="id"
          pagination={false}
          onRow={(record) => ({
            onClick: () => handleSelectBindEmployee(record as YunkeAvailableEmployee),
            style: {
              cursor: 'pointer',
              background: selectedBindEmployee?.id === (record as YunkeAvailableEmployee).id ? 'var(--semi-color-primary-light-default)' : undefined,
            },
          })}
          empty={
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--semi-color-text-2)', fontSize: 12 }}>
              {bindSearchText ? '没有找到匹配的员工' : '暂无可绑定的员工'}
            </div>
          }
        />

        {/* 分页 */}
        {filteredEmployees.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 12, borderTop: '1px solid var(--semi-color-border)', marginTop: 12 }}>
            <Button
              theme="outline"
              disabled={bindPage <= 1}
              onClick={() => setBindPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Text>第 {bindPage} / {totalBindPages} 页</Text>
            <Button
              theme="outline"
              disabled={bindPage >= totalBindPages}
              onClick={() => setBindPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </Modal>

      {/* 密码重置结果对话框 */}
      <Modal
        title="密码重置成功"
        visible={passwordDialogOpen}
        onCancel={() => setPasswordDialogOpen(false)}
        width={450}
        footer={
          <Button onClick={() => setPasswordDialogOpen(false)}>我已记录</Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>姓名：</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{selectedAccount?.real_name}</span>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Copy style={{ width: 12, height: 12 }} />}
                style={{ width: 24, height: 24, padding: 0 }}
                onClick={() => handleCopyToClipboard(selectedAccount?.real_name || '', '姓名')}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>账号：</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ background: 'var(--semi-color-fill-0)', padding: '4px 8px', borderRadius: 4 }}>{selectedAccount?.username}</code>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Copy style={{ width: 12, height: 12 }} />}
                style={{ width: 24, height: 24, padding: 0 }}
                onClick={() => handleCopyToClipboard(selectedAccount?.username || '', '账号')}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>新密码：</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ background: 'var(--semi-color-fill-0)', padding: '4px 8px', borderRadius: 4, fontWeight: 700 }}>{passwordResult?.new_password}</code>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Copy style={{ width: 12, height: 12 }} />}
                style={{ width: 24, height: 24, padding: 0 }}
                onClick={() => handleCopyToClipboard(passwordResult?.new_password || '', '密码')}
              />
            </div>
          </div>

          <Button theme="outline" className="rmf-copy-button" block icon={<Copy style={{ width: 16, height: 16 }} />} onClick={copyAllInfo}>
            一键复制（姓名/账号/密码）
          </Button>

          {passwordResult?.bound_employee ? (
            <Banner
              type="success"
              icon={<CheckCircle style={{ width: 16, height: 16 }} />}
              description={`密码已同步到员工：${passwordResult.bound_employee.name}（${passwordResult.bound_employee.username}）`}
            />
          ) : (
            <Banner
              type="info"
              description="该云客账号未绑定员工，密码未同步到系统用户"
            />
          )}

          <Banner
            type="danger"
            description="请立即将新密码告知用户，并提醒其首次登录后修改密码。"
          />
        </div>
      </Modal>

      {/* 确认对话框 */}
      <Modal
        title={confirmMessage.title}
        visible={confirmDialogOpen}
        onCancel={() => setConfirmDialogOpen(false)}
        okText="确认"
        cancelText="取消"
        onOk={handleConfirmAction}
      >
        {confirmMessage.description}
      </Modal>
    </>
  )
}

// 主页面组件
export function YunkeAccountsPage() {
  const queryClient = useQueryClient()
  const [searchValue, setSearchValue] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeTab, setActiveTab] = useState<string>('')
  const [filters, setFilters] = useState<SubAccountFilters>({
    crmBindingStatus: '',
    campusId: '',
    departmentId: '',
  })
  const [onboardingCred, setOnboardingCred] = useState<YunkeCredential | null>(null)
  const [deviceUnbindDialogOpen, setDeviceUnbindDialogOpen] = useState(false)
  const [deviceUnbindInput, setDeviceUnbindInput] = useState('')

  // 查询凭证列表
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['yunke-credentials-for-tabs'],
    queryFn: () => yunkeCredentialsApi.getCredentials({ limit: 100 }),
  })

  const { data: campusOptions = [], isLoading: isCampusOptionsLoading } = useQuery({
    queryKey: ['yunke-accounts-campus-options'],
    queryFn: async () => {
      const response = await adminApi.getCampusesSimple()
      return response.data || []
    },
  })

  const { data: departmentOptions = [], isLoading: isDepartmentOptionsLoading } = useQuery({
    queryKey: ['yunke-accounts-department-options'],
    queryFn: async () => {
      const response = await adminApi.getDepartmentsSimple()
      return response.data || []
    },
  })

  const credentials = credentialsData?.items ?? []
  const resolvedActiveTab = credentials.some((credential) => credential.id === activeTab)
    ? activeTab
    : (credentials[0]?.id ?? '')
  const activeCredential = credentials.find((credential) => credential.id === resolvedActiveTab) ?? null
  const parsedDeviceIds = useMemo(
    () => normalizeDeviceIdInput(deviceUnbindInput),
    [deviceUnbindInput]
  )
  const campusSelectOptions = useMemo(
    () => campusOptions.map((campus) => ({ label: campus.name, value: campus.id })),
    [campusOptions]
  )
  const departmentSelectOptions = useMemo(
    () => departmentOptions.map((department) => ({ label: department.name, value: department.id })),
    [departmentOptions]
  )
  const hasFilters = Boolean(filters.crmBindingStatus || filters.campusId || filters.departmentId)

  const handleSearch = () => {
    setSearchValue(searchInput)
  }

  const handleFilterChange = <K extends keyof SubAccountFilters>(
    key: K,
    value: SubAccountFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleClearFilters = () => {
    setFilters({
      crmBindingStatus: '',
      campusId: '',
      departmentId: '',
    })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
    queryClient.invalidateQueries({ queryKey: ['yunke-credentials-for-tabs'] })
  }

  const deviceUnbindMutation = useMutation({
    mutationFn: (payload: { yunke_admin_account_id: string; device_ids: string[] }) =>
      yunkeOnboardingApi.unbindDevices(payload),
    onSuccess: (res) => {
      toast.success(`已提交 ${res.count} 个设备解绑`)
      setDeviceUnbindDialogOpen(false)
      setDeviceUnbindInput('')
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '设备解绑失败')
    },
  })

  const handleOpenDeviceUnbindDialog = () => {
    if (!activeCredential) {
      toast.warning('请先选择云客凭证')
      return
    }
    if (activeCredential.status !== 1) {
      toast.warning('当前云客凭证未登录，请先刷新登录')
      return
    }
    setDeviceUnbindDialogOpen(true)
  }

  const handleSubmitDeviceUnbind = () => {
    if (!activeCredential) {
      toast.warning('请先选择云客凭证')
      return
    }
    if (parsedDeviceIds.length === 0) {
      toast.warning('请填写至少一个 IMEI 码')
      return
    }
    deviceUnbindMutation.mutate({
      yunke_admin_account_id: activeCredential.id,
      device_ids: parsedDeviceIds,
    })
  }

  // 加载状态
  if (credentialsLoading) {
    return (
      <DataTableLayout
        title="云客子账号管理"
        onRefresh={handleRefresh}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw style={{ width: 32, height: 32, color: 'var(--semi-color-text-2)', animation: 'spin 1s linear infinite' }} />
        </div>
      </DataTableLayout>
    )
  }

  // 无凭证时显示提示
  if (credentials.length === 0) {
    return (
      <DataTableLayout
        title="云客子账号管理"
        onRefresh={handleRefresh}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--semi-color-text-2)' }}>
          <AlertCircle style={{ width: 64, height: 64, marginBottom: 16 }} />
          <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>暂无账号凭证</p>
          <Text type="tertiary" style={{ marginBottom: 16 }}>请先在「账号凭证管理」页面添加云客账号</Text>
          <Button theme="outline" onClick={() => window.location.href = '/yunke/credentials'}>
            前往添加凭证
          </Button>
        </div>
      </DataTableLayout>
    )
  }

  return (
    <DataTableLayout
      title="云客子账号管理"
      onRefresh={handleRefresh}
      toolbar={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Input
            prefix={<IconSearch />}
            placeholder="输入姓名搜索..."
            style={{ width: 256 }}
            value={searchInput}
            onChange={v => setSearchInput(v)}
            onEnterPress={handleSearch}
          />
          <Button theme="outline" onClick={handleSearch}>搜索</Button>
          <Select
            placeholder="绑定状态"
            value={filters.crmBindingStatus || undefined}
            onChange={(value) =>
              handleFilterChange(
                'crmBindingStatus',
                (value as SubAccountFilters['crmBindingStatus']) || ''
              )
            }
            optionList={[
              { label: '已绑定 CRM', value: 'bound' },
              { label: '未绑定 CRM', value: 'unbound' },
            ]}
            showClear
            style={{ width: 130 }}
          />
          <Select
            placeholder="校区"
            value={filters.campusId || undefined}
            onChange={(value) => handleFilterChange('campusId', (value as string) || '')}
            optionList={campusSelectOptions}
            loading={isCampusOptionsLoading}
            filter
            showClear
            style={{ width: 160 }}
          />
          <Select
            placeholder="部门"
            value={filters.departmentId || undefined}
            onChange={(value) => handleFilterChange('departmentId', (value as string) || '')}
            optionList={departmentSelectOptions}
            loading={isDepartmentOptionsLoading}
            filter
            showClear
            style={{ width: 140 }}
          />
          {hasFilters && (
            <Button theme="borderless" type="tertiary" onClick={handleClearFilters}>
              清空筛选
            </Button>
          )}
          <Button
            theme="outline"
            icon={<Smartphone style={{ width: 14, height: 14 }} />}
            disabled={!activeCredential || activeCredential.status !== 1 || deviceUnbindMutation.isPending}
            onClick={handleOpenDeviceUnbindDialog}
          >
            解绑设备
          </Button>
        </div>
      }
    >
      {/* Tab 切换 */}
      <Tabs activeKey={resolvedActiveTab} onChange={setActiveTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {credentials.map((cred) => (
          <TabPane
            key={cred.id}
            itemKey={cred.id}
            tab={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: cred.status === 1 ? 'var(--semi-color-success)' : 'var(--semi-color-danger)',
                  }}
                />
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cred.company_name || cred.phone}
                </span>
              </span>
            }
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16, minHeight: 0 }}>
              {/* 凭证信息卡片 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '12px 16px', background: 'var(--semi-color-fill-0)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
                  <span style={{ fontWeight: 500 }}>{cred.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 style={{ width: 16, height: 16, color: 'var(--semi-color-text-2)' }} />
                  <span>{cred.company_name || '未设置公司'}</span>
                </div>
                <Tag
                  color={cred.status === 1 ? 'green' : 'red'}
                  type="light"
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {cred.status === 1 ? (
                    <><CheckCircle style={{ width: 12, height: 12 }} /> 已登录</>
                  ) : (
                    <><XCircle style={{ width: 12, height: 12 }} /> 未登录</>
                  )}
                </Tag>
                <Button
                  theme="solid"
                  type="primary"
                  icon={<UserPlus style={{ width: 14, height: 14 }} />}
                  disabled={cred.status !== 1}
                  onClick={() => setOnboardingCred(cred)}
                >
                  一键建咨询师
                </Button>
              </div>

              {/* 子账号表格 */}
              <SubAccountsTable credential={cred} searchValue={searchValue} filters={filters} />
            </div>
          </TabPane>
        ))}
      </Tabs>

      {onboardingCred && (
        <CreateConsultantDialog
          open={!!onboardingCred}
          credential={{
            id: onboardingCred.id,
            phone: onboardingCred.phone,
            company_name: onboardingCred.company_name,
            status: onboardingCred.status,
          }}
          onClose={() => {
            setOnboardingCred(null)
            // 提交成功后刷新子账号表格
            queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
          }}
        />
      )}

      <Modal
        title="设备解绑"
        visible={deviceUnbindDialogOpen}
        onCancel={() => {
          if (!deviceUnbindMutation.isPending) {
            setDeviceUnbindDialogOpen(false)
          }
        }}
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              theme="outline"
              disabled={deviceUnbindMutation.isPending}
              onClick={() => setDeviceUnbindDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="danger"
              loading={deviceUnbindMutation.isPending}
              disabled={parsedDeviceIds.length === 0}
              onClick={handleSubmitDeviceUnbind}
            >
              确认解绑{parsedDeviceIds.length > 0 ? `（${parsedDeviceIds.length}）` : ''}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Text type="tertiary">
            当前凭证：{activeCredential?.company_name || activeCredential?.phone || '-'}
          </Text>
          <TextArea
            value={deviceUnbindInput}
            onChange={setDeviceUnbindInput}
            placeholder="输入 IMEI 码，多个可换行或用逗号分隔"
            autosize={{ minRows: 5, maxRows: 8 }}
          />
          <Text type="tertiary" size="small">
            已识别 {parsedDeviceIds.length} 个设备码
          </Text>
        </div>
      </Modal>
    </DataTableLayout>
  )
}
