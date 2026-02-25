/**
 * DISC性格测试管理页面
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import QRCode from 'qrcode'
import { Search, RefreshCw, Plus, Copy, Trash2, Eye, QrCode } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import {
  getTempDiscRecords,
  getTempDiscRecordDetail,
  createDiscTestLink,
  getDiscTestLinks,
  deleteDiscTestLink,
} from '@/features/disc/api'
import {
  DISC_TYPE_CONFIG,
  type TempDISCRecordListItem,
  type TempDISCRecordDetail,
  type DiscTestLink,
  type DISCDimension,
  type DISCResult,
} from '@/features/disc/types'
import { DiscResultCharts } from '@/features/disc/components/disc-result-charts'
import { showApiErrorToast } from '@/lib/api/error-toast'
import { copyToClipboard } from '@/lib/utils'

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatOptionalTime(time?: string) {
  if (!time) return '-'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return time
  return formatTime(time)
}

/**
 * 根据链接数据动态构建测试 URL（使用当前 origin，避免存储的 localhost 问题）
 */
function buildTestUrl(link: DiscTestLink): string {
  const params = new URLSearchParams({
    appointment_id: link.appointment_id,
    name: link.name,
  })
  if (link.phone) params.set('phone', link.phone)
  return `${window.location.origin}/disc-test?${params.toString()}`
}

function DiscTypeBadge({ type }: { type?: string }) {
  if (!type) return <span className="text-muted-foreground">-</span>
  const dim = type as DISCDimension
  const config = DISC_TYPE_CONFIG[dim]
  if (!config) return <Badge variant="outline">{type}</Badge>
  return (
    <Badge
      style={{ backgroundColor: config.bgColor, color: config.color, borderColor: config.color }}
    >
      {dim} - {config.label}
    </Badge>
  )
}

const DIMENSION_COLORS: Record<DISCDimension, string> = {
  D: 'bg-red-50 border-red-200 text-red-700',
  I: 'bg-orange-50 border-orange-200 text-orange-700',
  S: 'bg-green-50 border-green-200 text-green-700',
  C: 'bg-blue-50 border-blue-200 text-blue-700',
}

const CONFIDENCE_LEVEL_META = {
  high: { label: '高置信', variant: 'default' as const },
  medium: { label: '中置信', variant: 'secondary' as const },
  low: { label: '低置信', variant: 'outline' as const },
}

function getTypeScore(result: DISCResult, typeCode?: DISCDimension): number | null {
  if (!typeCode) return null
  const scoreFromScores = result.scores?.[typeCode]
  return typeof scoreFromScores === 'number' ? scoreFromScores : null
}

type DiscLeadershipGuide = {
  summary: string
  motivation: string
  managementFocus: string
  communication: string
  roleFit: string[]
  riskSignals: string[]
  interviewQuestions: string[]
  first90Days: string[]
}

