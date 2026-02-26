/**
 * DISC性格测试管理页面
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import QRCode from 'qrcode'
import { Search, RefreshCw, Copy, Eye, QrCode, ChevronDown } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import {
  getTempDiscRecords,
  getTempDiscRecordDetail,
} from '@/features/disc/api'
import {
  DISC_TYPE_CONFIG,
  type TempDISCRecordListItem,
  type DISCDimension,
} from '@/features/disc/types'
import { DiscDetailDrawer } from '@/features/disc/components/disc-detail-drawer'
import { cn, copyToClipboard } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

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

const CONFIDENCE_LEVEL_META = {
  high: { label: '高置信', variant: 'default' as const },
  medium: { label: '中置信', variant: 'secondary' as const },
  low: { label: '低置信', variant: 'outline' as const },
}

// 固定测试链接弹窗（二维码 + 复制链接）
function FixedLinkDialog({
  open,
  onOpenChange,
  url,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrReady, setQrReady] = useState(false)

  useEffect(() => {
    if (!open || !url) {
      setQrReady(false)
      return
    }
    // 延迟一帧确保 canvas 已挂载到 DOM
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
          (err) => {
            if (!err) setQrReady(true)
          }
        )
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [open, url])

  const handleCopy = async () => {
    const ok = await copyToClipboard(url)
    if (ok) {
      toast.success('链接已复制到剪贴板')
    } else {
      toast.error('复制失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            DISC 测试链接
          </DialogTitle>
        </DialogHeader>

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
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleCopy}
              title="复制链接"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            复制链接
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        <DiscTypeBadge type={record.primary_type} />
      </div>

      {/* 第2行：手机号 + 置信度 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{record.phone || '未填写手机号'}</span>
        {confidenceMeta && (
          <div className="flex items-center gap-1">
            <Badge variant={confidenceMeta.variant} className="text-[10px] px-1.5 py-0">
              {confidenceMeta.label}
            </Badge>
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

      {/* 第4行：时间 + 复合倾向 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatTime(record.submitted_at)}</span>
        {record.has_mixed_type && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {record.mixed_type_code || '复合型'}
          </Badge>
        )}
      </div>
    </div>
  )
}

export function DiscTestPage() {
  useDocumentTitle('DISC性格测试')
  const queryClient = useQueryClient()
  const username = useAuthStore((state) => state.user?.username ?? '')

  // 搜索
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [mixedTypeFilter, setMixedTypeFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 移动端筛选折叠
  const [filterOpen, setFilterOpen] = useState(false)
  // 固定链接二维码弹窗
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

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
  const detail = detailData || null
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
    queryClient.invalidateQueries({ queryKey: ['disc-records'] })
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
            <h1 className="text-xl sm:text-2xl font-bold">DISC性格测试</h1>
            <p className="hidden sm:block text-sm text-muted-foreground">
              管理DISC性格测试记录和查看测试结果
            </p>
          </div>
          <Button onClick={() => setQrDialogOpen(true)}>
            <QrCode className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">测试链接</span>
            <span className="sm:hidden">链接</span>
          </Button>
        </div>

        {/* 搜索筛选区 - 桌面端 */}
        <div className="hidden sm:flex items-center gap-2">
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

        {/* 搜索筛选区 - 移动端（可折叠） */}
        <Collapsible open={filterOpen} onOpenChange={setFilterOpen} className="sm:hidden space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <ChevronDown className={cn("h-4 w-4 transition-transform", filterOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="icon" onClick={handleRefresh} className="shrink-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
              <Input
                placeholder="手机号"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select value={confidenceFilter} onValueChange={(value) => { setConfidenceFilter(value as typeof confidenceFilter); setPage(1) }}>
                  <SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="复合倾向" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部倾向</SelectItem>
                    <SelectItem value="yes">复合型</SelectItem>
                    <SelectItem value="no">单一型</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleSearch}>搜索</Button>
                <Button variant="ghost" className="flex-1" onClick={handleReset}>重置</Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 测试记录表格 - 桌面端 */}
        <div className="hidden sm:block flex-1 overflow-auto rounded-md border">
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

        {/* 测试记录卡片列表 - 移动端 */}
        <div className="sm:hidden flex-1 overflow-auto space-y-3">
          {loadingRecords ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-4 w-2/3" />
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

      {/* 固定测试链接弹窗 */}
      <FixedLinkDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        url={getFixedTestUrl(username)}
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
      />
    </Main>
  )
}
