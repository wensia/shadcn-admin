/**
 * 云客账号管理页面
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Phone,
  Building2,
  Key,
  Link,
  Unlink,
  Copy,
  CheckCircle,
  XCircle,
  PauseCircle,
  LogIn,
  Zap,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Button, Input, Select, Modal, Form, Typography, Tag } from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'

import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { yunkeAdminApi } from '../api'
import type { YunkeSubAccount, YunkeAvailableEmployee, YunkePasswordResetResponse } from '../types'
import { formatTime } from '@/lib/utils/time'

const { Text } = Typography

type AccountStatusColor = 'green' | 'grey' | 'red'

interface LoginFormValues {
  phone: string
  password: string
}

interface LoginStatusInfo {
  is_logged_in: boolean
  message: string
}


// 状态选项
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '正常' },
  { value: 'paused', label: '暂停' },
  { value: 'inactive', label: '停用' },
]

export function YunkeAccountsPage() {
  const queryClient = useQueryClient()
  const loginFormRef = useRef<FormApi>()

  // 状态管理
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [bindDialogOpen, setBindDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'resetPassword' | 'unbind' | 'autoSync' | 'batchLogin'
    account?: YunkeSubAccount
  } | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<YunkeSubAccount | null>(null)
  const [passwordResult, setPasswordResult] = useState<YunkePasswordResetResponse | null>(null)
  const [loginStatusMap, setLoginStatusMap] = useState<Map<string, LoginStatusInfo>>(new Map())

  // 查询云客子账号列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['yunke-sub-accounts', page, pageSize, searchValue, statusFilter],
    queryFn: async () => {
      const params: { page?: number; page_size?: number; real_name?: string; auth_status?: string } = {
        page,
        page_size: pageSize,
      }
      if (searchValue) params.real_name = searchValue
      if (statusFilter !== 'all') params.auth_status = statusFilter
      return yunkeAdminApi.getSubAccounts(params)
    },
  })

  // 查询可绑定员工列表
  const { data: employeesData } = useQuery({
    queryKey: ['yunke-available-employees'],
    queryFn: () => yunkeAdminApi.getAvailableEmployees(),
  })

  const employees = useMemo<YunkeAvailableEmployee[]>(() => employeesData ?? [], [employeesData])
  const accounts = useMemo<YunkeSubAccount[]>(() => data?.users ?? [], [data?.users])
  const total = data?.total ?? 0

  // 管理员登录
  const loginMutation = useMutation({
    mutationFn: (data: { phone: string; password: string }) => yunkeAdminApi.login(data),
    onSuccess: () => {
      toast.success('云客管理员登录成功')
      setLoginDialogOpen(false)
      loginFormRef.current?.reset()
      refetch()
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '登录失败')
    },
  })

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: (data: { yunke_user_id: string; phone: string }) => yunkeAdminApi.resetPassword(data),
    onSuccess: (response) => {
      setPasswordResult(response)
      setPasswordDialogOpen(true)
      toast.success('密码重置成功')
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '密码重置失败')
    },
  })

  // 绑定员工
  const bindMutation = useMutation({
    mutationFn: (data: { yunke_phone: string; yunke_user_id: string; employee_id: string }) =>
      yunkeAdminApi.bindEmployee(data),
    onSuccess: () => {
      toast.success('绑定成功')
      setBindDialogOpen(false)
      setSelectedAccount(null)
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '绑定失败')
    },
  })

  // 解绑员工
  const unbindMutation = useMutation({
    mutationFn: (data: { employee_id: string }) => yunkeAdminApi.unbindEmployee(data),
    onSuccess: () => {
      toast.success('解绑成功')
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '解绑失败')
    },
  })

  // 自动同步绑定
  const autoSyncMutation = useMutation({
    mutationFn: () => yunkeAdminApi.autoSyncBindings(),
    onSuccess: (response) => {
      if (response.matched > 0) {
        toast.success(`同步完成：成功匹配并绑定 ${response.matched}/${response.total} 个账号`)
      } else {
        toast.info('未找到可匹配的账号，请检查姓名是否一致')
      }
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['yunke-available-employees'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '同步失败')
    },
  })

  // 检查登录状态
  const checkLoginStatusMutation = useMutation({
    mutationFn: () => yunkeAdminApi.checkAllLoginStatus(),
    onSuccess: (response) => {
      const newMap = new Map<string, LoginStatusInfo>()
      response.details.forEach((detail) => {
        newMap.set(detail.employee_id, {
          is_logged_in: detail.is_logged_in,
          message: detail.message,
        })
      })
      setLoginStatusMap(newMap)
      toast.info(`检查完成：${response.logged_in}/${response.total} 个账号已登录`)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '检查登录状态失败')
    },
  })

  // 批量更新登录
  const batchLoginMutation = useMutation({
    mutationFn: () => yunkeAdminApi.batchUpdateLogin(),
    onSuccess: (response) => {
      const { success, failed, skipped } = response
      if (success > 0) {
        toast.success(`成功更新 ${success} 个账号的登录状态`)
      }
      if (failed > 0) {
        toast.warning(`${failed} 个账号更新失败`)
      }
      if (skipped > 0) {
        toast.info(`${skipped} 个账号被跳过（未保存密码）`)
      }
      setTimeout(() => checkLoginStatusMutation.mutate(), 1000)
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '批量更新失败')
    },
  })

  // 状态图标映射
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { icon: typeof CheckCircle; color: AccountStatusColor; label: string }> = {
      active: { icon: CheckCircle, color: 'green', label: '正常' },
      paused: { icon: PauseCircle, color: 'grey', label: '暂停' },
      inactive: { icon: XCircle, color: 'red', label: '停用' },
    }
    return statusMap[status] || statusMap.active
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
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-500" />
            <div>
              <Text strong>{record.real_name || record.username}</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                <Phone className="h-3 w-3" />
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
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" style={{ color: 'var(--semi-color-text-2)' }} />
            <span>{text || '未分配'}</span>
          </div>
        )
      },
    },
    {
      title: '职位',
      dataIndex: 'position',
      width: 120,
      render: (text: string, record: YunkeSubAccount) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <Tag size="small">{text || '未设置'}</Tag>
      },
    },
    {
      title: '云客登录状态',
      dataIndex: 'id',
      width: 120,
      render: (_id: string, record: YunkeSubAccount) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        const boundEmployee = record.bound_employee
        if (!boundEmployee) {
          return <Tag size="small">未绑定</Tag>
        }

        const status = loginStatusMap.get(boundEmployee.id)
        if (checkLoginStatusMutation.isPending) {
          return <Text type="tertiary" size="small">检查中...</Text>
        }
        if (!status) {
          return <Tag size="small">未检查</Tag>
        }

        return (
          <Tag size="small" color={status.is_logged_in ? 'green' : 'red'}>
            {status.is_logged_in ? <CheckCircle className="h-3 w-3 mr-1 inline" /> : <XCircle className="h-3 w-3 mr-1 inline" />}
            {status.is_logged_in ? '已登录' : '未登录'}
          </Tag>
        )
      },
    },
    {
      title: '绑定用户',
      dataIndex: 'bound_employee',
      width: 180,
      render: (_boundEmployee: YunkeSubAccount['bound_employee'], record: YunkeSubAccount) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={128} />
        const boundEmployee = record.bound_employee
        if (boundEmployee) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size="small" color="grey">
                <Link className="h-3 w-3 mr-1 inline" />
                {boundEmployee.name}
              </Tag>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<Unlink className="h-3 w-3" />}
                size="small"
                style={{ width: 24, height: 24 }}
                onClick={() => handleUnbindClick(record)}
              />
            </div>
          )
        }
        return (
          <Button theme="outline" size="small" icon={<Link className="h-3 w-3" />} onClick={() => handleBindClick(record)}>
            绑定员工
          </Button>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_status: string, record: YunkeSubAccount) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        const statusInfo = getStatusInfo(record.status)
        const Icon = statusInfo.icon
        return (
          <Tag size="small" color={statusInfo.color}>
            <Icon className="h-3 w-3 mr-1 inline" />
            {statusInfo.label}
          </Tag>
        )
      },
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_time',
      width: 160,
      render: (text: string, record: YunkeSubAccount) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return <Text type="tertiary">{text ? formatTime(text) : '从未登录'}</Text>
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 120,
      render: (_id: string, record: YunkeSubAccount) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return (
          <Button theme="outline" size="small" icon={<Key className="h-4 w-4" />} onClick={() => handleResetPasswordClick(record)}>
            重置密码
          </Button>
        )
      },
    },
  ]

  const items = accounts

  // 处理函数
  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const handleRefresh = () => {
    refetch()
    checkLoginStatusMutation.mutate()
  }

  const handleLoginClick = () => {
    setLoginDialogOpen(true)
    setTimeout(() => { loginFormRef.current?.reset() }, 0)
  }

  const handleLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({ phone: values.phone, password: values.password })
  }

  const handleResetPasswordClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setConfirmAction({ type: 'resetPassword', account })
    setConfirmDialogOpen(true)
  }

  const handleBindClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setBindDialogOpen(true)
  }

  const handleUnbindClick = (account: YunkeSubAccount) => {
    setSelectedAccount(account)
    setConfirmAction({ type: 'unbind', account })
    setConfirmDialogOpen(true)
  }

  const handleAutoSync = () => {
    setConfirmAction({ type: 'autoSync' })
    setConfirmDialogOpen(true)
  }

  const handleBatchLogin = () => {
    setConfirmAction({ type: 'batchLogin' })
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
          })
        }
        break
      case 'unbind':
        if (confirmAction.account?.bound_employee) {
          unbindMutation.mutate({ employee_id: confirmAction.account.bound_employee.id })
        }
        break
      case 'autoSync':
        autoSyncMutation.mutate()
        break
      case 'batchLogin':
        batchLoginMutation.mutate()
        break
    }
    setConfirmDialogOpen(false)
    setConfirmAction(null)
  }

  const handleBindEmployee = (employeeId: string) => {
    if (!selectedAccount) return
    bindMutation.mutate({
      yunke_phone: selectedAccount.phone,
      yunke_user_id: selectedAccount.id,
      employee_id: employeeId,
    })
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
      case 'autoSync':
        return {
          title: '一键同步',
          description: '将自动匹配云客账号和CRM员工的姓名，如果姓名一致则自动绑定。是否继续？',
        }
      case 'batchLogin':
        return {
          title: '确认批量更新登录',
          description: '将为所有已绑定的员工执行云客登录并更新cookies，该操作可能需要一些时间。是否继续？',
        }
    }
  }

  const confirmMessage = getConfirmMessage()

  return (
    <>
      <DataTableLayout
        title="云客子账号管理"
        total={total}
        headerActions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button theme="outline" icon={<LogIn className="h-4 w-4" />} onClick={handleLoginClick}>
              云客管理员登录
            </Button>
            <Button theme="outline" icon={<Zap className="h-4 w-4" />} onClick={handleAutoSync} disabled={autoSyncMutation.isPending}>
              一键同步
            </Button>
            <Button theme="outline" icon={<CheckCircle className="h-4 w-4" />} onClick={() => checkLoginStatusMutation.mutate()} disabled={checkLoginStatusMutation.isPending}>
              检查登录状态
            </Button>
            <Button theme="outline" icon={<IconRefresh />} onClick={handleBatchLogin} disabled={batchLoginMutation.isPending}>
              一键更新登录
            </Button>
          </div>
        }
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              prefix={<IconSearch />}
              placeholder="输入姓名搜索..."
              value={searchValue}
              onChange={(v) => setSearchValue(v)}
              onEnterPress={handleSearch}
              showClear
              style={{ width: 250 }}
            />
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
              optionList={STATUS_OPTIONS}
              style={{ width: 130 }}
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
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
      </DataTableLayout>

      {/* 云客管理员登录对话框 */}
      <Modal
        title="云客管理员登录"
        visible={loginDialogOpen}
        onCancel={() => setLoginDialogOpen(false)}
        width={400}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setLoginDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={() => loginFormRef.current?.submitForm()} loading={loginMutation.isPending}>登录</Button>
          </div>
        }
      >
        <Form
          getFormApi={(api) => { loginFormRef.current = api }}
          onSubmit={handleLoginSubmit}
          labelPosition="top"
        >
          <Form.Input field="phone" label="手机号" placeholder="请输入云客管理员手机号" rules={[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }]} />
          <Form.Input field="password" label="密码" placeholder="请输入密码" mode="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]} />
        </Form>
      </Modal>

      {/* 绑定员工对话框 */}
      <Modal
        title="绑定员工"
        visible={bindDialogOpen}
        onCancel={() => setBindDialogOpen(false)}
        width={500}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBindDialogOpen(false)}>取消</Button>
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
          为云客账号 {selectedAccount?.real_name}（{selectedAccount?.phone}）选择要绑定的员工
        </Text>
        <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {employees.map((emp) => (
            <div
              key={emp.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 12, border: '1px solid var(--semi-color-border)', borderRadius: 6,
                cursor: 'pointer',
              }}
              className="hover:bg-[var(--semi-color-fill-0)]"
              onClick={() => handleBindEmployee(emp.id)}
            >
              <div>
                <Text strong>{emp.name}</Text>
                <div style={{ fontSize: 13, color: 'var(--semi-color-text-2)' }}>
                  {emp.username} · {emp.campus_name || '未分配校区'}
                </div>
                {emp.bound_yunke && (
                  <div style={{ fontSize: 12, color: 'var(--semi-color-warning)' }}>
                    已绑定: {emp.bound_yunke.phone}
                  </div>
                )}
              </div>
              <Button theme="borderless" type="tertiary" size="small" disabled={bindMutation.isPending}>
                选择
              </Button>
            </div>
          ))}
          {employees.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--semi-color-text-2)' }}>
              暂无可绑定的员工
            </div>
          )}
        </div>
      </Modal>

      {/* 密码重置结果对话框 */}
      <Modal
        title="密码重置成功"
        visible={passwordDialogOpen}
        onCancel={() => setPasswordDialogOpen(false)}
        width={450}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button theme="solid" type="primary" onClick={() => setPasswordDialogOpen(false)}>我已记录</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <Text strong>姓名：</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{selectedAccount?.real_name}</span>
              <Button theme="borderless" type="tertiary" icon={<Copy className="h-3 w-3" />} size="small" onClick={() => handleCopyToClipboard(selectedAccount?.real_name || '', '姓名')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <Text strong>账号：</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ background: 'var(--semi-color-fill-0)', padding: '2px 8px', borderRadius: 4 }}>{selectedAccount?.username}</code>
              <Button theme="borderless" type="tertiary" icon={<Copy className="h-3 w-3" />} size="small" onClick={() => handleCopyToClipboard(selectedAccount?.username || '', '账号')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
            <Text strong>新密码：</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ background: 'var(--semi-color-fill-0)', padding: '2px 8px', borderRadius: 4, fontWeight: 'bold' }}>{passwordResult?.new_password}</code>
              <Button theme="borderless" type="tertiary" icon={<Copy className="h-3 w-3" />} size="small" onClick={() => handleCopyToClipboard(passwordResult?.new_password || '', '密码')} />
            </div>
          </div>

          <Button theme="outline" block icon={<Copy className="h-4 w-4" />} onClick={copyAllInfo}>
            一键复制（姓名/账号/密码）
          </Button>

          {passwordResult?.bound_employee ? (
            <div style={{ padding: '8px 12px', background: 'var(--semi-color-success-light-default)', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <CheckCircle className="h-4 w-4 mt-0.5" style={{ color: 'var(--semi-color-success)' }} />
              <div>
                <Text strong size="small">密码已同步</Text>
                <Text type="tertiary" size="small" style={{ display: 'block' }}>
                  密码已同步到员工：{passwordResult.bound_employee.name}（{passwordResult.bound_employee.username}）
                </Text>
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 12px', background: 'var(--semi-color-fill-0)', borderRadius: 6 }}>
              <Text type="tertiary" size="small">
                该云客账号未绑定员工，密码未同步到系统用户
              </Text>
            </div>
          )}

          <div style={{ padding: '8px 12px', background: 'var(--semi-color-danger-light-default)', borderRadius: 6 }}>
            <Text type="danger" size="small">
              请立即将新密码告知用户，并提醒其首次登录后修改密码。
            </Text>
          </div>
        </div>
      </Modal>

      {/* 确认对话框 */}
      <Modal
        title={confirmMessage.title}
        visible={confirmDialogOpen}
        onCancel={() => setConfirmDialogOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setConfirmDialogOpen(false)}>取消</Button>
            <Button theme="solid" type="primary" onClick={handleConfirmAction}>确认</Button>
          </div>
        }
      >
        {confirmMessage.description}
      </Modal>
    </>
  )
}