const DISC_LEADERSHIP_GUIDE: Record<DISCDimension, DiscLeadershipGuide> = {
  D: {
    summary: '结果和速度导向明显，遇到阻力时倾向主动推进，适合高目标、高不确定性的攻坚任务。',
    motivation: '给清晰目标、授权边界和阶段性胜利反馈，避免过多流程束缚。',
    managementFocus: '目标拆解要量化，明确优先级与决策权限，防止“快但不齐”。',
    communication: '先结论后依据，聚焦业务影响和时间节点，不宜绕圈描述。',
    roleFit: ['业务拓展/BD', '项目攻坚负责人', '变革推进角色'],
    riskSignals: ['可能压缩协作讨论空间', '容易忽视细节和团队情绪反馈'],
    interviewQuestions: [
      '请举例说明你如何在时间紧、资源有限时推进关键目标。',
      '当团队成员不同意你的方案时，你如何处理并达成执行？',
    ],
    first90Days: [
      '以周为单位设置里程碑与复盘，确保速度和质量并行。',
      '安排跨团队协同任务，观察其在冲突场景下的影响方式。',
    ],
  },
  I: {
    summary: '人际影响和氛围带动能力突出，适合需要激励团队或对外沟通的岗位场景。',
    motivation: '给予公开认可、表达空间和可见舞台，激发持续投入。',
    managementFocus: '目标要从“热情驱动”落到“结构化执行”，明确交付标准。',
    communication: '先建立连接再谈任务，适合互动式、反馈式沟通方式。',
    roleFit: ['客户沟通/咨询', '团队氛围建设', '市场活动与传播'],
    riskSignals: ['可能高估进展、低估执行细节', '在重复性任务中稳定性不足'],
    interviewQuestions: [
      '你如何把一个创意落地为可衡量、可复盘的结果？',
      '请举例说明你如何在团队士气低迷时恢复协作状态。',
    ],
    first90Days: [
      '设置可量化的过程指标，避免仅凭主观感受判断进度。',
      '安排一项需要跨部门协同的项目，观察其推动闭环能力。',
    ],
  },
  S: {
    summary: '稳定、耐心、支持型特质明显，适合长期协作和连续运营类任务。',
    motivation: '提供可预期节奏和稳定支持，强调团队归属与长期价值。',
    managementFocus: '变更管理要提前沟通并给过渡期，避免突然转向造成内耗。',
    communication: '以尊重和倾听为前提，给足思考时间与背景信息。',
    roleFit: ['客户成功/运营支持', '流程协同岗位', '团队稳定器角色'],
    riskSignals: ['可能回避冲突和高压决策', '在快速变化场景中反应偏慢'],
    interviewQuestions: [
      '面对频繁变化的目标，你如何保持执行稳定性？',
      '当需要你推动一个不受欢迎的变更时，你会怎么做？',
    ],
    first90Days: [
      '通过逐步加压任务，观察其在节奏变化中的适应能力。',
      '明确“必须拍板”场景，训练其在关键节点的决策表达。',
    ],
  },
  C: {
    summary: '逻辑与质量意识强，擅长把复杂任务标准化、结构化，保障交付可靠性。',
    motivation: '提供明确标准、数据依据和专业成长路径，认可其专业判断。',
    managementFocus: '设定“质量底线 + 时效上限”，避免过度追求完美导致延迟。',
    communication: '用事实、数据和边界条件对齐，减少模糊指令。',
    roleFit: ['数据分析/质控', '流程与合规管理', '研究与专业支持岗位'],
    riskSignals: ['可能在信息不充分时延迟决策', '对低标准协作容忍度较低'],
    interviewQuestions: [
      '在时间紧但质量要求高的任务中，你如何取舍？',
      '当上级要求快速推进、但你认为风险较高时会怎么沟通？',
    ],
    first90Days: [
      '设置“先交付后优化”节点，验证其速度与质量平衡能力。',
      '让其参与跨职能评审，观察其对非专业角色的沟通方式。',
    ],
  },
}

const DISC_SECONDARY_BLEND_HINT: Record<DISCDimension, string> = {
  D: '次要维度偏 D，说明在关键节点更倾向主动推动和拍板。',
  I: '次要维度偏 I，说明在推进目标时更依赖影响力和关系协调。',
  S: '次要维度偏 S，说明在高压下仍会强调稳定协作与风险缓冲。',
  C: '次要维度偏 C，说明在执行中会更关注方法、标准和质量控制。',
}

type DiscDimensionScore = { dim: DISCDimension; score: number }
type DiscDimensionValues = Record<DISCDimension, number>

function buildDimensionRanking(scores: Record<DISCDimension, number>): DiscDimensionScore[] {
  return (['D', 'I', 'S', 'C'] as DISCDimension[])
    .map((dim) => ({ dim, score: Math.round(scores[dim] ?? 0) }))
    .sort((a, b) => b.score - a.score)
}

