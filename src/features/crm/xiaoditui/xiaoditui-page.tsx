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

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Banner,
  Button,
  Card,
  Dropdown,
  Form,
  Modal,
  Spin,
  Tabs,
  TabPane,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  IconActivity,
  IconAlertTriangle,
  IconBarChartVStroked,
  IconClock,
  IconEdit,
  IconExit,
  IconExternalOpen,
  IconInfoCircle,
  IconMore,
  IconRefresh,
  IconUnlock,
  IconUserGroup,
} from '@douyinfe/semi-icons'

import { useDocumentTitle } from '@/hooks/use-document-title'
import { toast } from '@/lib/toast'
import {
  xiaoditangApi,
  type XiaoditangBindRequest,
  type XiaoditangOverviewStats,
  type XiaoditangStatusView,
} from './api'
import { XiaodituiLeadDetailsContent } from './lead-details-page'
import {
  XiaodituiCollectionCalendarTab,
  XiaodituiParttimeTab,
  XiaodituiSalaryWorkspace,
  type XiaodituiSalaryWorkspaceOpenParams,
} from './salary-tab'
import { TodayStatsBlock } from './today-stats'
import { XiaodituiWatermarkCameraTab } from './watermark-camera-tab'

const { Title, Text, Paragraph } = Typography

const XIADITUI_LOGIN_URL = 'https://push.shenhudong.com/login'
const pageClassName = 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4'
type AccountDataTabKey =
  | 'activity'
  | 'lead-details'
  | 'parttime'
  | 'salary'
  | 'collection-calendar'
  | 'watermark-camera'
  | 'total'

type XiaodituiPageSearch = {
  tab?: AccountDataTabKey
  activity_id?: number
  start_date?: string
  end_date?: string
  market_id?: number
}

function isAccountDataTabKey(value: string): value is AccountDataTabKey {
  return [
    'activity',
    'lead-details',
    'parttime',
    'salary',
    'collection-calendar',
    'watermark-camera',
    'total',
  ].includes(value)
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false })
  } catch {
    return value
  }
}

