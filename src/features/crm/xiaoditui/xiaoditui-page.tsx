/**
 * 小地推（深互动）页面
 *
 * 流程设计:
 * 1. 进入页面 → checkMyStatus 探活
 * 2. 未绑定 → 单一「绑定引导卡」占据主视觉
 * 3. 已绑定 & 有效 → 紧凑「账号摘要条」+ 默认折叠的「更新账号」面板
 *    - 自动重登成功时给一个轻量 toast 提示
 * 4. 已绑定 & 失效 → 顶部告警 Banner + 摘要条 + 自动展开「更新账号」面板
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Avatar,
  Banner,
  Button,
  Card,
  Dropdown,
  Form,
  Modal,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  IconAlertTriangle,
  IconClock,
  IconEdit,
  IconExit,
  IconExternalOpen,
  IconKey,
  IconMore,
  IconRefresh,
  IconUnlock,
  IconUser,
} from '@douyinfe/semi-icons'

import { useDocumentTitle } from '@/hooks/use-document-title'
import { toast } from '@/lib/toast'
import { xiaoditangApi, type XiaoditangBindRequest } from './api'
import { TodayStatsBlock } from './today-stats'

const { Title, Text, Paragraph } = Typography

const XIADITUI_LOGIN_URL = 'https://push.shenhudong.com/login'
const pageClassName = 'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6'

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return value
  }
}

function relativeTime(value?: string | null): string | null {
  if (!value) return null
  try {
    const t = new Date(value).getTime()
    const diffSec = Math.floor((Date.now() - t) / 1000)
    if (diffSec < 60) return '刚刚'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`
    return `${Math.floor(diffSec / 86400)} 天前`
  } catch {
    return null
  }
}

export function XiaoditangPage() {
  useDocumentTitle('小地推')
  const queryClient = useQueryClient()
  const [updateOpen, setUpdateOpen] = useState(false)
  const bindFormRef = useRef<FormApi<{ phone: string; password: string }> | null>(
    null,
  )
  const updateFormRef = useRef<FormApi<{ phone: string; password: string }> | null>(
    null,
  )

  const statusQuery = useQuery({
    queryKey: ['xiaoditui', 'status'],
    queryFn: () => xiaoditangApi.checkMyStatus(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const status = statusQuery.data?.data
  const bound = !!status?.bound
  const valid = !!status?.valid
  const autoReloggedJustNow = !!status?.auto_relogin && valid
  const updatePanelOpen =
    updateOpen || (bound && !valid && !statusQuery.isPending)

  // 自动重登提示（一次性）
  useEffect(() => {
    if (autoReloggedJustNow) {
      toast.info({
        content: '小地推登录已自动续期：原 token 失效，已用保存的密码重登',
        duration: 4,
      })
    }
  }, [autoReloggedJustNow])

  // 编辑模式下，每次打开/状态刷新填充手机号
  useEffect(() => {
    if (updatePanelOpen && status?.phone) {
      updateFormRef.current?.setValues({
        phone: status.phone,
        password: '',
      })
    }
  }, [updatePanelOpen, status?.phone])

  const bindMutation = useMutation({
    mutationFn: (payload: XiaoditangBindRequest) =>
      xiaoditangApi.bindMyAccount(payload),
    onSuccess: (resp) => {
      toast.success(resp.message || '绑定成功')
      setUpdateOpen(false)
      bindFormRef.current?.reset()
      updateFormRef.current?.reset()
      queryClient.invalidateQueries({ queryKey: ['xiaoditui'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '绑定失败，请检查账号密码')
    },
  })

  const reloginMutation = useMutation({
    mutationFn: () => xiaoditangApi.reloginMyAccount(),
    onSuccess: (resp) => {
      toast.success(resp.message || '重新登录成功')
      queryClient.invalidateQueries({ queryKey: ['xiaoditui'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '重新登录失败')
    },
  })

  const unbindMutation = useMutation({
    mutationFn: () => xiaoditangApi.unbindMyAccount(),
    onSuccess: () => {
      toast.success('已解绑')
      setUpdateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['xiaoditui'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : '解绑失败')
    },
  })

  const handleSubmit = (values: { phone: string; password: string }) => {
    bindMutation.mutate({
      phone: values.phone.trim(),
      password: values.password,
      login_now: true,
    })
  }

  const handleUnbindClick = () => {
    Modal.confirm({
      title: '解绑小地推账号',
      content:
        '确定要解绑吗？已保存的账号、密码、token 与 cookies 都会一并清除。',
      okText: '解绑',
      okButtonProps: { type: 'danger' },
      cancelText: '取消',
      onOk: () => unbindMutation.mutate(),
    })
  }

  const lastLoginRel = useMemo(
    () => relativeTime(status?.last_login),
    [status?.last_login],
  )
  const lastCheckRel = useMemo(
    () => relativeTime(status?.last_check_at),
    [status?.last_check_at],
  )

  // ---------- Header ----------
  const Header = (
    <div className='flex items-start justify-between gap-4'>
      <div>
        <Title heading={3} style={{ margin: 0 }}>
          小地推
        </Title>
        <Paragraph type='tertiary' style={{ margin: '4px 0 0' }}>
          深互动 (push.shenhudong.com) 地推数据收集工具，账号信息加密保存于本系统。
        </Paragraph>
      </div>
      <Button
        theme='light'
        icon={<IconExternalOpen />}
        onClick={() => window.open(XIADITUI_LOGIN_URL, '_blank')}
      >
        打开小地推后台
      </Button>
    </div>
  )

  // ---------- Loading ----------
  if (statusQuery.isPending) {
    return (
      <div className={pageClassName}>
        {Header}
        <Card bordered>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '32px 0',
            }}
          >
            <Spin size='middle' />
            <Text type='tertiary'>正在校验小地推登录状态…</Text>
          </div>
        </Card>
      </div>
    )
  }

  // ---------- 未绑定 ----------
  if (!bound) {
    return (
      <div className={pageClassName}>
        {Header}
        <Card
          bordered
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <IconUnlock />
              <span>绑定小地推账号</span>
            </span>
          }
        >
          <Paragraph type='tertiary' style={{ marginBottom: 16 }}>
            填写您在小地推（深互动）后台的账号密码，绑定后系统会保存登录态，
            并在失效时自动用密码重新登录。
          </Paragraph>
          <Form<{ phone: string; password: string }>
            getFormApi={(api) => (bindFormRef.current = api)}
            onSubmit={handleSubmit}
            labelPosition='left'
            labelWidth={80}
          >
            <Form.Input
              field='phone'
              label='手机号'
              placeholder='例如 15555586654'
              rules={[
                { required: true, message: '请填写手机号' },
                { pattern: /^\d{11}$/, message: '手机号格式不正确' },
              ]}
            />
            <Form.Input
              field='password'
              label='密码'
              mode='password'
              placeholder='输入小地推登录密码'
              rules={[{ required: true, message: '请填写密码' }]}
            />
            <Button
              theme='solid'
              type='primary'
              loading={bindMutation.isPending}
              onClick={() => bindFormRef.current?.submitForm()}
              style={{ marginTop: 8 }}
            >
              绑定并登录
            </Button>
          </Form>
        </Card>
      </div>
    )
  }

  // ---------- 已绑定 ----------
  return (
    <div className={pageClassName}>
      {Header}

      {/* 仅失效时才显示告警 Banner（成功状态由摘要条本身传达） */}
      {!valid && (
        <Banner
          fullMode={false}
          type='danger'
          icon={<IconAlertTriangle />}
          description={
            <span>
              小地推登录已失效：
              <Text type='danger' strong>
                {status?.message || status?.last_error || '请重新登录'}
              </Text>
              。可点击「重新登录」重试，或在下方更新密码后重新绑定。
            </span>
          }
        />
      )}

      {/* 账号卡片 - 身份块（左）+ 主操作（右）+ 次级菜单 */}
      <Card bordered bodyStyle={{ padding: '20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* —— 身份块：头像 + 账号 + 副标 —— */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              minWidth: 0,
            }}
          >
            <Avatar
              size='default'
              style={{
                backgroundColor: valid ? '#16a34a' : '#dc2626',
                flexShrink: 0,
              }}
            >
              <IconUser />
            </Avatar>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text strong style={{ fontSize: 16, lineHeight: 1.2 }}>
                  {status?.phone}
                </Text>
                {valid ? (
                  <Tag color='green' size='small'>
                    正常
                  </Tag>
                ) : (
                  <Tag color='red' size='small'>
                    需要重登
                  </Tag>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <Text type='tertiary' size='small'>
                  {valid ? '登录有效' : '登录失效'}
                </Text>
                <Tooltip content={formatDateTime(status?.last_login)}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <IconClock
                      size='small'
                      style={{ color: 'var(--semi-color-text-2)' }}
                    />
                    <Text type='tertiary' size='small'>
                      登录于 {lastLoginRel || '—'}
                    </Text>
                  </span>
                </Tooltip>
                <Tooltip content={formatDateTime(status?.last_check_at)}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <IconRefresh
                      size='small'
                      style={{ color: 'var(--semi-color-text-2)' }}
                    />
                    <Text type='tertiary' size='small'>
                      校验于 {lastCheckRel || '—'}
                    </Text>
                  </span>
                </Tooltip>
                <Tooltip content={`完整 token：${status?.token_preview || '无'}`}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <IconKey
                      size='small'
                      style={{ color: 'var(--semi-color-text-2)' }}
                    />
                    <Text type='tertiary' size='small' code>
                      {status?.token_preview || '—'}
                    </Text>
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* —— 主操作 + 次级菜单 —— */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Button
              theme='solid'
              type='primary'
              icon={<IconRefresh />}
              loading={reloginMutation.isPending}
              onClick={() => reloginMutation.mutate()}
            >
              重新登录
            </Button>
            <Dropdown
              trigger='click'
              position='bottomRight'
              render={
                <Dropdown.Menu>
                  <Dropdown.Item
                    icon={<IconRefresh />}
                    onClick={() => statusQuery.refetch()}
                  >
                    重新校验登录态
                  </Dropdown.Item>
                  <Dropdown.Item
                    icon={<IconEdit />}
                    onClick={() => setUpdateOpen(true)}
                  >
                    更新账号密码
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    icon={<IconExit />}
                    type='danger'
                    onClick={handleUnbindClick}
                  >
                    解绑账号
                  </Dropdown.Item>
                </Dropdown.Menu>
              }
            >
              <Button
                theme='borderless'
                type='tertiary'
                icon={<IconMore />}
                aria-label='更多操作'
              />
            </Dropdown>
          </div>
        </div>
      </Card>

      {/* 今日数据收集统计 */}
      <TodayStatsBlock enabled={valid} />

      {/* 更新账号 - 默认折叠，失效时自动展开（用 hidden 而非卸载，保留 form ref） */}
      <div style={{ display: updatePanelOpen ? 'block' : 'none' }}>
        <Card
          bordered
          title='更新账号'
          headerExtraContent={
            <Text type='tertiary' size='small'>
              账号或密码改了？在这里覆盖旧凭据。
            </Text>
          }
        >
          <Form<{ phone: string; password: string }>
            getFormApi={(api) => (updateFormRef.current = api)}
            onSubmit={handleSubmit}
            labelPosition='left'
            labelWidth={80}
            initValues={{ phone: status?.phone || '', password: '' }}
          >
            <Form.Input
              field='phone'
              label='手机号'
              placeholder='例如 15555586654'
              rules={[
                { required: true, message: '请填写手机号' },
                { pattern: /^\d{11}$/, message: '手机号格式不正确' },
              ]}
            />
            <Form.Input
              field='password'
              label='新密码'
              mode='password'
              placeholder='输入小地推登录密码'
              rules={[{ required: true, message: '请填写密码' }]}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button
                theme='solid'
                type='primary'
                loading={bindMutation.isPending}
                onClick={() => updateFormRef.current?.submitForm()}
              >
                更新并重新登录
              </Button>
              <Button onClick={() => updateFormRef.current?.reset()}>清空</Button>
            </div>
            <Paragraph
              type='tertiary'
              size='small'
              style={{ marginTop: 12, marginBottom: 0 }}
            >
              密码用于自动重新登录，不会展示给其他人，仅自己可见。
            </Paragraph>
          </Form>
        </Card>
      </div>
    </div>
  )
}
