/**
 * 批量导入页面
 * 从 frontend-vue/src/views/crm/BatchImportView.vue 迁移
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { batchImportApi } from './api'
import type {
  BatchImportItem,
  BatchImportQueryParams,
  BatchStatus,
  ImportMethod,
} from './types'
import {
  batchStatusLabels,
  importMethodLabels,
} from './types'

import { UploadDialog } from './components/upload-dialog'
import { FailuresDialog } from './components/failures-dialog'
import { ActivatedLeadsDialog } from './components/activated-leads-dialog'
import { EditBatchDialog } from './components/edit-batch-dialog'

// 状态选项
const statusOptions = [
  { value: 'processing', label: '处理中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
]

// 导入方式选项
const methodOptions = [
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
  { value: 'manual', label: '手动' },
  { value: 'api', label: 'API' },
]

// 格式化处理耗时
function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分`
}

// 状态徽章组件
function StatusBadge({ status }: { status: BatchStatus }) {
  const variants: Record<BatchStatus, 'default' | 'secondary' | 'destructive'> = {
    processing: 'secondary',
    completed: 'default',
    failed: 'destructive',
  }
  const icons: Record<BatchStatus, React.ReactNode> = {
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    completed: <CheckCircle className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
  }
  return (
    <Badge variant={variants[status]} className="gap-1">
      {icons[status]}
      {batchStatusLabels[status]}
    </Badge>
  )
}

// 导入方式徽章
function MethodBadge({ method }: { method: ImportMethod }) {
  return (
    <Badge variant="outline">{importMethodLabels[method]}</Badge>
  )
}

export function BatchImportPage() {
  useDocumentTitle('批量导入')
  const queryClient = useQueryClient()

  // 搜索状态
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [methodFilter, setMethodFilter] = useState<string>('')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 })

  // 弹窗状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [failuresDialogOpen, setFailuresDialogOpen] = useState(false)
  const [activatedDialogOpen, setActivatedDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<BatchImportItem | null>(null)

  // 构建查询参数
  const queryParams = useMemo<BatchImportQueryParams>(() => ({
    page: pagination.page,
    page_size: pagination.pageSize,
    search: searchValue || undefined,
    status: (statusFilter || undefined) as BatchStatus | undefined,
    import_method: (methodFilter || undefined) as ImportMethod | undefined,
  }), [pagination, searchValue, statusFilter, methodFilter])

  // 获取批量导入列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['batch-imports', queryParams],
    queryFn: () => batchImportApi.getList(queryParams),
  })

  const batchList = data?.data?.items || []
  const totalCount = data?.data?.total || 0

  // 是否有处理中的批次
  const hasProcessingBatches = useMemo(
    () => batchList.some((item) => item.status === 'processing'),
    [batchList]
  )

  // 删除批次
  const deleteMutation = useMutation({
    mutationFn: batchImportApi.deleteBatch,
    onSuccess: () => {
      toast.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // 下载模板
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await batchImportApi.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '线索导入模板.xlsx'
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('模板下载成功')
    } catch (error: unknown) {
      toast.error((error as Error).message || '下载失败')
    }
  }, [])

  // 删除处理中的批次
  const handleDeleteProcessingBatches = useCallback(async () => {
    const processingIds = batchList
      .filter((item) => item.status === 'processing')
      .map((item) => item.id)

    if (processingIds.length === 0) {
      toast.warning('没有处理中的批次')
      return
    }

    try {
      await batchImportApi.deleteProcessingBatches(processingIds)
      toast.success(`已删除 ${processingIds.length} 个处理中的批次`)
      queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
    } catch (error: unknown) {
      toast.error((error as Error).message || '删除失败')
    }
  }, [batchList, queryClient])

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchValue('')
    setStatusFilter('')
    setMethodFilter('')
    setPagination({ page: 1, pageSize: 20 })
  }, [])

  // 查看失败记录
  const handleViewFailures = useCallback((batch: BatchImportItem) => {
    setSelectedBatch(batch)
    setFailuresDialogOpen(true)
  }, [])

  // 查看激活线索
  const handleViewActivated = useCallback((batch: BatchImportItem) => {
    setSelectedBatch(batch)
    setActivatedDialogOpen(true)
  }, [])

  // 编辑批次
  const handleEditBatch = useCallback((batch: BatchImportItem) => {
    setSelectedBatch(batch)
    setEditDialogOpen(true)
  }, [])

  // 上传成功回调
  const handleUploadSuccess = useCallback(() => {
    setUploadDialogOpen(false)
    queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
  }, [queryClient])

  // 是否有筛选条件
  const isFiltered = searchValue || statusFilter || methodFilter

  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">批量导入</h1>
      </Header>

      <Main fixed className="flex flex-1 flex-col gap-4">
        {/* 标题行：左边标题，右边操作按钮 */}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">批量导入记录</h2>
            <p className="text-muted-foreground">管理线索批量导入任务</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8" onClick={() => setUploadDialogOpen(true)}>
              上传文件
              <Upload className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleDownloadTemplate}>
              下载模板
              <Download className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={handleDeleteProcessingBatches}
              disabled={!hasProcessingBatches}
            >
              删除处理中批次
              <Trash2 className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 筛选工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2">
            <Input
              placeholder="搜索批次名称或文件名"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="h-8 w-[150px] lg:w-[250px]"
            />
            <div className="flex gap-x-2">
              <Select value={statusFilter || 'all'} onValueChange={(v) => {
                setStatusFilter(v === 'all' ? '' : v)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={methodFilter || 'all'} onValueChange={(v) => {
                setMethodFilter(v === 'all' ? '' : v)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="导入方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部方式</SelectItem>
                  {methodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={handleReset}
                className="h-8 px-2 lg:px-3"
              >
                重置
                <Cross2Icon className="ms-2 h-4 w-4" />
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 数据表格 */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-md border">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[160px]">批次名称</TableHead>
                  <TableHead className="w-[120px]">导入方式</TableHead>
                  <TableHead className="w-[160px]">文件名</TableHead>
                  <TableHead className="w-[80px] text-right">总数量</TableHead>
                  <TableHead className="w-[80px] text-right">成功数</TableHead>
                  <TableHead className="w-[80px] text-right">激活数</TableHead>
                  <TableHead className="w-[80px] text-right">失败数</TableHead>
                  <TableHead className="w-[120px]">成功率</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead className="w-[100px]">创建人</TableHead>
                  <TableHead className="w-[160px]">开始时间</TableHead>
                  <TableHead className="w-[100px]">耗时</TableHead>
                  <TableHead className="w-[140px] sticky right-0 bg-background shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : batchList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  batchList.map((batch) => {
                    const successRate = batch.total_count > 0
                      ? Math.round((batch.success_count / batch.total_count) * 100)
                      : 0
                    return (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block max-w-[150px]">
                                  {batch.batch_name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{batch.batch_name}</p>
                                {batch.batch_description && (
                                  <p className="text-muted-foreground">{batch.batch_description}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <MethodBadge method={batch.import_method} />
                        </TableCell>
                        <TableCell>
                          <span className="truncate block max-w-[150px]">
                            {batch.import_source_file || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{batch.total_count}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {batch.success_count}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600">
                          {batch.activated_count}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {batch.failed_count}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={successRate}
                              className="h-2 w-16"
                            />
                            <span className="text-xs">{successRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={batch.status} />
                        </TableCell>
                        <TableCell>{batch.created_by_name}</TableCell>
                        <TableCell>
                          {batch.started_at
                            ? format(new Date(batch.started_at), 'yyyy-MM-dd HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell>{formatDuration(batch.processing_duration)}</TableCell>
                        <TableCell className="sticky right-0 bg-background shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center gap-1">
                            {batch.failed_count > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleViewFailures(batch)}
                                    >
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>查看失败记录</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {batch.activated_count > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleViewActivated(batch)}
                                    >
                                      <Eye className="h-4 w-4 text-yellow-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>查看激活线索</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditBatch(batch)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>编辑批次</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between mt-auto">
          <span className="text-sm text-muted-foreground">
            共 {totalCount} 条记录
          </span>
          <div className="flex items-center space-x-2">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) => setPagination((p) => ({ ...p, pageSize: Number(v), page: 1 }))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                上一页
              </Button>
              <span className="px-2 text-sm">
                {pagination.page} / {Math.ceil(totalCount / pagination.pageSize) || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={pagination.page >= Math.ceil(totalCount / pagination.pageSize)}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      </Main>

      {/* 弹窗组件 */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={handleUploadSuccess}
      />
      <FailuresDialog
        open={failuresDialogOpen}
        onOpenChange={setFailuresDialogOpen}
        batch={selectedBatch}
      />
      <ActivatedLeadsDialog
        open={activatedDialogOpen}
        onOpenChange={setActivatedDialogOpen}
        batch={selectedBatch}
      />
      <EditBatchDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        batch={selectedBatch}
        onSuccess={() => {
          setEditDialogOpen(false)
          queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
        }}
      />
    </>
  )
}