function formatSyncStatusText(
  syncing?: boolean,
  lastSyncedAt?: string | null,
): string {
  const lastSyncedText = lastSyncedAt
    ? `上次同步 ${formatDateTime(lastSyncedAt)}`
    : '尚未完成首次同步'
  if (syncing) return `后台同步中 · ${lastSyncedText}`
  return lastSyncedAt ? lastSyncedText : '等待首次同步'
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
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as XiaodituiPageSearch
  const activeTab = search.tab || 'activity'
  const salaryInitialKey = [
    search.activity_id,
    search.start_date,
    search.end_date,
    search.market_id,
  ].join(':')
  const [updateOpen, setUpdateOpen] = useState(false)
  const [statusIssueDialogOpen, setStatusIssueDialogOpen] = useState(false)
  const bindFormRef = useRef<FormApi<{ phone: string; password: string }> | null>(
    null,
  )
  const updateFormRef = useRef<FormApi<{ phone: string; password: string }> | null>(
    null,
  )
  const syncTriggeredRef = useRef(false)
  const wasSyncingRef = useRef(false)

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
  const statusIssueMessage = statusQuery.isError
    ? statusQuery.error instanceof Error
      ? statusQuery.error.message
      : '小地推状态校验失败'
    : status?.message || status?.last_error || '请重新登录'
  const hasStatusIssue =
    !statusQuery.isPending && (statusQuery.isError || (bound && !valid))
  const canRelogin = bound && !!status?.has_password
  const updatePanelOpen =
    updateOpen || (bound && !valid && !statusQuery.isPending)

  const overviewQuery = useQuery({
    queryKey: ['xiaoditui', 'overview'],
    queryFn: () => xiaoditangApi.getOverview(),
    enabled: bound,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const overview = overviewQuery.data?.data
  const overviewErrorMessage =
    overviewQuery.data && !overviewQuery.data.success
      ? overviewQuery.data.message
      : null

  const syncStatusQuery = useQuery({
    queryKey: ['xiaoditui', 'sync-status'],
    queryFn: () => xiaoditangApi.getSyncStatus(),
    enabled: bound,
    staleTime: 10_000,
    refetchInterval: (query) =>
      query.state.data?.data?.syncing ? 5000 : false,
    refetchOnWindowFocus: false,
  })
  const syncStatus = syncStatusQuery.data?.data
  const syncMutation = useMutation({
    mutationFn: () => xiaoditangApi.submitSync({ mode: 'incremental' }),
    onSuccess: () => {
      syncStatusQuery.refetch()
    },
  })

  // 自动重登提示（一次性）
  useEffect(() => {
    if (autoReloggedJustNow) {
      toast.info({
        content: '小地推登录已自动续期：原 token 失效，已用保存的密码重登',
        duration: 4,
      })
    }
  }, [autoReloggedJustNow])

  useEffect(() => {
    setStatusIssueDialogOpen(hasStatusIssue)
  }, [hasStatusIssue])

  useEffect(() => {
    if (!valid) {
      syncTriggeredRef.current = false
      return
    }
    if (syncTriggeredRef.current) return
    syncTriggeredRef.current = true
    syncMutation.mutate()
  }, [syncMutation, valid])

  useEffect(() => {
    const syncing = !!syncStatus?.syncing
    if (wasSyncingRef.current && !syncing) {
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'overview'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'markets'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'lead-details'] })
      queryClient.invalidateQueries({ queryKey: ['xiaoditui', 'salary-report'] })
    }
    wasSyncingRef.current = syncing
  }, [queryClient, syncStatus?.syncing])

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
      setStatusIssueDialogOpen(false)
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
      setStatusIssueDialogOpen(false)
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

  const handleOpenUpdatePanel = () => {
    setStatusIssueDialogOpen(false)
    setUpdateOpen(true)
  }

  const handleAccountTabChange = (key: string) => {
    const nextTab = isAccountDataTabKey(key) ? key : 'activity'
    void navigate({
      to: '/crm/xiaoditui',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        tab: nextTab,
      }),
      replace: true,
    })
  }

  const handleOpenSalaryTab = (params: XiaodituiSalaryWorkspaceOpenParams) => {
    void navigate({
      to: '/crm/xiaoditui',
      search: {
        tab: 'salary',
        activity_id: params.activityId,
        start_date: params.startDate,
        end_date: params.endDate,
        market_id: params.marketId,
      },
    })
  }

  const lastCheckRel = useMemo(
    () => relativeTime(status?.last_check_at),
    [status?.last_check_at],
  )

  // ---------- Header ----------
  const Header = (
    <div className='flex items-center justify-between gap-3'>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
        <Title heading={4} style={{ margin: 0, lineHeight: '28px', whiteSpace: 'nowrap' }}>
          小地推
        </Title>
        <Text type='tertiary' size='small' ellipsis={{ showTooltip: true }}>
          深互动地推数据收集工具
        </Text>
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

  const StatusIssueDialog = hasStatusIssue ? (
    <Modal
      visible={statusIssueDialogOpen}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IconAlertTriangle style={{ color: 'var(--semi-color-danger)' }} />
          <span>小地推账号状态异常</span>
        </span>
      }
      width={640}
      closable={false}
      maskClosable={false}
      closeOnEsc={false}
      footer={
        <div style={getStatusIssueDialogFooterStyle(canRelogin)}>
          <Button
            theme='light'
            icon={<IconExternalOpen />}
            style={statusIssueDialogFooterButtonStyle}
            onClick={() => window.open(XIADITUI_LOGIN_URL, '_blank')}
          >
            打开小地推后台
          </Button>
          <Button
            icon={<IconRefresh />}
            loading={statusQuery.isFetching}
            style={statusIssueDialogFooterButtonStyle}
            onClick={() => statusQuery.refetch()}
          >
            重新检测
          </Button>
          {canRelogin ? (
            <Button
              theme='solid'
              type='primary'
              icon={<IconRefresh />}
              loading={reloginMutation.isPending}
              style={statusIssueDialogFooterButtonStyle}
              onClick={() => reloginMutation.mutate()}
            >
              重新登录
            </Button>
          ) : null}
          <Button
            theme={canRelogin ? 'light' : 'solid'}
            type='primary'
            icon={<IconEdit />}
            style={statusIssueDialogFooterButtonStyle}
            onClick={handleOpenUpdatePanel}
          >
            更新账号密码
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Banner
          fullMode={false}
          type='danger'
          icon={<IconAlertTriangle />}
          description={
            <span>
              小地推登录状态不可用：
              <Text type='danger' strong>
                {statusIssueMessage}
              </Text>
            </span>
          }
        />
        <Paragraph type='tertiary' style={{ margin: 0 }}>
          小地推登录异常时，今日统计、活动列表和导入入口都不能可靠使用，请先恢复登录态。
        </Paragraph>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '88px minmax(0, 1fr)',
            rowGap: 8,
            columnGap: 12,
            fontSize: 13,
          }}
        >
          <Text type='tertiary'>绑定账号</Text>
          <Text>{status?.phone || '—'}</Text>
          <Text type='tertiary'>最近登录</Text>
          <Text>{formatDateTime(status?.last_login)}</Text>
          <Text type='tertiary'>最近校验</Text>
          <Text>{formatDateTime(status?.last_check_at)}</Text>
        </div>
      </div>
    </Modal>
  ) : null

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

  // ---------- 状态校验接口异常 ----------
  if (statusQuery.isError) {
    return (
      <div className={pageClassName}>
        {Header}
        {StatusIssueDialog}
        <Banner
          fullMode={false}
          type='danger'
          icon={<IconAlertTriangle />}
          description={
            <span>
              小地推状态校验失败：
              <Text type='danger' strong>
                {statusIssueMessage}
              </Text>
            </span>
          }
        />
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

  const syncStatusContent =
    syncStatus ? (
      <div style={syncStatusInlineStyle}>
        <Text
          type={syncStatus.last_error ? 'warning' : 'tertiary'}
          size='small'
          ellipsis={{ showTooltip: true }}
          style={syncStatusInlineTextStyle}
        >
          名单数据：{formatSyncStatusText(syncStatus.syncing, syncStatus.last_synced_at)}
          {syncStatus.last_error ? ` · ${syncStatus.last_error}` : ''}
        </Text>
        <Button
          theme='borderless'
          type='tertiary'
          icon={<IconRefresh />}
          loading={syncMutation.isPending || syncStatusQuery.isFetching}
          disabled={syncMutation.isPending || syncStatusQuery.isFetching || syncStatus.syncing}
          onClick={() => syncMutation.mutate()}
        >
          {syncStatus.syncing ? '同步中' : '同步'}
        </Button>
      </div>
    ) : null

  // ---------- 已绑定 ----------
  return (
    <div className={pageClassName}>
      {StatusIssueDialog}

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

      <AccountOverviewCard
        status={status}
        valid={valid}
        lastCheckRel={lastCheckRel}
        overview={overview}
        overviewErrorMessage={overviewErrorMessage}
        refreshing={statusQuery.isFetching || overviewQuery.isFetching}
        reloginLoading={reloginMutation.isPending}
        syncStatusContent={syncStatusContent}
        activeTab={activeTab}
        onTabChange={handleAccountTabChange}
        activityContent={
          <TodayStatsBlock
            enabled={bound}
            embedded
            overviewRefreshing={overviewQuery.isFetching}
            onRefreshOverview={() => overviewQuery.refetch()}
          />
        }
        leadDetailsContent={<XiaodituiLeadDetailsContent embedded enabled={bound} />}
        parttimeContent={
          <XiaodituiParttimeTab
            enabled={bound}
            onOpenSalaryTab={handleOpenSalaryTab}
          />
        }
        salaryContent={
          <XiaodituiSalaryWorkspace
            key={salaryInitialKey}
            enabled={bound}
            mode='full'
            initialActivityId={search.activity_id}
            initialStartDate={search.start_date}
            initialEndDate={search.end_date}
            initialMarketId={search.market_id}
          />
        }
        collectionCalendarContent={<XiaodituiCollectionCalendarTab enabled={bound} />}
        watermarkCameraContent={<XiaodituiWatermarkCameraTab enabled={bound && valid} />}
        onRefresh={() => {
          statusQuery.refetch()
          if (bound) overviewQuery.refetch()
        }}
        onRelogin={() => reloginMutation.mutate()}
        onOpenUpdate={() => setUpdateOpen(true)}
        onUnbind={handleUnbindClick}
      />

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

function AccountOverviewCard({
  status,
  valid,
  lastCheckRel,
  overview,
  overviewErrorMessage,
  refreshing,
  reloginLoading,
  syncStatusContent,
  activeTab,
  onTabChange,
  activityContent,
  leadDetailsContent,
  parttimeContent,
  salaryContent,
  collectionCalendarContent,
  watermarkCameraContent,
  onRefresh,
  onRelogin,
  onOpenUpdate,
  onUnbind,
}: {
  status?: XiaoditangStatusView
  valid: boolean
  lastCheckRel: string | null
  overview?: XiaoditangOverviewStats
  overviewErrorMessage?: string | null
  refreshing: boolean
  reloginLoading: boolean
  syncStatusContent?: ReactNode
  activeTab: AccountDataTabKey
  onTabChange: (key: string) => void
  activityContent: ReactNode
  leadDetailsContent: ReactNode
  parttimeContent: ReactNode
  salaryContent: ReactNode
  collectionCalendarContent: ReactNode
  watermarkCameraContent: ReactNode
  onRefresh: () => void
  onRelogin: () => void
  onOpenUpdate: () => void
  onUnbind: () => void
}) {
  return (
    <Card
      bordered
      bodyStyle={accountOverviewCardBodyStyle}
      style={{
        ...accountOverviewCardStyle,
        borderColor: valid
          ? 'var(--semi-color-border)'
          : 'var(--semi-color-danger-light-active)',
      }}
    >
      <div style={accountDataTabsAreaStyle}>
        <Tabs
          className='xiaoditui-account-data-tabs'
          type='button'
          activeKey={activeTab}
          onChange={onTabChange}
          style={accountDataTabsStyle}
          tabBarStyle={accountDataTabBarStyle}
          tabBarExtraContent={syncStatusContent}
          contentStyle={accountDataTabContentStyle}
          lazyRender
        >
          <TabPane tab='活动数据' itemKey='activity'>
            {activityContent}
          </TabPane>
          <TabPane tab='名单明细' itemKey='lead-details'>
            {leadDetailsContent}
          </TabPane>
          <TabPane tab='兼职' itemKey='parttime'>
            {parttimeContent}
          </TabPane>
          <TabPane tab='兼职工资' itemKey='salary'>
            {salaryContent}
          </TabPane>
          <TabPane tab='采单日历' itemKey='collection-calendar'>
            {collectionCalendarContent}
          </TabPane>
          <TabPane tab='水印打卡' itemKey='watermark-camera'>
            {watermarkCameraContent}
          </TabPane>
          <TabPane tab='总数据' itemKey='total'>
            <div style={totalDataContentStyle}>
              <div
                style={{
                  ...accountStatusRowStyle,
                  background: valid
                    ? 'linear-gradient(90deg, rgba(248, 250, 252, 0.94), rgba(255, 255, 255, 1))'
                    : 'linear-gradient(90deg, rgba(254, 242, 242, 0.9), rgba(255, 255, 255, 1))',
                }}
              >
                <div style={accountIdentityStyle}>
                  <span
                    style={{
                      ...accountStatusDotStyle,
                      backgroundColor: valid ? '#16a34a' : '#dc2626',
                      boxShadow: valid
                        ? '0 0 0 4px rgba(22, 163, 74, 0.12)'
                        : '0 0 0 4px rgba(220, 38, 38, 0.12)',
                    }}
                  />
                  <div style={accountTextStackStyle}>
                    <div style={accountTitleRowStyle}>
                      <Text
                        strong
                        ellipsis={{ showTooltip: true }}
                        style={accountPhoneStyle}
                      >
                        {status?.phone}
                      </Text>
                      <Tag
                        color={valid ? 'green' : 'red'}
                        size='small'
                        style={{ borderRadius: 999, flexShrink: 0 }}
                      >
                        {valid ? '正常' : '需处理'}
                      </Tag>
                    </div>
                    <Tooltip
                      content={`最近登录：${formatDateTime(status?.last_login)}；最近校验：${formatDateTime(status?.last_check_at)}`}
                    >
                      <span style={accountMetaStyle}>
                        <IconClock
                          size='small'
                          style={{
                            color: 'var(--semi-color-text-2)',
                            flexShrink: 0,
                          }}
                        />
                        <Text
                          type={valid ? 'tertiary' : 'danger'}
                          size='small'
                          ellipsis={{ showTooltip: true }}
                          style={{ maxWidth: 520 }}
                        >
                          {valid
                            ? `已校验 ${lastCheckRel || '—'}`
                            : status?.message ||
                              status?.last_error ||
                              '登录状态不可用'}
                        </Text>
                      </span>
                    </Tooltip>
                  </div>
                </div>

                <div style={accountActionsStyle}>
                  <Button
                    theme='light'
                    icon={<IconExternalOpen />}
                    onClick={() => window.open(XIADITUI_LOGIN_URL, '_blank')}
                    style={{ borderRadius: 6 }}
                  >
                    打开后台
                  </Button>
                  <Tooltip content='重新校验登录状态'>
                    <Button
                      theme='borderless'
                      type='tertiary'
                      icon={<IconRefresh />}
                      loading={refreshing}
                      onClick={onRefresh}
                      aria-label='重新校验登录状态'
                      style={{ borderRadius: 6 }}
                    />
                  </Tooltip>
                  <Dropdown
                    trigger='click'
                    position='bottomRight'
                    render={
                      <Dropdown.Menu>
                        <Dropdown.Item
                          icon={<IconRefresh />}
                          disabled={reloginLoading}
                          onClick={onRelogin}
                        >
                          重新登录
                        </Dropdown.Item>
                        <Dropdown.Item icon={<IconEdit />} onClick={onOpenUpdate}>
                          更新账号密码
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item
                          icon={<IconExit />}
                          type='danger'
                          onClick={onUnbind}
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
                      style={{ borderRadius: 6 }}
                    />
                  </Dropdown>
                </div>
              </div>

              {overviewErrorMessage ? (
                <Banner
                  fullMode={false}
                  type='warning'
                  icon={<IconInfoCircle />}
                  description={`概览暂不可用：${overviewErrorMessage}`}
                />
              ) : (
                <div
                  className='xiaoditui-overview-strip'
                  style={accountOverviewStripStyle}
                >
                  <AccountOverviewMetric
                    icon={<IconActivity />}
                    label='总名单数'
                    value={overview ? overview.leads_total.toLocaleString() : '—'}
                    accent='#0f766e'
                  />
                  <AccountOverviewMetric
                    icon={<IconActivity />}
                    label='今日新增'
                    value={overview ? overview.leads_today.toLocaleString() : '—'}
                    accent='#2563eb'
                  />
                  <AccountOverviewMetric
                    icon={<IconUserGroup />}
                    label='推广员'
                    value={overview ? overview.markets_total.toLocaleString() : '—'}
                    accent='#16a34a'
                  />
                  <AccountOverviewMetric
                    icon={<IconBarChartVStroked />}
                    label='活动数'
                    value={overview ? overview.activities_total.toLocaleString() : '—'}
                    accent='#475569'
                  />
                </div>
              )}
            </div>
          </TabPane>
        </Tabs>
      </div>
    </Card>
  )
}

function AccountOverviewMetric({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div style={accountOverviewMetricStyle}>
      <span style={{ ...accountOverviewIconStyle, color: accent }}>{icon}</span>
      <Text type='tertiary' style={accountOverviewLabelStyle}>
        {label}
      </Text>
      <Text strong style={{ ...accountOverviewValueStyle, color: accent }}>
        {value}
      </Text>
    </div>
  )
}

const accountOverviewCardStyle: CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  flex: '1 1 0',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const syncStatusInlineStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  minWidth: 0,
  maxWidth: 520,
  flexShrink: 0,
}

const syncStatusInlineTextStyle: CSSProperties = {
  maxWidth: 380,
}

const accountOverviewCardBodyStyle: CSSProperties = {
  padding: 0,
  flex: '1 1 0',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
}

function getStatusIssueDialogFooterStyle(canRelogin: boolean): CSSProperties {
  return {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: canRelogin
      ? 'repeat(4, minmax(0, 1fr))'
      : 'repeat(3, minmax(0, 1fr))',
    gap: 8,
  }
}

const statusIssueDialogFooterButtonStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  justifyContent: 'center',
  whiteSpace: 'nowrap',
}

const accountStatusRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  minHeight: 56,
  padding: '10px 14px',
  flexWrap: 'wrap',
}

const accountIdentityStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 0,
  flex: '1 1 360px',
}

const accountStatusDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
}

const accountTextStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
}

const accountTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
}

const accountPhoneStyle: CSSProperties = {
  fontSize: 18,
  lineHeight: '22px',
  letterSpacing: 0,
  color: 'var(--semi-color-text-0)',
}

const accountMetaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
}

const accountActionsStyle: CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
}

const accountDataTabsAreaStyle: CSSProperties = {
  padding: '8px 12px 12px',
  background: '#fff',
  flex: '1 1 0',
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
}

const accountDataTabsStyle: CSSProperties = {
  flex: '1 1 0',
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
}

const accountDataTabBarStyle: CSSProperties = {
  margin: 0,
}

const accountDataTabContentStyle: CSSProperties = {
  paddingTop: 8,
  flex: '1 1 0',
  minHeight: 0,
  minWidth: 0,
}

const totalDataContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const accountOverviewStripStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  alignItems: 'center',
  gap: 0,
  minHeight: 48,
  border: '1px solid #dfe6ee',
  borderRadius: 12,
  background: '#fff',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  overflow: 'hidden',
}

const accountOverviewMetricStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  minHeight: 48,
  minWidth: 0,
  padding: '0 16px',
  whiteSpace: 'nowrap',
}

const accountOverviewIconStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  lineHeight: 1,
}

const accountOverviewLabelStyle: CSSProperties = {
  fontSize: 15,
  lineHeight: '20px',
}

const accountOverviewValueStyle: CSSProperties = {
  fontSize: 20,
  lineHeight: '24px',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 0,
}
