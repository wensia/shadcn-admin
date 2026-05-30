/**
 * DISC性格测试管理页面 - Semi Design 版本
 * 遵循 DataTableLayout + SemiDataTable 标准布局
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  Tag,
  Button,
  Input,
  Select,
  Modal,
  Typography,
  Skeleton,
  Dropdown,
  Tabs,
  TabPane,
  Popconfirm,
  Popover,
  InputNumber,
  Table,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  IconSearch,
  IconCopy,
  IconChevronDown,
  IconMore,
  IconEdit,
  IconEyeOpened,
  IconDelete,
  IconPlus,
  IconRefresh,
} from '@douyinfe/semi-icons'
import { QrCode, Brain, Clock, AlertCircle, Loader2, Sparkles, X, Link2, Users, Download } from 'lucide-react'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { DataTableLayout } from '@/components/semi/data-table-layout'
import { SemiDataTable } from '@/components/semi/semi-data-table'
import { isSkeletonRow, SemiSkeletonCell } from '@/lib/table-utils'
import { formatTime } from '@/lib/utils/time'
import {
  getTempDiscRecords,
  getTempDiscRecordDetail,
  updateTempDiscRecord,
  triggerDiscAIAnalysis,
  getDiscTestLinks,
  createDiscTestLink,
  deleteDiscTestLink,
  getDiscChannels,
} from '@/features/disc/api'
import {
  DISC_TYPE_CONFIG,
  type TempDISCRecordListItem,
  type TempDISCRecordDetail,
  type DISCDimension,
  type DiscTestLinkItem,
} from '@/features/disc/types'
import { DiscDetailDrawer } from '@/features/disc/components/disc-detail-drawer'
import { DiscAccessGrantModal } from '@/features/disc/components/disc-access-grant-modal'
import { cn, copyToClipboard } from '@/lib/utils'
import { md5 } from '@/lib/utils/md5'
import { useAuthStore } from '@/stores/auth-store'
import type { SemiTagColor } from '@/lib/semi-types'

const { Text } = Typography

/** 固定测试 URL（有渠道时只用 channel MD5，无渠道时用 ref MD5） */
function getFixedTestUrl(username: string, channel?: string): string {
  if (channel) {
    return `${window.location.origin}/disc-test?channel=${encodeURIComponent(md5(channel))}`
  }
  return `${window.location.origin}/disc-test?ref=${encodeURIComponent(md5(username))}`
}

/** 公开查看结果 URL（人事无需登录即可查看该渠道的测试结果，channel 使用 MD5 加密） */
function getResultsUrl(_username: string, channel?: string): string {
  if (!channel) return ''
  return `${window.location.origin}/disc-results?channel=${encodeURIComponent(md5(channel))}`
}

// DISC 类型 Tag 组件
function DiscTypeTag({ type }: { type?: string }) {
  if (!type) return <Text type="tertiary">-</Text>
  const dim = type as DISCDimension
  const config = DISC_TYPE_CONFIG[dim]
  if (!config) return <Tag>{type}</Tag>
  return (
    <Tag
      style={{ backgroundColor: config.bgColor, color: config.color, borderColor: config.color }}
    >
      {dim} - {config.label}
    </Tag>
  )
}

const CONFIDENCE_LEVEL_META: Record<string, { label: string; color: SemiTagColor }> = {
  high: { label: '高置信', color: 'green' },
  medium: { label: '中置信', color: 'blue' },
  low: { label: '低置信', color: 'grey' },
}

const AI_STATUS_META: Record<string, { label: string; icon: typeof Brain; className: string }> = {
  completed: { label: '已分析', icon: Brain, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  processing: { label: '分析中', icon: Loader2, className: 'text-blue-600 bg-blue-50 border-blue-200' },
  pending: { label: '待分析', icon: Clock, className: 'text-amber-600 bg-amber-50 border-amber-200' },
  failed: { label: '分析失败', icon: AlertCircle, className: 'text-red-600 bg-red-50 border-red-200' },
}

function AIStatusTag({ status }: { status?: string | null }) {
  if (!status) return <Text type="tertiary" size="small">-</Text>
  const meta = AI_STATUS_META[status]
  if (!meta) return <Tag>{status}</Tag>
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-normal', meta.className)}>
      <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {meta.label}
    </span>
  )
}


