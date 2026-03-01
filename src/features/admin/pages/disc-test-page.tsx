/**
 * DISC性格测试管理页面 - Semi Design 版本
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Modal,
  Typography,
  Skeleton,
  Dropdown,
} from '@douyinfe/semi-ui-19'
import type { ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import {
  IconSearch,
  IconRefresh,
  IconCopy,
  IconChevronDown,
  IconMore,
  IconEdit,
  IconEyeOpened,
} from '@douyinfe/semi-icons'
import { QrCode, Brain, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import {
  getTempDiscRecords,
  getTempDiscRecordDetail,
  updateTempDiscRecord,
} from '@/features/disc/api'
import {
  DISC_TYPE_CONFIG,
  type TempDISCRecordListItem,
  type TempDISCRecordDetail,
  type DISCDimension,
} from '@/features/disc/types'
import { DiscDetailDrawer } from '@/features/disc/components/disc-detail-drawer'
import { cn, copyToClipboard } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

const { Text } = Typography

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 固定测试 URL（带有当前用户标识） */
function getFixedTestUrl(username: string): string {
  return `${window.location.origin}/disc-test?ref=${encodeURIComponent(username)}`
}

// 骨架屏标识前缀
const SKELETON_ID_PREFIX = '__skeleton__'
function isSkeletonRow(id: string): boolean {
  return id.startsWith(SKELETON_ID_PREFIX)
}
function SkeletonCell({ width = '70%' }: { width?: string | number }) {
  return (
    <Skeleton.Paragraph
      rows={1}
      style={{ width, height: 16 }}
      loading
    />
  )
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

const CONFIDENCE_LEVEL_META: Record<string, { label: string; color: string }> = {
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

// 固定测试链接弹窗（二维码 + 复制链接）
function FixedLinkModal({
  visible,
  onClose,
  url,
}: {
  visible: boolean
  onClose: () => void
  url: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!visible || !url) return
    const timer = setTimeout(() => {
      if (canvasRef.current) {
        QRCode.toCanvas(
          canvasRef.current,
          url,
          {
            width: 180,
            margin: 2,
            color: { dark: '#141413', light: '#ffffff' },
          },
          () => {}
        )
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [visible, url])

  const handleCopy = async () => {
    const ok = await copyToClipboard(url)
    if (ok) {
      toast.success('链接已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          DISC 测试链接
        </span>
      }
      visible={visible}
      onCancel={onClose}
      footer={
        <Button theme="solid" type="primary" block onClick={handleCopy} icon={<IconCopy />}>
          复制链接
        </Button>
      }
      width={380}
      closeOnEsc
    >
      <div className="flex flex-col items-center gap-4">
        {/* 二维码区域 */}
        <div className="flex items-center justify-center rounded-lg border bg-white p-3">
          <canvas
            ref={canvasRef}
            width={180}
            height={180}
            style={{ width: 180, height: 180, display: 'block' }}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center">
          扫描二维码或复制链接，可打印放在公司前台
        </p>

        {/* 链接复制区 */}
        <div className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-3 py-2.5">
          <p className="min-w-0 flex-1 break-all text-xs font-mono leading-relaxed text-foreground/80">
            {url}
          </p>
          <Button
            theme="borderless"
            type="tertiary"
            icon={<IconCopy />}
            onClick={handleCopy}
            size="small"
          />
        </div>
      </div>
    </Modal>
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
    } catch {
      toast.error('修改失败，请稍后重试')
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

// 生成骨架屏占位数据
function createSkeletonData(count: number): TempDISCRecordListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${SKELETON_ID_PREFIX}${i}`,
    name: '',
    submitted_at: '',
    is_migrated: false,
    created_at: '',
  }))
}

interface PaginationTextInfo {
  currentStart: number
  currentEnd: number
  total: number
}

export function DiscTestPage() {
  useDocumentTitle('DISC性格测试')
  const queryClient = useQueryClient()
  const username = useAuthStore((state) => state.user?.username ?? '')

  // 搜索
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all')
  const [mixedTypeFilter, setMixedTypeFilter] = useState<string>('all')
  const [aiStatusFilter, setAiStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 移动端筛选折叠
  const [filterOpen, setFilterOpen] = useState(false)
  // 固定链接二维码弹窗
  const [qrModalVisible, setQrModalVisible] = useState(false)

  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // 编辑弹窗
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TempDISCRecordListItem | null>(null)

  // Table 动态高度
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState<number>(400)

  const measure = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return
    const headerH = el.querySelector('.semi-table-thead')?.getBoundingClientRect().height ?? 47
    const available = el.clientHeight - headerH
    if (available > 100) setScrollY(available)
  }, [])

  useEffect(() => {
    measure()
    const el = wrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  // 查询已完成记录
  const { data: recordsData, isLoading: loadingRecords } = useQuery({
    queryKey: ['disc-records', page, pageSize, searchName, searchPhone, confidenceFilter, mixedTypeFilter, aiStatusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (searchName) params.name = searchName
      if (searchPhone) params.phone = searchPhone
      if (confidenceFilter !== 'all') params.confidence_level = confidenceFilter
      if (mixedTypeFilter !== 'all') params.has_mixed_type = mixedTypeFilter === 'yes'
      if (aiStatusFilter !== 'all') params.ai_analysis_status = aiStatusFilter
      const res = await getTempDiscRecords(params as Parameters<typeof getTempDiscRecords>[0])
      return res.data
    },
  })
  const records = useMemo<TempDISCRecordListItem[]>(() => recordsData?.items ?? [], [recordsData?.items])
  const total = recordsData?.total || 0

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

  // 骨架屏数据
  const displayData = useMemo(() => {
    return loadingRecords ? createSkeletonData(pageSize) : records
  }, [loadingRecords, records, pageSize])

  // 表格列定义
  const columns: ColumnProps<TempDISCRecordListItem>[] = [
      {
        title: '姓名',
        dataIndex: 'name',
        width: 100,
        fixed: 'left' as const,
        render: (_text: string, record: TempDISCRecordListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
          return <Text strong>{record.name}</Text>
        },
      },
      {
        title: '手机号',
        dataIndex: 'phone',
        width: 120,
        render: (_text: string, record: TempDISCRecordListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={96} />
          return <Text>{record.phone || '-'}</Text>
        },
      },
      {
        title: '主要类型',
        dataIndex: 'primary_type',
        width: 120,
        render: (_text: string, record: TempDISCRecordListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={80} />
          return <DiscTypeTag type={record.primary_type} />
        },
      },
      {
        title: '置信度',
        dataIndex: 'confidence_level',
        width: 120,
        render: (_text: string, record: TempDISCRecordListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={80} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={32} />
          const scoreKey = `${dim.toLowerCase()}_score` as keyof TempDISCRecordListItem
          return <span style={{ display: 'flex', justifyContent: 'center' }}>{record[scoreKey] ?? '-'}</span>
        },
      })),
      {
        title: 'AI分析',
        dataIndex: 'ai_analysis_status',
        width: 100,
        render: (_text: string, record: TempDISCRecordListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
          return <AIStatusTag status={record.ai_analysis_status} />
        },
      },
      {
        title: '首推岗位',
        dataIndex: 'best_match_job',
        width: 100,
        render: (_text: string, record: TempDISCRecordListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={64} />
          const job = record.best_match_job
          if (!job) return <Text type="tertiary">-</Text>
          return <Text strong style={{ fontSize: 13 }}>{job}</Text>
        },
      },
      {
        title: '提交时间',
        dataIndex: 'submitted_at',
        width: 150,
        render: (_text: string, record: TempDISCRecordListItem) => {
          if (isSkeletonRow(record.id)) return <SkeletonCell width={112} />
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
          if (isSkeletonRow(record.id)) return <SkeletonCell width={32} />
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
                  size="small"
                />
              </span>
            </Dropdown>
          )
        },
      },
    ]

  // 搜索
  const handleSearch = () => {
    setPage(1)
  }

  // 重置搜索
  const handleReset = () => {
    setSearchName('')
    setSearchPhone('')
    setConfidenceFilter('all')
    setMixedTypeFilter('all')
    setAiStatusFilter('all')
    setPage(1)
  }

  // 刷新
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['disc-records'] })
  }

  // 查看详情
  const handleViewDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  // 编辑记录
  const handleEditRecord = (record: TempDISCRecordListItem) => {
    setEditingRecord(record)
    setEditModalVisible(true)
  }

  // 编辑成功后刷新列表
  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['disc-records'] })
  }

  // 分页配置 (useMemo 防止字面量重新创建)
  const pagination = useMemo(() => {
    if (total <= 0) return false as const
    return {
      currentPage: page,
      pageSize,
      total,
      onPageChange: (p: number) => setPage(p),
      onPageSizeChange: (s: number) => { setPageSize(s); setPage(1) },
      showSizeChanger: true,
      pageSizeOpts: [10, 20, 50],
      showTotal: true,
      formatPageText: (info: PaginationTextInfo) =>
        `第 ${info.currentStart}–${info.currentEnd} 条，共 ${info.total} 条`,
    }
  }, [total, page, pageSize])

  // Select 选项定义
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

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">DISC性格测试</h1>
            <p className="hidden sm:block text-sm text-muted-foreground">
              管理DISC性格测试记录和查看测试结果
            </p>
          </div>
          <Button
            theme="solid"
            type="primary"
            icon={<QrCode className="h-4 w-4" />}
            onClick={() => setQrModalVisible(true)}
          >
            <span className="hidden sm:inline">测试链接</span>
            <span className="sm:hidden">链接</span>
          </Button>
        </div>

        {/* 搜索筛选区 - 桌面端 */}
        <div className="hidden sm:flex items-center gap-2">
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
          <Button theme="outline" type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button theme="borderless" type="tertiary" onClick={handleReset}>
            重置
          </Button>
          <div className="flex-1" />
          <Button
            theme="borderless"
            type="tertiary"
            icon={<IconRefresh />}
            onClick={handleRefresh}
          />
        </div>

        {/* 搜索筛选区 - 移动端（可折叠） */}
        <div className="sm:hidden space-y-2">
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
            <Button
              theme="borderless"
              type="tertiary"
              icon={<IconRefresh />}
              onClick={handleRefresh}
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
                  className="col-span-2"
                />
              </div>
              <div className="flex gap-2">
                <Button theme="outline" type="primary" className="flex-1" onClick={handleSearch}>搜索</Button>
                <Button theme="borderless" type="tertiary" className="flex-1" onClick={handleReset}>重置</Button>
              </div>
            </div>
          )}
        </div>

        {/* 测试记录表格 - 桌面端 */}
        <div
          ref={wrapperRef}
          className="hidden sm:flex flex-1"
          style={{ minHeight: 0, flexDirection: 'column' }}
        >
          <Table
            columns={columns}
            dataSource={displayData}
            rowKey="id"
            pagination={pagination}
            scroll={{ y: scrollY }}
            loading={false}
            onRow={(record) => ({
              onClick: (e: React.MouseEvent) => {
                // 忽略操作列按钮和下拉菜单的点击
                const target = e.target as HTMLElement
                if (target.closest('.semi-dropdown') || target.closest('.semi-dropdown-menu') || target.closest('[data-stop-row-click]')) return
                if (record && !isSkeletonRow(record.id)) {
                  handleViewDetail(record.id)
                }
              },
              style: { cursor: record && !isSkeletonRow(record.id) ? 'pointer' : undefined },
            })}
            empty={
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--semi-color-text-2)' }}>
                暂无数据
              </div>
            }
            style={loadingRecords ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          />
        </div>

        {/* 测试记录卡片列表 - 移动端 */}
        <div className="sm:hidden flex-1 overflow-auto space-y-3">
          {loadingRecords ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton.Paragraph rows={1} style={{ width: 64, height: 20 }} loading />
                  <Skeleton.Paragraph rows={1} style={{ width: 80, height: 20 }} loading />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton.Paragraph rows={1} style={{ width: 96, height: 16 }} loading />
                  <Skeleton.Paragraph rows={1} style={{ width: 64, height: 16 }} loading />
                </div>
                <div className="flex gap-3">
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} loading />
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} loading />
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} loading />
                  <Skeleton.Paragraph rows={1} style={{ width: 40, height: 16 }} loading />
                </div>
                <Skeleton.Paragraph rows={1} style={{ width: '66%', height: 16 }} loading />
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
      </div>

      {/* 固定测试链接弹窗 */}
      <FixedLinkModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        url={getFixedTestUrl(username)}
      />

      {/* 编辑弹窗 */}
      <EditRecordModal
        visible={editModalVisible}
        onClose={() => { setEditModalVisible(false); setEditingRecord(null) }}
        record={editingRecord}
        onSuccess={handleEditSuccess}
      />

      {/* 详情抽屉 */}
      <DiscDetailDrawer
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailId(null)
        }}
        detail={detail}
        loading={loadingDetail}
        onDetailUpdate={(updated: TempDISCRecordDetail) => {
          queryClient.setQueryData(['disc-record-detail', detailId], updated)
        }}
      />
    </Main>
  )
}
