/**
 * 云客子账号管理页面 - Semi Design
 * 按凭证分 Tab 展示子账号
 */

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  Phone,
  Building2,
  RefreshCw,
  Key,
  Link,
  Unlink,
  Copy,
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertCircle,
  Check,
  LogIn,
} from 'lucide-react'
import { toast } from 'sonner'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { Main } from '@/components/layout/main'
import { Table, Button, Input, Tag, Skeleton, Modal, Tabs, TabPane, Typography, Banner } from '@douyinfe/semi-ui-19'
import { IconSearch } from '@douyinfe/semi-icons'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { SemiTablePagination } from '@/components/semi/table-pagination'
import { isSkeletonRow, createSkeletonData } from '@/lib/table-utils'
import { yunkeApi, yunkeCredentialsApi } from '../api'
import type { YunkeSubAccount, YunkeAvailableEmployee, YunkePasswordResetResponse, YunkeCredential } from '../types'

const { Text } = Typography

// 子账号表格组件
function SubAccountsTable({
  credential,
  searchValue,
}: {
  credential: YunkeCredential
  searchValue: string
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
    type: 'resetPassword' | 'unbind'
    account?: YunkeSubAccount
  } | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<YunkeSubAccount | null>(null)
  const [passwordResult, setPasswordResult] = useState<YunkePasswordResetResponse | null>(null)

  // 查询子账号列表
  const { data, isLoading } = useQuery({
    queryKey: ['yunke-sub-accounts', credential.id, page, pageSize, searchValue],
    queryFn: async () => {
      const params: { page?: number; page_size?: number; real_name?: string } = {
        page,
        page_size: pageSize,
      }
      if (searchValue) params.real_name = searchValue
      return yunkeCredentialsApi.getSubAccountsByCredential(credential.id, params)
    },
    enabled: credential.status === 1,
  })

  // 查询可绑定员工列表
  const { data: employeesData } = useQuery({
    queryKey: ['yunke-available-employees'],
    queryFn: () => yunkeApi.getAvailableEmployees(),
  })

  const employees = employeesData || []
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
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '密码重置失败')
    },
  })

  // 绑定员工
  const bindMutation = useMutation({
    mutationFn: (data: { yunke_phone: string; yunke_user_id: string; employee_id: string }) =>
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
    mutationFn: (data: { employee_id: string }) => yunkeApi.unbindEmployee(data),
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
    mutationFn: (data: { employee_id: string }) => yunkeApi.loginForEmployee(data),
    onSuccess: (response) => {
      toast.success(response.message || '登录成功')
      queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '登录失败')
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
  const columns: ColumnProps<YunkeSubAccount>[] = useMemo(
    () => [
      {
        title: '账号信息',
        dataIndex: 'username',
        width: 200,
        render: (_text: string, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 160 }} />
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
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 80 }} />
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
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
          return (
            <Tag type="ghost">{record.position || record.role_name || '未设置'}</Tag>
          )
        },
      },
      {
        title: '绑定用户',
        dataIndex: 'bound_employee',
        width: 180,
        render: (_: unknown, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 128 }} />
          const bound = record.bound_employee
          if (bound) {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color="grey" type="light" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Link style={{ width: 12, height: 12 }} />
                  {bound.name}
                </Tag>
                <Button
                  theme="borderless"
                  type="tertiary"
                  size="small"
                  icon={<Unlink style={{ width: 12, height: 12 }} />}
                  style={{ width: 24, height: 24, padding: 0 }}
                  onClick={() => handleUnbindClick(record)}
                />
              </div>
            )
          }
          return (
            <Button
              theme="outline"
              size="small"
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
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 64 }} />
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
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 56 }} />
          const statusInfo = getStatusInfo(record.status)
          const Icon = statusInfo.icon
          return (
            <Tag color={statusInfo.color as any} type="light" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon style={{ width: 12, height: 12 }} />
              {statusInfo.label}
            </Tag>
          )
        },
      },
      {
        title: '操作',
        dataIndex: 'actions',
        width: 180,
        fixed: 'right' as const,
        render: (_: unknown, record: YunkeSubAccount) => {
          if (isSkeletonRow(record.id)) return <Skeleton.Paragraph rows={1} style={{ width: 112 }} />
          const bound = record.bound_employee
          const loginStatus = record.login_status
          const isLoggedIn = loginStatus?.is_logged_in
          const canLogin = bound && loginStatus?.has_password
          const loginDisabled =
            !bound || !loginStatus?.has_password || loginForEmployeeMutation.isPending

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button
                theme={isLoggedIn ? 'light' : 'outline'}
                size="small"
                style={{ height: 28, fontSize: 12 }}
                disabled={loginDisabled}
                title={!bound ? '请先绑定员工' : !loginStatus?.has_password ? '请先重置密码' : undefined}
                onClick={() => {
                  if (bound && canLogin) {
                    loginForEmployeeMutation.mutate({ employee_id: bound.id })
                  }
                }}
              >
                {isLoggedIn ? '重新登录' : '登录'}
              </Button>
              <Button
                theme="outline"
                size="small"
                style={{ height: 28, fontSize: 12 }}
                onClick={() => handleResetPasswordClick(record)}
              >
                重置密码
              </Button>
            </div>
          )
        },
      },
    ],
    []
  )

  // 表格数据
  const tableData = isLoading ? createSkeletonData<YunkeSubAccount>(5) : accounts

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
          unbindMutation.mutate({ employee_id: confirmAction.account.bound_employee.id })
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
        if (record.bound_yunke) {
          return (
            <Tag color="orange" type="ghost" size="small">{record.bound_yunke.phone}</Tag>
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
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey="id"
          pagination={false}
          empty={<div style={{ padding: 48, textAlign: 'center', color: 'var(--semi-color-text-2)' }}>暂无数据</div>}
        />
      </div>

      {/* 分页 */}
      {total > 0 && (
        <SemiTablePagination
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      {/* 绑定员工对话框 */}
      <Modal
        title="选择要绑定的员工"
        visible={bindDialogOpen}
        onCancel={() => setBindDialogOpen(false)}
        width={720}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button theme="outline" size="small" onClick={() => setBindDialogOpen(false)}>取消</Button>
            <Button
              size="small"
              onClick={handleBindEmployee}
              disabled={!selectedBindEmployee || bindMutation.isPending}
              loading={bindMutation.isPending}
            >
              {bindMutation.isPending
                ? '绑定中...'
                : selectedBindEmployee
                  ? `确定选择 ${selectedBindEmployee.name}`
                  : '请先选择员工'}
            </Button>
          </div>
        }
      >
        <Text type="tertiary" size="small" style={{ display: 'block', marginBottom: 12 }}>
          为云客账号 {selectedAccount?.real_name}（{selectedAccount?.phone}）选择要绑定的员工
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
            size="small"
            style={{ width: 224 }}
          />
          <Text type="tertiary" size="small">
            共 {filteredEmployees.length} 位员工
          </Text>
        </div>

        {/* 员工表格 */}
        <Table
          columns={bindColumns}
          dataSource={paginatedEmployees}
          rowKey="id"
          pagination={false}
          size="small"
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
              size="small"
              disabled={bindPage <= 1}
              onClick={() => setBindPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Text size="small">第 {bindPage} / {totalBindPages} 页</Text>
            <Button
              theme="outline"
              size="small"
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
                size="small"
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
                size="small"
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
                size="small"
                icon={<Copy style={{ width: 12, height: 12 }} />}
                style={{ width: 24, height: 24, padding: 0 }}
                onClick={() => handleCopyToClipboard(passwordResult?.new_password || '', '密码')}
              />
            </div>
          </div>

          <Button theme="outline" block icon={<Copy style={{ width: 16, height: 16 }} />} onClick={copyAllInfo}>
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

  // 查询凭证列表
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['yunke-credentials-for-tabs'],
    queryFn: () => yunkeCredentialsApi.getCredentials({ limit: 100 }),
  })

  const credentials = credentialsData?.items || []

  // 设置默认 Tab
  useMemo(() => {
    if (credentials.length > 0 && !activeTab) {
      setActiveTab(credentials[0].id)
    }
  }, [credentials, activeTab])

  const handleSearch = () => {
    setSearchValue(searchInput)
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['yunke-sub-accounts'] })
    queryClient.invalidateQueries({ queryKey: ['yunke-credentials-for-tabs'] })
  }

  // 加载状态
  if (credentialsLoading) {
    return (
      <Main fixed>
        <div style={{ display: 'flex', height: '100%', flexDirection: 'column', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>云客子账号管理</h1>
            <Text type="tertiary" size="small">加载中...</Text>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 32, height: 32, color: 'var(--semi-color-text-2)', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      </Main>
    )
  }

  // 无凭证时显示提示
  if (credentials.length === 0) {
    return (
      <Main fixed>
        <div style={{ display: 'flex', height: '100%', flexDirection: 'column', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>云客子账号管理</h1>
            <Text type="tertiary" size="small">管理云客子账号、绑定员工、重置密码</Text>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--semi-color-text-2)' }}>
            <AlertCircle style={{ width: 64, height: 64, marginBottom: 16 }} />
            <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>暂无账号凭证</p>
            <Text type="tertiary" style={{ marginBottom: 16 }}>请先在「账号凭证管理」页面添加云客账号</Text>
            <Button theme="outline" onClick={() => window.location.href = '/yunke/credentials'}>
              前往添加凭证
            </Button>
          </div>
        </div>
      </Main>
    )
  }

  return (
    <Main fixed>
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column', gap: 16 }}>
        {/* 搜索栏 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            prefix={<IconSearch />}
            placeholder="输入姓名搜索..."
            style={{ width: 256 }}
            value={searchInput}
            onChange={v => setSearchInput(v)}
            onEnterPress={handleSearch}
          />
          <Button theme="outline" onClick={handleSearch}>搜索</Button>
          <div style={{ flex: 1 }} />
          <Button
            theme="borderless"
            type="tertiary"
            icon={<RefreshCw style={{ width: 16, height: 16 }} />}
            onClick={handleRefresh}
          />
        </div>

        {/* Tab 切换 */}
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                </div>

                {/* 子账号表格 */}
                <SubAccountsTable credential={cred} searchValue={searchValue} />
              </div>
            </TabPane>
          ))}
        </Tabs>
      </div>
    </Main>
  )
}