// 二维码悬浮卡片：hover 展示二维码，可复制链接 / 下载二维码图片
function QrHoverPopover({
  url,
  children,
}: {
  url: string
  children: React.ReactNode
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const generateQr = useCallback(() => {
    if (!url) return
    QRCode.toDataURL(url, {
      width: 180,
      margin: 2,
      color: { dark: '#141413', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => {})
  }, [url])

  const handleCopy = async () => {
    const ok = await copyToClipboard(url)
    toast[ok ? 'success' : 'error'](ok ? '链接已复制' : '复制失败')
  }

  const handleDownload = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = 'qrcode.png'
    a.click()
  }

  return (
    <Popover
      trigger="hover"
      position="left"
      showArrow
      getPopupContainer={() => document.body}
      onVisibleChange={(visible) => { if (visible) generateQr() }}
      content={
        <div className="flex flex-col items-center gap-2 p-2" style={{ width: 220 }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" width={160} height={160} className="rounded border bg-white" />
          ) : (
            <div className="flex items-center justify-center" style={{ width: 160, height: 160 }}>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <p className="w-full break-all text-center text-xs font-mono leading-relaxed text-foreground/60" style={{ maxHeight: 48, overflow: 'hidden' }}>
            {url}
          </p>
          <div className="flex w-full gap-2">
            <Button theme="outline" icon={<IconCopy />} onClick={handleCopy} style={{ flex: 1 }}>
              复制链接
            </Button>
            <Button theme="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={handleDownload} style={{ flex: 1 }}>
              下载
            </Button>
          </div>
        </div>
      }
    >
      <span style={{ display: 'inline-flex' }}>{children}</span>
    </Popover>
  )
}

// 渠道数据行类型
interface ChannelRow {
  key: string
  name: string
  url: string
  resultsUrl: string
  /** 'default' = 默认行, 'source' = 来源渠道(后端), 'custom' = 用户自建 */
  type: 'default' | 'source' | 'custom'
  disabled?: boolean
}

// 固定测试链接弹窗（宽 Dialog + 数据表展示渠道）
function FixedLinkModal({
  visible,
  onClose,
  username,
  sourceChannels,
}: {
  visible: boolean
  onClose: () => void
  username: string
  sourceChannels: string[]
}) {
  const [newChannel, setNewChannel] = useState('')
  const [channels, setChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('disc-channels')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  // 被禁用的来源渠道
  const [disabledSourceChannels, setDisabledSourceChannels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('disc-disabled-source-channels')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // 首次打开弹窗时，将 localStorage 中的渠道同步到后端
  useEffect(() => {
    if (!visible || channels.length === 0) return
    const syncKey = 'disc-channels-synced'
    if (localStorage.getItem(syncKey)) return
    ;(async () => {
      try {
        const { apiClient } = await import('@/lib/api/client')
        for (const ch of channels) {
          await apiClient.post('/hr/disc-channels', { name: ch }).catch(() => {})
        }
        localStorage.setItem(syncKey, '1')
      } catch {}
    })()
  }, [visible, channels])

  // 保存渠道列表到 localStorage
  const saveChannels = (list: string[]) => {
    setChannels(list)
    localStorage.setItem('disc-channels', JSON.stringify(list))
  }

  const saveDisabledSourceChannels = (list: string[]) => {
    setDisabledSourceChannels(list)
    localStorage.setItem('disc-disabled-source-channels', JSON.stringify(list))
  }

  const toggleSourceChannel = (ch: string) => {
    const isDisabled = disabledSourceChannels.includes(ch)
    saveDisabledSourceChannels(
      isDisabled
        ? disabledSourceChannels.filter((c) => c !== ch)
        : [...disabledSourceChannels, ch]
    )
  }

  const handleAddChannel = async () => {
    const ch = newChannel.trim()
    if (!ch) return
    if (channels.includes(ch) || sourceChannels.includes(ch)) {
      toast.warning('该渠道已存在')
      return
    }
    // 同步到后端 disc_channels 表（确保结果页能通过 MD5 反查渠道名）
    try {
      const { apiClient } = await import('@/lib/api/client')
      await apiClient.post('/hr/disc-channels', { name: ch })
    } catch {
      // 后端同步失败不阻塞前端操作
    }
    saveChannels([...channels, ch])
    setNewChannel('')
  }

  const handleCopyUrl = async (url: string) => {
    const ok = await copyToClipboard(url)
    toast[ok ? 'success' : 'error'](ok ? '链接已复制' : '复制失败')
  }

  // 构建表格数据：默认链接 + 来源渠道 + 自建渠道
  const tableData: ChannelRow[] = [
    { key: '__default__', name: '默认（无渠道）', url: getFixedTestUrl(username), resultsUrl: getResultsUrl(username), type: 'default' },
    ...sourceChannels.map((ch) => ({
      key: `__source__${ch}`,
      name: ch,
      url: getFixedTestUrl(username, ch),
      resultsUrl: getResultsUrl(username, ch),
      type: 'source' as const,
      disabled: disabledSourceChannels.includes(ch),
    })),
    ...channels
      .filter((ch) => !sourceChannels.includes(ch))
      .map((ch) => ({
        key: ch,
        name: ch,
        url: getFixedTestUrl(username, ch),
        resultsUrl: getResultsUrl(username, ch),
        type: 'custom' as const,
      })),
  ]

  const columns: ColumnProps<ChannelRow>[] = [
    {
      title: '渠道名称',
      dataIndex: 'name',
      width: 200,
      render: (_: string, record: ChannelRow) => {
        if (record.type === 'default') {
          return <Text type="tertiary" style={{ fontSize: 13 }}>{record.name}</Text>
        }
        return (
          <div className="flex items-center gap-2">
            <Text strong style={{ fontSize: 13, opacity: record.disabled ? 0.4 : 1 }}>{record.name}</Text>
            {record.type === 'source' && (
              <Tag size="small" color="blue" style={{ fontSize: 11 }}>来源</Tag>
            )}
            {record.disabled && (
              <Tag size="small" color="grey" style={{ fontSize: 11 }}>已禁用</Tag>
            )}
          </div>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'key',
      width: 200,
      align: 'center' as const,
      render: (_: string, record: ChannelRow) => (
        <div className="flex items-center justify-center gap-1">
          {!record.disabled && (
            <>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<IconCopy />}
                onClick={() => handleCopyUrl(record.url)}
                aria-label="复制测试链接"
              />
              {record.resultsUrl && (
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<IconEyeOpened />}
                  onClick={() => handleCopyUrl(record.resultsUrl)}
                  aria-label="复制查看结果链接"
                />
              )}
              <QrHoverPopover url={record.url}>
                <span style={{ display: 'inline-flex' }}>
                  <Button
                    theme="borderless"
                    type="tertiary"
                    icon={<QrCode className="h-3.5 w-3.5" />}
                    aria-label="查看二维码"
                  />
                </span>
              </QrHoverPopover>
            </>
          )}
          {record.type === 'source' && (
            <Button
              theme="borderless"
              type={record.disabled ? 'primary' : 'warning'}
              onClick={() => toggleSourceChannel(record.name)}
              style={{ fontSize: 12 }}
            >
              {record.disabled ? '启用' : '禁用'}
            </Button>
          )}
          {record.type === 'custom' && (
            <Popconfirm
              title={`删除渠道「${record.name}」？`}
              onConfirm={() => saveChannels(channels.filter((c) => c !== record.name))}
            >
              <span style={{ display: 'inline-flex' }}>
                <Button
                  theme="borderless"
                  type="danger"
                  icon={<IconDelete />}
                  aria-label="删除渠道"
                />
              </span>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <Modal
        title={
          <span className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            DISC 测试链接
          </span>
        }
        visible={visible}
        onCancel={onClose}
        width={780}
        bodyStyle={{ padding: 0 }}
        closeOnEsc
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px' }}>
            <Button onClick={onClose}>关闭</Button>
          </div>
        }
      >
        <div style={{ padding: 16 }}>
          <Text type="tertiary" style={{ fontSize: 13, marginBottom: 12, display: 'block' }}>
            每个渠道生成独立链接，测试记录中会记录来源渠道，方便按渠道筛选统计。
          </Text>

          {/* 添加新渠道 */}
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Input
              value={newChannel}
              onChange={(v) => setNewChannel(v)}
              placeholder="输入渠道名称，如：北京朝阳校区、天津南开区"
              onEnterPress={handleAddChannel}
              style={{ width: 320 }}
            />
            <Button
              icon={<IconPlus />}
              onClick={handleAddChannel}
              disabled={!newChannel.trim()}
            >
              添加渠道
            </Button>
          </div>

          {/* 渠道表格 */}
          <Table<ChannelRow>
            columns={columns}
            dataSource={tableData}
            rowKey="key"
            pagination={false}
            size="small"
            empty={
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Text type="tertiary">暂无渠道</Text>
              </div>
            }
          />
        </div>
      </Modal>

    </>
  )
}

/** 编辑姓名/手机号弹窗 */
function EditRecordModal({
  visible,
  onClose,
  record,
  onSuccess,
}: {
  visible: boolean
  onClose: () => void
  record: TempDISCRecordListItem | null
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible && record) {
      setName(record.name || '')
      setPhone(record.phone || '')
    }
  }, [visible, record])

  const handleSave = async () => {
    if (!record) return
    if (!name.trim()) {
      toast.error('姓名不能为空')
      return
    }
    setSaving(true)
    try {
      const res = await updateTempDiscRecord(record.id, {
        name: name.trim(),
        phone: phone.trim(),
      })
      if (res.success) {
        toast.success('修改成功')
        onSuccess()
        onClose()
      } else {
        toast.error(res.message || '修改失败')
      }
    } catch (error) {
      showApiErrorToast(error, '修改失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="修改信息"
      visible={visible}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      width={400}
      closeOnEsc
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">姓名</label>
          <Input
            value={name}
            onChange={(v) => setName(v)}
            placeholder="请输入姓名"
            showClear
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">手机号</label>
          <Input
            value={phone}
            onChange={(v) => setPhone(v)}
            placeholder="请输入手机号"
            showClear
          />
        </div>
      </div>
    </Modal>
  )
}

/** 移动端记录卡片 */
function MobileRecordCard({
  record,
  onViewDetail,
}: {
  record: TempDISCRecordListItem
  onViewDetail: (id: string) => void
}) {
  const confidenceMeta = record.confidence_level
    ? CONFIDENCE_LEVEL_META[record.confidence_level as keyof typeof CONFIDENCE_LEVEL_META]
    : null

  return (
    <div
      className="rounded-lg border bg-card p-4 space-y-2.5 active:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onViewDetail(record.id)}
    >
      {/* 第1行：姓名 + 主要类型 */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{record.name}</span>
        <DiscTypeTag type={record.primary_type} />
      </div>

      {/* 第2行：手机号 + 置信度 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{record.phone || '未填写手机号'}</span>
        {confidenceMeta && (
          <div className="flex items-center gap-1">
            <Tag size="small" color={confidenceMeta.color}>
              {confidenceMeta.label}
            </Tag>
            {typeof record.confidence_score === 'number' && (
              <span className="tabular-nums">{record.confidence_score}</span>
            )}
          </div>
        )}
      </div>

      {/* 第3行：四维分数 */}
      <div className="flex items-center gap-3 text-xs">
        {(['D', 'I', 'S', 'C'] as const).map((dim) => {
          const scoreKey = `${dim.toLowerCase()}_score` as keyof TempDISCRecordListItem
          const score = record[scoreKey]
          const config = DISC_TYPE_CONFIG[dim]
          return (
            <div key={dim} className="flex items-center gap-1">
              <span className="font-semibold" style={{ color: config.color }}>{dim}</span>
              <span className="tabular-nums text-muted-foreground">{score ?? '-'}</span>
            </div>
          )
        })}
      </div>

      {/* 第4行：AI状态 + 首推岗位 */}
      <div className="flex items-center justify-between text-xs">
        <AIStatusTag status={record.ai_analysis_status} />
        {record.best_match_job ? (
          <span className="text-muted-foreground">首推: <span className="font-medium text-foreground">{record.best_match_job}</span></span>
        ) : record.has_mixed_type ? (
          <Tag size="small">{record.mixed_type_code || '复合型'}</Tag>
        ) : null}
      </div>

      {/* 第5行：时间 */}
      <div className="text-xs text-muted-foreground">
        {formatTime(record.submitted_at)}
      </div>
    </div>
  )
}

// Select 选项定义（模块级常量，避免每次渲染重建）
const confidenceOptions = [
  { value: 'all', label: '全部置信度' },
  { value: 'high', label: '高置信' },
  { value: 'medium', label: '中置信' },
  { value: 'low', label: '低置信' },
]

const mixedTypeOptions = [
  { value: 'all', label: '全部倾向' },
  { value: 'yes', label: '复合型' },
  { value: 'no', label: '单一型' },
]

const aiStatusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'completed', label: '已分析' },
  { value: 'processing', label: '分析中' },
  { value: 'pending', label: '待分析' },
  { value: 'failed', label: '分析失败' },
  { value: 'none', label: '未触发' },
]

// ============================================================================
// 创建链接弹窗
// ============================================================================
function CreateLinkModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [expiresDays, setExpiresDays] = useState<number>(7)
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (visible) {
      setName('')
      setPhone('')
      setExpiresDays(7)
      setNotes('')
    }
  }, [visible])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('请输入候选人姓名')
      return
    }
    setCreating(true)
    try {
      const res = await createDiscTestLink({
        name: name.trim(),
        phone: phone.trim() || undefined,
        expires_days: expiresDays,
        notes: notes.trim() || undefined,
      })
      if (res.success) {
        toast.success('测试链接创建成功')
        onSuccess()
        onClose()
      } else {
        toast.error(res.message || '创建失败')
      }
    } catch (error) {
      showApiErrorToast(error, '创建失败')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          创建专属测试链接
        </span>
      }
      visible={visible}
      onCancel={onClose}
      onOk={handleCreate}
      okText="创建"
      cancelText="取消"
      confirmLoading={creating}
      width={440}
      closeOnEsc
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            候选人姓名 <span className="text-red-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(v) => setName(v)}
            placeholder="请输入候选人姓名"
            showClear
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">手机号（选填）</label>
          <Input
            value={phone}
            onChange={(v) => setPhone(v)}
            placeholder="可预填候选人手机号"
            showClear
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">有效天数</label>
          <InputNumber
            value={expiresDays}
            onChange={(v) => setExpiresDays(typeof v === 'number' ? v : 7)}
            min={1}
            max={90}
            suffix="天"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">备注（选填）</label>
          <Input
            value={notes}
            onChange={(v) => setNotes(v)}
            placeholder="备注信息"
            showClear
          />
        </div>
      </div>
    </Modal>
  )
}

// ============================================================================
// 测试链接管理 Tab
// ============================================================================

const LINK_STATUS_META: Record<string, { label: string; color: SemiTagColor }> = {
  PENDING: { label: '待填写', color: 'blue' },
  COMPLETED: { label: '已完成', color: 'green' },
  EXPIRED: { label: '已过期', color: 'grey' },
}

function LinksTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchName, setSearchName] = useState('')
  const [createModalVisible, setCreateModalVisible] = useState(false)

  const { data: linksData, isLoading } = useQuery({
    queryKey: ['disc-test-links', page, pageSize, statusFilter, searchName],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchName) params.name = searchName
      const res = await getDiscTestLinks(params as Parameters<typeof getDiscTestLinks>[0])
      return res.data
    },
    refetchInterval: 30000,
  })

  const links = useMemo<DiscTestLinkItem[]>(() => linksData?.items ?? [], [linksData?.items])
  const total = linksData?.total ?? 0


  const getFullUrl = (testUrl: string) =>
    testUrl.startsWith('http') ? testUrl : `${window.location.origin}${testUrl}`

  const handleCopyLink = async (testUrl: string) => {
    const ok = await copyToClipboard(getFullUrl(testUrl))
    if (ok) toast.success('链接已复制')
    else toast.error('复制失败')
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteDiscTestLink(id)
      if (res.success) {
        toast.success('链接已删除')
        queryClient.invalidateQueries({ queryKey: ['disc-test-links'] })
      } else {
        toast.error(res.message || '删除失败')
      }
    } catch (error) {
      showApiErrorToast(error, '删除失败')
    }
  }

  const columns: ColumnProps<DiscTestLinkItem>[] = useMemo(() => [
    {
      title: '候选人',
      dataIndex: 'name',
      width: 100,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <Text strong>{record.name}</Text>
      },
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 120,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return <Text>{record.phone || '-'}</Text>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        const meta = LINK_STATUS_META[record.status]
        return <Tag color={meta?.color || 'grey'}>{meta?.label || record.status}</Tag>
      },
    },
    {
      title: '创建者',
      dataIndex: 'created_by_name',
      width: 90,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={56} />
        return <Text>{record.created_by_name || '-'}</Text>
      },
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      width: 150,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return (
          <Text type="tertiary" style={{ fontSize: 13 }}>
            {record.expires_at ? formatTime(record.expires_at) : '-'}
          </Text>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 150,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return (
          <Text type="tertiary" style={{ fontSize: 13 }}>
            {formatTime(record.created_at)}
          </Text>
        )
      },
    },
    {
      title: '备注',
      dataIndex: 'notes',
      width: 120,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return <Text type="tertiary" ellipsis={{ showTooltip: true }}>{record.notes || '-'}</Text>
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 100,
      fixed: 'right' as const,
      render: (_: string, record: DiscTestLinkItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return (
          <div className="flex items-center gap-1">
            <Button
              theme="borderless"
              type="tertiary"
              icon={<IconCopy />}
              onClick={(e) => { e.stopPropagation(); handleCopyLink(record.test_url) }}
            />
            <QrHoverPopover url={getFullUrl(record.test_url)}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<QrCode className="h-3.5 w-3.5" />}
              />
            </QrHoverPopover>
            {record.status === 'PENDING' && (
              <Popconfirm
                title="确定删除此链接？"
                onConfirm={() => handleDelete(record.id)}
                position="left"
              >
                <Button
                  theme="borderless"
                  type="danger"
                  icon={<IconDelete />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            )}
          </div>
        )
      },
    },
  ], [])

  const linkStatusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'PENDING', label: '待填写' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'EXPIRED', label: '已过期' },
  ]

  return (
    <>
      <div className="flex flex-col" style={{ flex: 1, minHeight: 0 }}>
        {/* 工具栏 */}
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 10, padding: '10px 12px 0' }}>
          <Input
            prefix={<IconSearch />}
            placeholder="搜索候选人"
            value={searchName}
            onChange={(v) => setSearchName(v)}
            onEnterPress={() => setPage(1)}
            showClear
            style={{ width: 180 }}
          />
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v as string); setPage(1) }}
            optionList={linkStatusOptions}
            style={{ width: 140 }}
          />
          <div className="flex-1" />
          <Button
            theme="solid"
            type="primary"
            icon={<IconPlus />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建链接
          </Button>
        </div>

        {/* 表格 */}
        <div className="hidden sm:flex" style={{ flex: 1, minHeight: 0, flexDirection: 'column', padding: '0 12px' }}>
          <SemiDataTable<DiscTestLinkItem>
            columns={columns}
            data={links}
            total={total}
            page={page}
            pageSize={pageSize}
            isLoading={isLoading}
            scrollX={920}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
            emptyText="暂无测试链接"
          />
        </div>

        {/* 移动端卡片 */}
        <div className="flex-1 overflow-auto sm:hidden" style={{ padding: 12 }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2 mb-3">
                <Skeleton.Paragraph rows={2} style={{ width: '100%' }} />
              </div>
            ))
          ) : links.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              暂无测试链接
            </div>
          ) : (
            links.map((link) => (
              <div key={link.id} className="rounded-lg border bg-card p-4 space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{link.name}</span>
                  <Tag color={LINK_STATUS_META[link.status]?.color || 'grey'} size="small">
                    {LINK_STATUS_META[link.status]?.label || link.status}
                  </Tag>
                </div>
                <div className="text-xs text-muted-foreground">
                  {link.phone || '未填手机号'} · 创建者: {link.created_by_name || '-'}
                </div>
                <div className="text-xs text-muted-foreground">
                  过期: {link.expires_at ? formatTime(link.expires_at) : '-'}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button theme="outline" icon={<IconCopy />} onClick={() => handleCopyLink(link.test_url)}>
                    复制
                  </Button>
                  <QrHoverPopover url={getFullUrl(link.test_url)}>
                    <Button theme="outline" icon={<QrCode className="h-3 w-3" />}>
                      二维码
                    </Button>
                  </QrHoverPopover>
                  {link.status === 'PENDING' && (
                    <Popconfirm title="确定删除？" onConfirm={() => handleDelete(link.id)} position="top">
                      <Button theme="outline" type="danger" icon={<IconDelete />}>删除</Button>
                    </Popconfirm>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 创建链接弹窗 */}
      <CreateLinkModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['disc-test-links'] })}
      />

    </>
  )
}

