/**
 * DISC性格测试管理页面
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import {
  getTempDiscRecords,
  getTempDiscRecordDetail,
  createDiscTestLink,
  getDiscTestLinks,
  deleteDiscTestLink,
} from '@/features/disc/api'
import type {
  TempDISCRecordListItem,
  TempDISCRecordDetail,
  DiscTestLink,
  DISCDimension,
} from '@/features/disc/types'
import { DISC_TYPE_CONFIG } from '@/features/disc/types'
import { DiscResultCharts } from '@/features/disc/components/disc-result-charts'
import { showApiErrorToast } from '@/lib/api/error-toast'

function formatTime(time: string) {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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
    queryKey: ['disc-records', page, pageSize, searchName, searchPhone],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (searchName) params.name = searchName
      if (searchPhone) params.phone = searchPhone
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
    try {
      await navigator.clipboard.writeText(url)
      toast.success('链接已复制到剪贴板')
    } catch {
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
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                待填写测试链接
                <Badge variant="secondary">{pendingLinks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                      }))
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
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>DISC测试详情</SheetTitle>
          </SheetHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              加载中...
            </div>
          ) : detail ? (
            <div className="space-y-6 mt-6">
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
                  <div className="text-muted-foreground">主要类型</div>
                  <div>
                    <DiscTypeBadge type={detail.result.primaryType?.code} />
                  </div>
                </div>
              </div>

              <Separator />

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
                      {detail.result.characteristics.primary.map((item, i) => (
                        <Badge key={i} variant="secondary">{item}</Badge>
                      ))}
                      {detail.result.characteristics.secondary.map((item, i) => (
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