function getScoreBand(score: number): string {
  if (score >= 75) return '高显性'
  if (score >= 60) return '中高显性'
  if (score >= 45) return '中位'
  return '低显性'
}

function getTopDimension(values: DiscDimensionValues): DISCDimension {
  return (['D', 'I', 'S', 'C'] as DISCDimension[]).reduce((prev, current) =>
    values[current] > values[prev] ? current : prev
  )
}

function buildGraphInsight(graphs?: DISCResult['graphs']) {
  if (!graphs) return null

  const external: DiscDimensionValues = {
    D: graphs.external.D,
    I: graphs.external.I,
    S: graphs.external.S,
    C: graphs.external.C,
  }
  const internal: DiscDimensionValues = {
    D: graphs.internal.D,
    I: graphs.internal.I,
    S: graphs.internal.S,
    C: graphs.internal.C,
  }
  const selfImage: DiscDimensionValues = {
    D: graphs.selfImage.D,
    I: graphs.selfImage.I,
    S: graphs.selfImage.S,
    C: graphs.selfImage.C,
  }

  const shifts = (['D', 'I', 'S', 'C'] as DISCDimension[]).map((dim) => ({
    dim,
    delta: external[dim] - internal[dim],
  }))
  const strongestShift = shifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
  const pressureIndex = Math.round(
    shifts.reduce((sum, item) => sum + Math.abs(item.delta), 0) / shifts.length
  )

  return {
    externalTop: getTopDimension(external),
    internalTop: getTopDimension(internal),
    selfImageTop: getTopDimension(selfImage),
    strongestShift,
    pressureIndex,
  }
}

function getPressureLabel(pressureIndex: number): string {
  if (pressureIndex >= 25) return '高适应压力'
  if (pressureIndex >= 15) return '中等适应压力'
  return '低适应压力'
}

