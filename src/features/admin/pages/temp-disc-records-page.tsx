/**
 * 临时DISC记录页面
 */

import { useState } from 'react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Eye, Loader2 } from 'lucide-react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimplePagination } from '@/components/data-table/simple-pagination'
import { getTempDiscRecords, getTempDiscRecordDetail } from '@/features/disc/api'
import { DISC_TYPE_CONFIG } from '@/features/disc/types'
import type { DISCDimension } from '@/features/disc/types'

function formatTime(time: string | null): string {
  if (!time) return '-'
  const utcTime = time.endsWith('Z') || time.includes('+') ? time : time + 'Z'
  return new Date(utcTime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DiscTypeBadge({ type }: { type?: string }) {
  if (!type) return <span className="text-muted-foreground">-</span>
  const config = DISC_TYPE_CONFIG[type as DISCDimension]
  if (!config) return <Badge variant="outline">{type}</Badge>
  return (
    <Badge
      style={{ backgroundColor: config.bgColor, color: config.color, borderColor: config.color }}
    >
      {type} - {config.label}
    </Badge>
  )
}

function MigrationBadge({ migrated }: { migrated: boolean }) {
  return migrated ? (
    <Badge variant="default" className="bg-green-600">已迁移</Badge>
  ) : (
    <Badge variant="secondary">未迁移</Badge>
  )
}

interface Filters {
  name: string
  phone: string
  migrationStatus: string
}

interface AppliedFilter {
  key: keyof Filters
  label: string
  displayValue: string
}

export function TempDiscRecordsPage() {
  useDocumentTitle('临时DISC记录')

  // 筛选状态
  const [filters, setFilters] = useState<Filters>({
    name: '',
    phone: '',
    migrationStatus: 'all',
  })
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    name: '',
    phone: '',
    migrationStatus: 'all',
  })

  // 分页状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // 详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  // 列表查询
  const { data, isLoading } = useQuery({
    queryKey: ['temp-disc-records', page, pageSize, appliedFilters],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, size: pageSize }
      if (appliedFilters.name) params.name = appliedFilters.name
      if (appliedFilters.phone) params.phone = appliedFilters.phone
      if (appliedFilters.migrationStatus === 'migrated') params.is_migrated = true
      if (appliedFilters.migrationStatus === 'not_migrated') params.is_migrated = false
      const response = await getTempDiscRecords(params)
      return response.data
    },
  })

  // 详情查询
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['temp-disc-record-detail', detailId],
    queryFn: async () => {
      const response = await getTempDiscRecordDetail(detailId!)
      return response.data
    },
    enabled: !!detailId && detailOpen,
  })

  const items = data?.items || []
  const total = data?.total || 0

  // 搜索
  const handleSearch = () => {
    setAppliedFilters({ ...filters })
    setPage(1)
  }

  // 重置
  const handleReset = () => {
    const empty: Filters = { name: '', phone: '', migrationStatus: 'all' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  // 移除单个筛选
  const removeFilter = (key: keyof Filters) => {
    const defaultVal = key === 'migrationStatus' ? 'all' : ''
    const newFilters = { ...appliedFilters, [key]: defaultVal }
    setFilters(newFilters)
    setAppliedFilters(newFilters)
    setPage(1)
  }

  // 已应用的筛选标签列表
  const appliedFilterTags: AppliedFilter[] = []
  if (appliedFilters.name) {
    appliedFilterTags.push({ key: 'name', label: '姓名', displayValue: appliedFilters.name })
  }
  if (appliedFilters.phone) {
    appliedFilterTags.push({ key: 'phone', label: '手机号', displayValue: appliedFilters.phone })
  }
  if (appliedFilters.migrationStatus !== 'all') {
    appliedFilterTags.push({
      key: 'migrationStatus',
      label: '迁移状态',
      displayValue: appliedFilters.migrationStatus === 'migrated' ? '已迁移' : '未迁移',
    })
  }

  // 查看详情
  const handleViewDetail = (id: string) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  const handleDetailClose = (open: boolean) => {
    setDetailOpen(open)
    if (!open) setDetailId(null)
  }

  return (
    <Main fixed>
      <div className="flex h-full flex-col gap-4">
        {/* 标题栏 */}
        <div>
          <h1 className="text-2xl font-bold">临时DISC记录</h1>
          <p className="text-sm text-muted-foreground">
            查看临时DISC测试记录
          </p>
        </div>

        {/* 搜索筛选区 */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">姓名</Label>
            <Input
              placeholder="输入姓名"
              value={filters.name}
              onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">手机号</Label>
            <Input
              placeholder="输入手机号"
              value={filters.phone}
              onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">迁移状态</Label>
            <Select
              value={filters.migrationStatus}
              onValueChange={(value) => setFilters((f) => ({ ...f, migrationStatus: value }))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="not_migrated">未迁移</SelectItem>
                <SelectItem value="migrated">已迁移</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch}>
              <Search className="mr-1 h-4 w-4" />
              搜索
            </Button>
            <Button variant="outline" onClick={handleReset}>
              重置
            </Button>
          </div>
        </div>

        {/* 已应用的筛选标签 */}
        {appliedFilterTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">已筛选:</span>
            {appliedFilterTags.map((tag) => (
              <Badge key={tag.key} variant="secondary" className="gap-1 pr-1">
                {tag.label}: {tag.displayValue}
                <button
                  onClick={() => removeFilter(tag.key)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* 数据表格 */}
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead className="text-center">D型分</TableHead>
                <TableHead className="text-center">I型分</TableHead>
                <TableHead className="text-center">S型分</TableHead>
                <TableHead className="text-center">C型分</TableHead>
                <TableHead>主导类型</TableHead>
                <TableHead>迁移状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      加载中...
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.phone || '-'}</TableCell>
                    <TableCell>{formatTime(item.submitted_at)}</TableCell>
                    <TableCell className="text-center">{item.d_score ?? '-'}</TableCell>
                    <TableCell className="text-center">{item.i_score ?? '-'}</TableCell>
                    <TableCell className="text-center">{item.s_score ?? '-'}</TableCell>
                    <TableCell className="text-center">{item.c_score ?? '-'}</TableCell>
                    <TableCell>
                      <DiscTypeBadge type={item.primary_type} />
                    </TableCell>
                    <TableCell>
                      <MigrationBadge migrated={item.is_migrated} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(item.id)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
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
            isLoading={isLoading}
          />
        )}
      </div>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={handleDetailClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>DISC记录详情</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : detail ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">姓名</Label>
                  <p className="font-medium">{detail.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">手机号</Label>
                  <p>{detail.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">提交时间</Label>
                  <p>{formatTime(detail.submitted_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">测试记录ID</Label>
                  <p className="font-mono text-xs">{detail.test_record_id || '-'}</p>
                </div>
              </div>

              <div className="rounded-md border p-3">
                <Label className="text-muted-foreground mb-2 block">DISC 分数</Label>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {(['D', 'I', 'S', 'C'] as const).map((dim) => {
                    const config = DISC_TYPE_CONFIG[dim]
                    const score = detail.result?.scores?.[dim]
                    return (
                      <div key={dim} className="rounded-md border p-2">
                        <div className="text-lg font-bold" style={{ color: config.color }}>
                          {score ?? '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dim} - {config.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">主导类型</Label>
                  <div className="mt-1">
                    <DiscTypeBadge type={detail.result?.primaryType?.code} />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">迁移状态</Label>
                  <div className="mt-1">
                    <MigrationBadge migrated={detail.is_migrated} />
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP地址</Label>
                  <p className="font-mono text-xs">{detail.ip_address || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">备注</Label>
                  <p>{detail.notes || '-'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              加载失败
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Main>
  )
}