type ReanalyzeGuard = {
  recordId: string
  previousAnalyzedAt?: string | null
  previousStatus?: string | null
  startedAt: number
}

const STALE_ANALYSIS_RESULT_GRACE_MS = 5 * 60 * 1000

export function DiscTestPage() {
  useDocumentTitle('DISC性格测试')
  const queryClient = useQueryClient()
  const username = useAuthStore((state) => state.user?.username ?? '')
  const [activeTab, setActiveTab] = useState<string>('records')

  // 搜索筛选状态
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all')
  const [mixedTypeFilter, setMixedTypeFilter] = useState<string>('all')
  const [aiStatusFilter, setAiStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 移动端筛选折叠
  const [filterOpen, setFilterOpen] = useState(false)
  // 固定链接二维码弹窗
  const [qrModalVisible, setQrModalVisible] = useState(false)
  // 授权访问弹窗
  const [grantModalVisible, setGrantModalVisible] = useState(false)

  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const reanalyzeGuardRef = useRef<ReanalyzeGuard | null>(null)

  // 编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TempDISCRecordListItem | null>(null)

  // 多选
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([])
  const [batchAnalyzing, setBatchAnalyzing] = useState(false)

  // 查询可用渠道列表
  const { data: availableChannels = [] } = useQuery({
    queryKey: ['disc-channels'],
    queryFn: async () => {
      const res = await getDiscChannels()
      return res.data ?? []
    },
    staleTime: 30 * 1000,
  })

  // 查询已完成记录
  const { data: recordsData, isLoading: loadingRecords } = useQuery({
    queryKey: ['disc-records', page, pageSize, searchName, searchPhone, confidenceFilter, mixedTypeFilter, aiStatusFilter, channelFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (searchName) params.name = searchName
      if (searchPhone) params.phone = searchPhone
      if (confidenceFilter !== 'all') params.confidence_level = confidenceFilter
      if (mixedTypeFilter !== 'all') params.has_mixed_type = mixedTypeFilter === 'yes'
      if (aiStatusFilter !== 'all') params.ai_analysis_status = aiStatusFilter
      if (channelFilter !== 'all') params.source_channel = channelFilter
      const res = await getTempDiscRecords(params as Parameters<typeof getTempDiscRecords>[0])
      return res.data
    },
    refetchInterval: (query) => {
      const items = query.state.data?.items
      if (items?.some((r) => r.ai_analysis_status === 'processing' || r.ai_analysis_status === 'pending')) {
        return 5000
      }
      return 30000
    },
  })

  // ⚠️ 必须 useMemo 稳定引用，否则 SemiDataTable 内部 useEffect 因引用变化导致无限循环
  const records = useMemo<TempDISCRecordListItem[]>(() => recordsData?.items ?? [], [recordsData?.items])
  const total = recordsData?.total ?? 0

  // 查询详情（AI 分析进行中时自动轮询）
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ['disc-record-detail', detailId],
    queryFn: async () => {
      const res = await getTempDiscRecordDetail(detailId!)
      return res.data
    },
    enabled: !!detailId && detailOpen,
    refetchInterval: (query) => {
      const aiStatus = query.state.data?.result?.aiAnalysis?.status
      if (aiStatus === 'pending' || aiStatus === 'processing') return 5000
      return false
    },
  })
  const detail = detailData || null

  useEffect(() => {
    const reanalyzeGuard = reanalyzeGuardRef.current
    if (!detailId || !detailData || !reanalyzeGuard || reanalyzeGuard.recordId !== detailId) return

    const currentAI = detailData.result?.aiAnalysis
    const markCurrentRecordProcessing = () => {
      queryClient.setQueryData<TempDISCRecordDetail | undefined>(
        ['disc-record-detail', detailId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            result: {
              ...old.result,
              aiAnalysis: { status: 'processing' } as TempDISCRecordDetail['result']['aiAnalysis'],
            },
          }
        },
      )
      queryClient.setQueriesData<typeof recordsData>(
        { queryKey: ['disc-records'] },
        (old) => {
          if (!old?.items) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === detailId
                ? { ...item, ai_analysis_status: 'processing' }
                : item
            ),
          }
        },
      )
    }

    const withinGuardGrace = Date.now() - reanalyzeGuard.startedAt < STALE_ANALYSIS_RESULT_GRACE_MS

    if (!currentAI) {
      if (withinGuardGrace) {
        markCurrentRecordProcessing()
      }
      return
    }

    if (currentAI.status === 'failed') {
      const isSameFailedResult =
        withinGuardGrace &&
        reanalyzeGuard.previousStatus === 'failed' &&
        (currentAI.analyzedAt ?? null) === (reanalyzeGuard.previousAnalyzedAt ?? null)

      if (isSameFailedResult) {
        markCurrentRecordProcessing()
        return
      }

      reanalyzeGuardRef.current = null
      queryClient.invalidateQueries({ queryKey: ['disc-records'] })
      return
    }

    if (currentAI.status !== 'completed') return

    if (currentAI.analyzedAt && currentAI.analyzedAt !== reanalyzeGuard.previousAnalyzedAt) {
      reanalyzeGuardRef.current = null
      queryClient.invalidateQueries({ queryKey: ['disc-records'] })
      return
    }

    markCurrentRecordProcessing()
  }, [detailData, detailId, queryClient, recordsData])

  // AI 分析完成/失败时自动同步刷新列表（由详情轮询检测到状态变化）
  const detailAIStatus = detail?.result?.aiAnalysis?.status
  useEffect(() => {
    if (detailAIStatus === 'completed' || detailAIStatus === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['disc-records'] })
    }
  }, [detailAIStatus, queryClient])

  // 查看详情
  const handleViewDetail = useCallback((id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }, [])

  // 编辑记录
  const handleEditRecord = useCallback((record: TempDISCRecordListItem) => {
    setEditingRecord(record)
    setEditModalVisible(true)
  }, [])

  // 表格列定义（useMemo 防止 Semi Table 无限 forceUpdate）
  const columns: ColumnProps<TempDISCRecordListItem>[] = useMemo(() => [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
      fixed: 'left' as const,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <Text strong>{record.name}</Text>
      },
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 120,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={96} />
        return <Text>{record.phone || '-'}</Text>
      },
    },
    {
      title: '主要类型',
      dataIndex: 'primary_type',
      width: 120,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        return <DiscTypeTag type={record.primary_type} />
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence_level',
      width: 120,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={80} />
        const level = record.confidence_level
        if (!level) return <Text type="tertiary">-</Text>
        const meta = CONFIDENCE_LEVEL_META[level]
        return (
          <div className="flex items-center gap-1.5">
            <Tag size="small" color={meta?.color || 'grey'}>
              {meta?.label || level}
            </Tag>
            {typeof record.confidence_score === 'number' && (
              <Text type="tertiary" size="small" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {record.confidence_score}
              </Text>
            )}
          </div>
        )
      },
    },
    {
      title: '复合倾向',
      dataIndex: 'has_mixed_type',
      width: 100,
      render: (_text: boolean, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        if (!record.has_mixed_type) {
          return <Text type="tertiary">-</Text>
        }
        return <Tag size="small">{record.mixed_type_code || '复合型'}</Tag>
      },
    },
    ...(['D', 'I', 'S', 'C'] as const).map((dim) => ({
      title: <span style={{ display: 'flex', justifyContent: 'center' }}>{dim}分</span>,
      dataIndex: `${dim.toLowerCase()}_score`,
      width: 60,
      align: 'center' as const,
      render: (_text: number, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        const scoreKey = `${dim.toLowerCase()}_score` as keyof TempDISCRecordListItem
        return <span style={{ display: 'flex', justifyContent: 'center' }}>{record[scoreKey] ?? '-'}</span>
      },
    })),
    {
      title: 'AI分析',
      dataIndex: 'ai_analysis_status',
      width: 100,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        return <AIStatusTag status={record.ai_analysis_status} />
      },
    },
    {
      title: '首推岗位',
      dataIndex: 'best_match_job',
      width: 100,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        const job = record.best_match_job
        if (!job) return <Text type="tertiary">-</Text>
        return <Text strong style={{ fontSize: 13 }}>{job}</Text>
      },
    },
    {
      title: '来源渠道',
      dataIndex: 'source_channel',
      width: 100,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={64} />
        const channel = record.source_channel
        if (!channel) return <Text type="tertiary">-</Text>
        return <Tag size="small">{channel}</Tag>
      },
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      width: 150,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={112} />
        return (
          <Text type="tertiary" style={{ fontSize: 13 }}>
            {formatTime(record.submitted_at)}
          </Text>
        )
      },
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 60,
      fixed: 'right' as const,
      render: (_text: string, record: TempDISCRecordListItem) => {
        if (isSkeletonRow(record.id)) return <SemiSkeletonCell width={32} />
        return (
          <Dropdown
            trigger="click"
            position="bottomRight"
            clickToHide
            render={
              <Dropdown.Menu>
                <Dropdown.Item icon={<IconEyeOpened />} onClick={() => handleViewDetail(record.id)}>
                  查看详情
                </Dropdown.Item>
                <Dropdown.Item icon={<IconEdit />} onClick={() => handleEditRecord(record)}>
                  修改信息
                </Dropdown.Item>
              </Dropdown.Menu>
            }
          >
            <span data-stop-row-click onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
              <Button
                theme="borderless"
                type="tertiary"
                icon={<IconMore />}
              />
            </span>
          </Dropdown>
        )
      },
    },
  ], [handleViewDetail, handleEditRecord])

  // 搜索
  const handleSearch = () => {
    setPage(1)
    setSelectedRowKeys([])
  }

  // 重置搜索
  const handleReset = () => {
    setSearchName('')
    setSearchPhone('')
    setConfidenceFilter('all')
    setMixedTypeFilter('all')
    setAiStatusFilter('all')
    setChannelFilter('all')
    setPage(1)
    setSelectedRowKeys([])
  }

  // 刷新
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['disc-records'] })
  }

  // 批量 AI 分析
  const handleBatchAIAnalyze = useCallback(async () => {
    if (selectedRowKeys.length === 0 || batchAnalyzing) return
    setBatchAnalyzing(true)
    let successCount = 0
    let failCount = 0
    for (const id of selectedRowKeys) {
      try {
        const record = records.find((r) => r.id === id)
        const force = record?.ai_analysis_status === 'completed'
        const resp = await triggerDiscAIAnalysis(String(id), force)
        if (resp.success) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }
    setBatchAnalyzing(false)
    setSelectedRowKeys([])
    queryClient.invalidateQueries({ queryKey: ['disc-records'] })
    if (failCount === 0) {
      toast.success(`已提交 ${successCount} 条 AI 分析任务`)
    } else {
      toast.warning(`成功 ${successCount} 条，失败 ${failCount} 条`)
    }
  }, [selectedRowKeys, batchAnalyzing, records, queryClient])

  // 编辑成功后刷新列表
  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['disc-records'] })
  }

  // SemiDataTable 行点击
  const handleRowClick = useCallback((record: TempDISCRecordListItem) => {
    handleViewDetail(record.id)
  }, [handleViewDetail])

  return (
    <>
      <DataTableLayout
        title="DISC性格测试"
        total={activeTab === 'records' ? total : undefined}
        headerActions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              icon={<Users className="h-4 w-4" />}
              onClick={() => setGrantModalVisible(true)}
            >
              <span className="hidden sm:inline">授权访问</span>
              <span className="sm:hidden">授权</span>
            </Button>
            <Button
              theme="solid"
              type="primary"
              icon={<QrCode className="h-4 w-4" />}
              onClick={() => setQrModalVisible(true)}
            >
              <span className="hidden sm:inline">固定链接</span>
              <span className="sm:hidden">链接</span>
            </Button>
          </div>
        }
        toolbar={
          <>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key)}
              size="small"
              style={{ marginBottom: 8 }}
            >
              <TabPane tab="测试记录" itemKey="records" />
              <TabPane tab="测试链接" itemKey="links" />
            </Tabs>

            {activeTab === 'records' && (
          <>
            {/* 搜索筛选区 - 桌面端 */}
            <div className="hidden sm:flex items-center gap-2" style={{ marginBottom: 10 }}>
              <Input
                prefix={<IconSearch />}
                placeholder="姓名"
                value={searchName}
                onChange={(v) => setSearchName(v)}
                onEnterPress={handleSearch}
                showClear
                style={{ width: 180 }}
              />
              <Input
                placeholder="手机号"
                value={searchPhone}
                onChange={(v) => setSearchPhone(v)}
                onEnterPress={handleSearch}
                showClear
                style={{ width: 160 }}
              />
              <Select
                value={confidenceFilter}
                onChange={(v) => { setConfidenceFilter(v as string); setPage(1) }}
                optionList={confidenceOptions}
                style={{ width: 140 }}
              />
              <Select
                value={mixedTypeFilter}
                onChange={(v) => { setMixedTypeFilter(v as string); setPage(1) }}
                optionList={mixedTypeOptions}
                style={{ width: 140 }}
              />
              <Select
                value={aiStatusFilter}
                onChange={(v) => { setAiStatusFilter(v as string); setPage(1) }}
                optionList={aiStatusOptions}
                style={{ width: 140 }}
              />
              {availableChannels.length > 0 && (
                <Select
                  value={channelFilter}
                  onChange={(v) => { setChannelFilter(v as string); setPage(1) }}
                  optionList={[
                    { value: 'all', label: '全部渠道' },
                    ...availableChannels.map((ch) => ({ value: ch, label: ch })),
                  ]}
                  style={{ width: 160 }}
                />
              )}
              <Button theme="outline" type="primary" onClick={handleSearch}>
                搜索
              </Button>
              <Button theme="borderless" type="tertiary" onClick={handleReset}>
                重置
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                icon={<IconRefresh />}
                theme="light"
                onClick={handleRefresh}
                loading={loadingRecords}
                title="刷新数据"
              />
            </div>

            {/* 搜索筛选区 - 移动端（可折叠） */}
            <div className="sm:hidden space-y-2" style={{ marginBottom: 10 }}>
              <div className="flex items-center gap-2">
                <Input
                  prefix={<IconSearch />}
                  placeholder="搜索姓名"
                  value={searchName}
                  onChange={(v) => setSearchName(v)}
                  onEnterPress={handleSearch}
                  showClear
                  className="flex-1"
                />
                <Button
                  theme="outline"
                  type="tertiary"
                  icon={<IconChevronDown style={{ transform: filterOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />}
                  onClick={() => setFilterOpen(!filterOpen)}
                />
              </div>
              {filterOpen && (
                <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                  <Input
                    placeholder="手机号"
                    value={searchPhone}
                    onChange={(v) => setSearchPhone(v)}
                    onEnterPress={handleSearch}
                    showClear
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={confidenceFilter}
                      onChange={(v) => { setConfidenceFilter(v as string); setPage(1) }}
                      optionList={confidenceOptions}
                    />
                    <Select
                      value={mixedTypeFilter}
                      onChange={(v) => { setMixedTypeFilter(v as string); setPage(1) }}
                      optionList={mixedTypeOptions}
                    />
                    <Select
                      value={aiStatusFilter}
                      onChange={(v) => { setAiStatusFilter(v as string); setPage(1) }}
                      optionList={aiStatusOptions}
                    />
                    {availableChannels.length > 0 && (
                      <Select
                        value={channelFilter}
                        onChange={(v) => { setChannelFilter(v as string); setPage(1) }}
                        optionList={[
                          { value: 'all', label: '全部渠道' },
                          ...availableChannels.map((ch) => ({ value: ch, label: ch })),
                        ]}
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button theme="outline" type="primary" className="flex-1" onClick={handleSearch}>搜索</Button>
                    <Button theme="borderless" type="tertiary" className="flex-1" onClick={handleReset}>重置</Button>
                  </div>
                </div>
              )}
            </div>

            {/* 批量操作栏 */}
            {selectedRowKeys.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 rounded-md border px-4 py-2" style={{ marginBottom: 10, background: 'var(--semi-color-primary-light-default)' }}>
                <span className="text-sm font-medium">
                  已选择 <strong>{selectedRowKeys.length}</strong> 条记录
                </span>
                <Button
                  theme="solid"
                  type="primary"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  onClick={handleBatchAIAnalyze}
                  loading={batchAnalyzing}
                  disabled={batchAnalyzing}
                >
                  {batchAnalyzing ? '提交中...' : '批量 AI 分析'}
                </Button>
                <div className="flex-1" />
                <Button
                  theme="borderless"
                  type="tertiary"
                  icon={<X className="h-3.5 w-3.5" />}
                  onClick={() => setSelectedRowKeys([])}
                >
                  取消选择
                </Button>
              </div>
            )}
          </>
            )}
          </>
        }
      >
        {activeTab === 'links' ? (
          <LinksTab />
        ) : (
        <>
        {/* 桌面端：SemiDataTable */}
        <div className="hidden sm:flex" style={{ flex: 1, minHeight: 0, flexDirection: 'column' }}>
          <SemiDataTable<TempDISCRecordListItem>
            columns={columns}
            data={records}
            total={total}
            page={page}
            pageSize={pageSize}
            isLoading={loadingRecords}
            scrollX={1310}
            onPageChange={(p) => { setPage(p); setSelectedRowKeys([]) }}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); setSelectedRowKeys([]) }}
            onRowClick={handleRowClick}
            rowSelection={{
              selectedRowKeys,
              onChange: (_keys, rows) => {
                setSelectedRowKeys(rows.filter((r) => r && !isSkeletonRow(r.id)).map((r) => r.id))
              },
              fixed: 'left',
              width: 48,
            }}
            emptyText="暂无数据"
          />
        </div>

        {/* 移动端：卡片列表 */}
        <div className="flex-1 overflow-auto sm:hidden" style={{ padding: 12 }}>
          {loadingRecords ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3 mb-3">
                <div className="flex items-center justify-between">
                  <Skeleton.Paragraph rows={1} style={{ width: 64, height: 20 }} />
                  <Skeleton.Paragraph rows={1} style={{ width: 80, height: 20 }} />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton.Paragraph rows={1} style={{ width: 96, height: 16 }} />
                  <Skeleton.Paragraph rows={1} style={{ width: 64, height: 16 }} />
                </div>
                <div className="flex gap-3">
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} />
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} />
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} />
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} />
                </div>
                <Skeleton.Paragraph rows={1} style={{ width: '66%', height: 16 }} />
              </div>
            ))
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              暂无数据
            </div>
          ) : (
            records.map((record) => (
              <MobileRecordCard
                key={record.id}
                record={record}
                onViewDetail={handleViewDetail}
              />
            ))
          )}
        </div>
        </>
        )}
      </DataTableLayout>

      {/* 弹窗/抽屉放在 DataTableLayout 外面 */}
      <FixedLinkModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        username={username}
        sourceChannels={availableChannels}
      />

      <DiscAccessGrantModal
        visible={grantModalVisible}
        onClose={() => setGrantModalVisible(false)}
      />

      <EditRecordModal
        visible={editModalVisible}
        onClose={() => { setEditModalVisible(false); setEditingRecord(null) }}
        record={editingRecord}
        onSuccess={handleEditSuccess}
      />

      <DiscDetailDrawer
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setDetailId(null)
            reanalyzeGuardRef.current = null
            queryClient.invalidateQueries({ queryKey: ['disc-records'] })
          }
        }}
        detail={detail}
        loading={loadingDetail}
        onReanalyzeStart={(payload) => {
          reanalyzeGuardRef.current = payload
        }}
        onDetailUpdate={(updated: TempDISCRecordDetail) => {
          queryClient.setQueryData(['disc-record-detail', detailId], updated)
          const aiStatus = updated?.result?.aiAnalysis?.status
          if (aiStatus === 'processing' || aiStatus === 'pending') {
            queryClient.setQueriesData<typeof recordsData>(
              { queryKey: ['disc-records'] },
              (old) => {
                if (!old?.items) return old
                return {
                  ...old,
                  items: old.items.map((item) =>
                    item.id === updated.id
                      ? { ...item, ai_analysis_status: aiStatus }
                      : item
                  ),
                }
              },
            )
            queryClient.invalidateQueries({ queryKey: ['disc-records'] })
          } else if (aiStatus === 'completed' || aiStatus === 'failed') {
            reanalyzeGuardRef.current = null
          }
        }}
      />
    </>
  )
}