// 二维码弹窗组件
function QrCodeDialog({
  open,
  onOpenChange,
  url,
  name,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  name: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (open && url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 2 })
    }
  }, [open, url])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{name} - 测试二维码</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          <canvas ref={canvasRef} />
          <p className="text-xs text-muted-foreground text-center break-all max-w-[280px]">
            {url}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DiscTestPage() {
  useDocumentTitle('DISC性格测试')
  const queryClient = useQueryClient()

  // 搜索
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [mixedTypeFilter, setMixedTypeFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 创建链接弹窗
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createPhone, setCreatePhone] = useState('')

  // 链接展示弹窗
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')

  // 二维码弹窗
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [qrName, setQrName] = useState('')

  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // 查询待填写链接
  const { data: pendingLinksData, isLoading: loadingLinks } = useQuery({
    queryKey: ['disc-pending-links'],
    queryFn: async () => {
      const res = await getDiscTestLinks({ status: 'PENDING', size: 100 })
      return res.data
    },
  })
  const pendingLinks = pendingLinksData?.items || []

  // 查询已完成记录
  const { data: recordsData, isLoading: loadingRecords } = useQuery({
    queryKey: ['disc-records', page, pageSize, searchName, searchPhone, confidenceFilter, mixedTypeFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (searchName) params.name = searchName
      if (searchPhone) params.phone = searchPhone
      if (confidenceFilter !== 'all') params.confidence_level = confidenceFilter
      if (mixedTypeFilter !== 'all') params.has_mixed_type = mixedTypeFilter === 'yes'
      const res = await getTempDiscRecords(params as Parameters<typeof getTempDiscRecords>[0])
      return res.data
    },
  })
  const records = recordsData?.items || []
  const total = recordsData?.total || 0

  // 查询详情
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ['disc-record-detail', detailId],
    queryFn: async () => {
      const res = await getTempDiscRecordDetail(detailId!)
      return res.data
    },
    enabled: !!detailId && detailOpen,
  })
  const detail: TempDISCRecordDetail | null = detailData || null
  const resolvedConfidence = detail?.result?.confidence || null
  const resolvedMixedType = detail?.result?.mixedType || null
  const primaryCode = detail?.result?.primaryType?.code
  const secondaryCode = detail?.result?.secondaryType?.code
  const primaryGuide = primaryCode ? DISC_LEADERSHIP_GUIDE[primaryCode] : null
  const scoreRanking = detail ? buildDimensionRanking(detail.result.scores) : []
  const scoreGap = scoreRanking[0] && scoreRanking[1] ? scoreRanking[0].score - scoreRanking[1].score : null
  const graphInsight = detail ? buildGraphInsight(detail.result.graphs) : null
  const interviewChecklist = primaryGuide
    ? [
      ...primaryGuide.interviewQuestions,
      ...(secondaryCode ? [
        `次要维度观察：${DISC_SECONDARY_BLEND_HINT[secondaryCode]}`,
      ] : []),
      ...((detail?.result.potentialChallenges || [])
        .slice(0, 2)
        .map((item) => `风险验证：请候选人结合真实案例，说明如何应对“${item}”。`)),
    ]
    : []

  // 创建链接 mutation
  const createLinkMutation = useMutation({
    mutationFn: (data: { name: string; phone?: string }) => createDiscTestLink(data),
    onSuccess: (res) => {
      setCreateDialogOpen(false)
      setCreateName('')
      setCreatePhone('')
      const linkData = res.data
      if (linkData) {
        setGeneratedLink(buildTestUrl(linkData))
      }
      setLinkDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['disc-pending-links'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '创建测试链接失败'),
  })

  // 删除链接 mutation
  const deleteLinkMutation = useMutation({
    mutationFn: (id: string) => deleteDiscTestLink(id),
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['disc-pending-links'] })
    },
    onError: (error: Error) => showApiErrorToast(error, '删除失败'),
  })

  // 表格列定义
  const columns: ColumnDef<TempDISCRecordListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: '姓名',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-4 w-16" />
          return <span className="font-medium">{row.original.name}</span>
        },
      },
      {
        accessorKey: 'phone',
        header: '手机号',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-4 w-24" />
          return row.original.phone || '-'
        },
      },
      {
        accessorKey: 'primary_type',
        header: '主要类型',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-5 w-20" />
          return <DiscTypeBadge type={row.original.primary_type} />
        },
      },
      {
        id: 'confidence',
        header: '置信度',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-5 w-20" />
          const level = row.original.confidence_level
          if (!level) return <span className="text-xs text-muted-foreground">-</span>
          const meta = CONFIDENCE_LEVEL_META[level as keyof typeof CONFIDENCE_LEVEL_META]
          return (
            <div className="flex items-center gap-1.5">
              <Badge variant={meta?.variant || 'outline'}>
                {meta?.label || level}
              </Badge>
              {typeof row.original.confidence_score === 'number' && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {row.original.confidence_score}
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'mixed_type',
        header: '复合倾向',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-5 w-16" />
          if (!row.original.has_mixed_type) {
            return <span className="text-xs text-muted-foreground">-</span>
          }
          return (
            <Badge variant="outline">
              {row.original.mixed_type_code || '复合型'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'd_score',
        header: () => <span className="flex justify-center">D分</span>,
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-4 w-8 mx-auto" />
          return <span className="flex justify-center">{row.original.d_score ?? '-'}</span>
        },
      },
      {
        accessorKey: 'i_score',
        header: () => <span className="flex justify-center">I分</span>,
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-4 w-8 mx-auto" />
          return <span className="flex justify-center">{row.original.i_score ?? '-'}</span>
        },
      },
      {
        accessorKey: 's_score',
        header: () => <span className="flex justify-center">S分</span>,
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-4 w-8 mx-auto" />
          return <span className="flex justify-center">{row.original.s_score ?? '-'}</span>
        },
      },
      {
        accessorKey: 'c_score',
        header: () => <span className="flex justify-center">C分</span>,
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-4 w-8 mx-auto" />
          return <span className="flex justify-center">{row.original.c_score ?? '-'}</span>
        },
      },
      {
        accessorKey: 'submitted_at',
        header: '提交时间',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-4 w-28" />
          return formatTime(row.original.submitted_at)
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          if (row.original.id.startsWith('__skeleton__'))
            return <Skeleton className="h-8 w-8" />
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleViewDetail(row.original.id)}
              title="查看详情"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )
        },
      },
    ],
    []
  )

  // 骨架屏数据
  const skeletonData: TempDISCRecordListItem[] = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: `__skeleton__${i}`,
        name: '',
        submitted_at: '',
        is_migrated: false,
        created_at: '',
      })),
    []
  )

  const tableData = loadingRecords ? skeletonData : records

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
    setPage(1)
  }

  // 刷新
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['disc-pending-links'] })
    queryClient.invalidateQueries({ queryKey: ['disc-records'] })
  }

  // 创建测试链接
  const handleCreateLink = () => {
    if (!createName.trim()) {
      toast.warning('请输入姓名')
      return
    }
    createLinkMutation.mutate({
      name: createName.trim(),
      phone: createPhone.trim() || undefined,
    })
  }

  // 复制链接
  const handleCopyLink = async (url: string) => {
    const ok = await copyToClipboard(url)
    if (ok) {
      toast.success('链接已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  // 显示二维码
  const handleShowQrCode = (url: string, name: string) => {
    setQrUrl(url)
    setQrName(name)
    setQrDialogOpen(true)
  }

  // 查看详情
  const handleViewDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">DISC性格测试</h1>
            <p className="text-sm text-muted-foreground">
              管理DISC性格测试链接和查看测试结果
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            创建测试链接
          </Button>
        </div>

        {/* 搜索筛选区 */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="姓名"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8"
            />
          </div>
          <Input
            placeholder="手机号"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="min-w-[160px] max-w-[200px]"
          />
          <Select value={confidenceFilter} onValueChange={(value) => { setConfidenceFilter(value as typeof confidenceFilter); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="置信度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部置信度</SelectItem>
              <SelectItem value="high">高置信</SelectItem>
              <SelectItem value="medium">中置信</SelectItem>
              <SelectItem value="low">低置信</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mixedTypeFilter} onValueChange={(value) => { setMixedTypeFilter(value as typeof mixedTypeFilter); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="复合倾向" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部倾向</SelectItem>
              <SelectItem value="yes">复合型</SelectItem>
              <SelectItem value="no">单一型</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleSearch}>
            搜索
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            重置
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 待填写测试链接区域 */}
        {pendingLinks.length > 0 && (
          <Card>
            <CardHeader className="px-4 py-2">
              <CardTitle className="flex items-center gap-2 text-sm leading-none">
                待填写测试链接
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {pendingLinks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>手机号</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>填写地址</TableHead>
                      <TableHead className="w-[140px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLinks ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingLinks.map((link) => {
                        const testUrl = buildTestUrl(link)
                        return (
                        <TableRow key={link.id}>
                          <TableCell className="font-medium">{link.name}</TableCell>
                          <TableCell>{link.phone || '-'}</TableCell>
                          <TableCell>{formatTime(link.created_at)}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground truncate max-w-[300px] inline-block">
                              {testUrl}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleShowQrCode(testUrl, link.name)}
                                title="二维码"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyLink(testUrl)}
                                title="复制链接"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteLinkMutation.mutate(link.id)}
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 已完成测试记录表格 */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {total > 0 && (
          <SimplePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            isLoading={loadingRecords}
          />
        )}
      </div>

      {/* 创建测试链接弹窗 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>创建测试链接</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                placeholder="请输入候选人姓名"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input
                placeholder="请输入手机号（选填）"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateLink} disabled={createLinkMutation.isPending}>
              {createLinkMutation.isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 链接展示弹窗（含二维码） */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>测试链接已生成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              请将以下链接或二维码发送给候选人，候选人打开即可填写DISC测试。
            </p>
            <div className="flex justify-center">
              <canvas
                ref={(el) => {
                  if (el && generatedLink) {
                    QRCode.toCanvas(el, generatedLink, { width: 180, margin: 2 })
                  }
                }}
              />
            </div>
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-sm break-all font-mono">{generatedLink}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={() => handleCopyLink(generatedLink)}>
              <Copy className="mr-2 h-4 w-4" />
              复制链接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 二维码弹窗 */}
      <QrCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        url={qrUrl}
        name={qrName}
      />

      {/* 详情抽屉 */}
      <Sheet open={detailOpen} onOpenChange={(open) => {
        setDetailOpen(open)
        if (!open) setDetailId(null)
      }}>
        <SheetContent className="w-[760px] sm:max-w-[760px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>DISC测试详情</SheetTitle>
          </SheetHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              加载中...
            </div>
          ) : detail ? (
            <div className="mt-6 space-y-6">
              {/* 基本信息 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">基本信息</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                  <div className="text-muted-foreground">姓名</div>
                  <div className="font-medium">{detail.name}</div>
                  <div className="text-muted-foreground">手机号</div>
                  <div>{detail.phone || '-'}</div>
                  <div className="text-muted-foreground">提交时间</div>
                  <div>{formatTime(detail.submitted_at)}</div>
                  <div className="text-muted-foreground">测评生成时间</div>
                  <div>{formatOptionalTime(detail.result.testDate)}</div>
                  <div className="text-muted-foreground">测试记录ID</div>
                  <div className="font-mono text-xs break-all">{detail.test_record_id}</div>
                  <div className="text-muted-foreground">计算方法</div>
                  <div className="font-mono text-xs">{detail.result.calculationMethod || '-'}</div>
                  <div className="text-muted-foreground">主要类型</div>
                  <div className="flex items-center gap-2">
                    <DiscTypeBadge type={detail.result.primaryType?.code} />
                    {typeof getTypeScore(detail.result, detail.result.primaryType?.code) === 'number' && (
                      <span className="text-xs text-muted-foreground">
                        {getTypeScore(detail.result, detail.result.primaryType?.code)}%
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">次要类型</div>
                  <div className="flex items-center gap-2">
                    <DiscTypeBadge type={detail.result.secondaryType?.code} />
                    {typeof getTypeScore(detail.result, detail.result.secondaryType?.code) === 'number' && (
                      <span className="text-xs text-muted-foreground">
                        {getTypeScore(detail.result, detail.result.secondaryType?.code)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* 管理层摘要 */}
              {primaryCode && primaryGuide && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">管理层摘要（领导 / HR 视角）</h3>
                    <div className="rounded-md border bg-muted/20 p-4 space-y-3">
                      <p className="text-sm leading-relaxed">
                        候选人当前以
                        <span className="font-semibold">
                          {' '}
                          {primaryCode}（{DISC_TYPE_CONFIG[primaryCode].label}）
                        </span>
                        为主导（{Math.round(detail.result.scores[primaryCode] ?? 0)}%，
                        {getScoreBand(Math.round(detail.result.scores[primaryCode] ?? 0))}），
                        {secondaryCode ? (
                          <>
                            次要维度为
                            <span className="font-semibold">
                              {' '}
                              {secondaryCode}（{DISC_TYPE_CONFIG[secondaryCode].label}）
                            </span>
                            （{Math.round(detail.result.scores[secondaryCode] ?? 0)}%）。
                          </>
                        ) : (
                          '次要维度信息缺失。'
                        )}
                        {typeof scoreGap === 'number' ? ` 主次分差为 ${scoreGap} 分。` : ''}
                        {resolvedConfidence ? ` 置信度为 ${resolvedConfidence.score}/100。` : ''}
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border bg-background p-3 space-y-1.5">
                          <p className="text-xs text-muted-foreground">核心行为特征</p>
                          <p className="text-sm leading-relaxed">{primaryGuide.summary}</p>
                        </div>
                        <div className="rounded-md border bg-background p-3 space-y-1.5">
                          <p className="text-xs text-muted-foreground">管理抓手</p>
                          <p className="text-sm leading-relaxed">{primaryGuide.managementFocus}</p>
                        </div>
                        <div className="rounded-md border bg-background p-3 space-y-1.5">
                          <p className="text-xs text-muted-foreground">激励方式</p>
                          <p className="text-sm leading-relaxed">{primaryGuide.motivation}</p>
                        </div>
                        <div className="rounded-md border bg-background p-3 space-y-1.5">
                          <p className="text-xs text-muted-foreground">沟通风格建议</p>
                          <p className="text-sm leading-relaxed">
                            {primaryGuide.communication}
                            {secondaryCode ? ` ${DISC_SECONDARY_BLEND_HINT[secondaryCode]}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">四维排序（用于岗位讨论）</p>
                        <div className="flex flex-wrap gap-2">
                          {scoreRanking.map((item, index) => (
                            <Badge
                              key={item.dim}
                              variant={index === 0 ? 'default' : 'outline'}
                              className="font-normal"
                            >
                              {index + 1}. {item.dim} {item.score}%
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 判定置信度 */}
              {resolvedConfidence && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">判定置信度</h3>
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            CONFIDENCE_LEVEL_META[
                              resolvedConfidence.level as keyof typeof CONFIDENCE_LEVEL_META
                            ]?.variant || 'outline'
                          }
                        >
                          {
                            CONFIDENCE_LEVEL_META[
                              resolvedConfidence.level as keyof typeof CONFIDENCE_LEVEL_META
                            ]?.label || resolvedConfidence.level
                          }
                        </Badge>
                        <span className="text-sm">
                          置信分 {resolvedConfidence.score}/100
                        </span>
                        <span className="text-xs text-muted-foreground">
                          主次分差 {resolvedConfidence.gap}
                        </span>
                      </div>
                      <Progress value={resolvedConfidence.score} />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {resolvedConfidence.reason}
                      </p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* DISC 四维分数 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">DISC 四维分数</h3>
                <div className="grid grid-cols-4 gap-3">
                  {(['D', 'I', 'S', 'C'] as DISCDimension[]).map((dim) => {
                    const config = DISC_TYPE_CONFIG[dim]
                    const score = detail.result.scores[dim]
                    return (
                      <Card key={dim} className={`${DIMENSION_COLORS[dim]} border`}>
                        <CardContent className="p-3 text-center">
                          <div className="text-xs font-medium mb-1">
                            {dim} - {config.label}
                          </div>
                          <div className="text-2xl font-bold">{Math.round(score)}%</div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* 三图折线图 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">DISC 分析图表</h3>
                <DiscResultCharts result={detail.result} />
              </div>

              <Separator />

              {/* 岗位适配与管理动作 */}
              {primaryCode && primaryGuide && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">岗位适配与管理动作建议</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md border p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">建议优先匹配场景</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {primaryGuide.roleFit.map((item, idx) => (
                            <li key={idx}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-md border p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">管理风险预警</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {primaryGuide.riskSignals.map((item, idx) => (
                            <li key={idx}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="rounded-md border p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">建议的入职前90天观察点</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {primaryGuide.first90Days.map((item, idx) => (
                          <li key={idx}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 三图差异解读 */}
              {graphInsight && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">三图差异解读（管理关注）</h3>
                    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                      <p className="text-sm leading-relaxed">
                        外在行为主导维度为
                        <span className="font-semibold">
                          {' '}
                          {graphInsight.externalTop}（{DISC_TYPE_CONFIG[graphInsight.externalTop].label}）
                        </span>
                        ，内在核心主导维度为
                        <span className="font-semibold">
                          {' '}
                          {graphInsight.internalTop}（{DISC_TYPE_CONFIG[graphInsight.internalTop].label}）
                        </span>
                        ，自我形象主导维度为
                        <span className="font-semibold">
                          {' '}
                          {graphInsight.selfImageTop}（{DISC_TYPE_CONFIG[graphInsight.selfImageTop].label}）
                        </span>
                        。
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        外在与内在差异最大的维度是 {graphInsight.strongestShift.dim}，
                        {graphInsight.strongestShift.delta >= 0 ? '外在表现高于内在需求' : '内在需求高于外在表现'}约
                        {' '}
                        {Math.abs(graphInsight.strongestShift.delta)} 分，
                        当前适应压力指标为 {graphInsight.pressureIndex}（{getPressureLabel(graphInsight.pressureIndex)}）。
                      </p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 面试追问建议 */}
              {interviewChecklist.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">面试追问建议（供HR/用人经理）</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      {interviewChecklist.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ol>
                  </div>
                  <Separator />
                </>
              )}

              {/* 复合倾向 */}
              {resolvedMixedType && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">复合倾向</h3>
                    <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{resolvedMixedType.code}</Badge>
                        <Badge variant="secondary">{resolvedMixedType.tendencyLabel}</Badge>
                        <span className="text-xs text-muted-foreground">
                          分差 {resolvedMixedType.gap}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{resolvedMixedType.description}</p>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 四维解读 */}
              {detail.result.interpretation && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">四维解读</h3>
                    <div className="space-y-2">
                      {(['D', 'I', 'S', 'C'] as DISCDimension[]).map((dim) => {
                        const config = DISC_TYPE_CONFIG[dim]
                        const text = detail.result.interpretation?.[dim]
                        if (!text) return null
                        return (
                          <div key={dim} className="rounded-md border p-3">
                            <p className="text-xs font-medium" style={{ color: config.color }}>
                              {dim} - {config.label}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                              {text}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 原始计分明细 */}
              {detail.result.rawData && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">原始计分明细</h3>
                    <div className="rounded-md border overflow-hidden">
                      <div className="grid grid-cols-5 bg-muted/30 px-3 py-2 text-xs font-medium">
                        <span>维度</span>
                        <span className="text-center">Most</span>
                        <span className="text-center">Least</span>
                        <span className="text-center">Raw</span>
                        <span className="text-center">Percentile</span>
                      </div>
                      {(['D', 'I', 'S', 'C'] as DISCDimension[]).map((dim) => (
                        <div key={dim} className="grid grid-cols-5 border-t px-3 py-2 text-xs">
                          <span className="font-medium">{dim}</span>
                          <span className="text-center">{detail.result.rawData?.mostCounts?.[dim] ?? '-'}</span>
                          <span className="text-center">{detail.result.rawData?.leastCounts?.[dim] ?? '-'}</span>
                          <span className="text-center">{detail.result.rawData?.rawScores?.[dim] ?? '-'}</span>
                          <span className="text-center">{detail.result.scores?.[dim] ?? '-'}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 主要类型描述 */}
              {detail.result.primaryType && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">主要类型描述</h3>
                    <p className="text-sm text-muted-foreground">
                      {detail.result.primaryType.description}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* 行为特征 */}
              {detail.result.characteristics && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">行为特征</h3>
                    <div className="flex flex-wrap gap-2">
                      {(detail.result.characteristics.primary || []).map((item, i) => (
                        <Badge key={i} variant="secondary">{item}</Badge>
                      ))}
                      {(detail.result.characteristics.secondary || []).map((item, i) => (
                        <Badge key={`s-${i}`} variant="outline">{item}</Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 沟通建议 */}
              {detail.result.communicationAdvice && detail.result.communicationAdvice.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">沟通建议</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {detail.result.communicationAdvice.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                </>
              )}

              {/* 潜在挑战 */}
              {detail.result.potentialChallenges && detail.result.potentialChallenges.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">潜在挑战</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {detail.result.potentialChallenges.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              无数据
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Main>
  )
}
