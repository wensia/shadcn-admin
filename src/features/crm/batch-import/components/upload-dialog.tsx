/**
 * 上传文件弹窗
 * 支持同步/异步模式，显示处理进度
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle, XCircle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'

import { cn } from '@/lib/utils'
import { useStyleClasses } from '@/lib/style-utils'
import { useAuthStore } from '@/stores/auth-store'
import { batchImportApi } from '../api'
import type { UploadResponse } from '../types'

// 处理阶段类型
type Phase = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UploadDialog({ open, onOpenChange, onSuccess }: UploadDialogProps) {
  const s = useStyleClasses()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  // 文件和表单状态
  const [file, setFile] = useState<File | null>(null)
  const [batchDescription, setBatchDescription] = useState('')
  const [startRow, setStartRow] = useState<number | ''>('')
  const [importCount, setImportCount] = useState<number | ''>('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理阶段状态
  const [phase, setPhase] = useState<Phase>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 轮询进度查询（异步模式时使用）
  const { data: progressData } = useQuery({
    queryKey: ['batch-progress', processingBatchId],
    queryFn: () => batchImportApi.getProgress(processingBatchId!),
    enabled: !!processingBatchId && phase === 'processing',
    refetchInterval: 2000,  // 每2秒轮询一次
    refetchIntervalInBackground: false,
  })

  // 监听进度完成
  useEffect(() => {
    if (!progressData?.data) return

    const status = progressData.data.status
    if (status === 'completed') {
      setPhase('completed')
      setProcessingBatchId(null)
      // 更新结果数据
      setUploadResult(prev => prev ? {
        ...prev,
        success_count: progressData.data.success_count,
        failed_count: progressData.data.failed_count,
        status: 'completed',
      } : null)
    } else if (status === 'failed') {
      setPhase('failed')
      setProcessingBatchId(null)
      setErrorMessage(progressData.data.error_message || '处理失败')
    }
  }, [progressData])

  // 上传 mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('请选择文件')
      if (!user?.campus_id) throw new Error('无法获取校区信息，请重新登录')

      setPhase('uploading')
      setUploadProgress(0)
      setErrorMessage(null)

      return batchImportApi.uploadFile(file, user.campus_id, {
        batchDescription,
        startRow: startRow || undefined,
        importCount: importCount || undefined,
        onProgress: setUploadProgress,
      })
    },
    onSuccess: (response) => {
      if (!response.success) {
        setPhase('failed')
        setErrorMessage(response.message || '上传失败')
        return
      }

      const result = response.data
      setUploadResult(result)

      if (result.mode === 'sync') {
        // 同步模式：直接完成
        setPhase('completed')
        queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
      } else {
        // 异步模式：开始轮询进度
        setPhase('processing')
        setProcessingBatchId(result.batch_id)
        toast.info(`数据量较大(${result.total_count}条)，正在后台处理...`)
      }
    },
    onError: (error: Error) => {
      setPhase('failed')
      setErrorMessage(error.message || '上传失败')
    },
  })

  // 重置状态
  const resetState = useCallback(() => {
    setFile(null)
    setBatchDescription('')
    setStartRow('')
    setImportCount('')
    setUploadProgress(0)
    setPhase('idle')
    setUploadResult(null)
    setProcessingBatchId(null)
    setErrorMessage(null)
  }, [])

  // 关闭弹窗
  const handleClose = useCallback(() => {
    // 如果正在处理中，给出提示
    if (phase === 'processing') {
      toast.info('正在后台处理，关闭弹窗后可在列表中查看进度')
    }

    // 如果完成了，刷新列表
    if (phase === 'completed' || phase === 'failed') {
      queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
      onSuccess?.()
    }

    resetState()
    onOpenChange(false)
  }, [phase, queryClient, onSuccess, resetState, onOpenChange])

  // 选择文件
  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ]
      const validExtensions = ['.xlsx', '.xls', '.csv']
      const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'))

      if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(ext)) {
        toast.error('请选择 Excel 或 CSV 文件')
        return
      }

      setFile(selectedFile)
    }
  }, [])

  // 文件输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    handleFileSelect(selectedFile)
    e.target.value = ''
  }, [handleFileSelect])

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0] || null
    handleFileSelect(droppedFile)
  }, [handleFileSelect])

  // 移除文件
  const handleRemoveFile = useCallback(() => {
    setFile(null)
  }, [])

  // 提交上传
  const handleSubmit = useCallback(() => {
    uploadMutation.mutate()
  }, [uploadMutation])

  // 重试
  const handleRetry = useCallback(() => {
    resetState()
  }, [resetState])

  // 计算处理进度百分比
  const getProcessingPercent = () => {
    if (!progressData?.data?.progress) return 0
    const { success_count = 0, failed_count = 0, total_count = 0 } = progressData.data.progress
    if (total_count === 0) return 0
    return Math.round(((success_count + failed_count) / total_count) * 100)
  }

  // 渲染不同阶段的内容
  const renderContent = () => {
    switch (phase) {
      case 'uploading':
        return (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <p className="font-medium">正在上传文件...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
            </div>
          </div>
        )

      case 'processing':
        return (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <p className="font-medium">正在处理数据...</p>
              <Progress value={getProcessingPercent()} className="w-full" />
              {progressData?.data?.progress && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {progressData.data.progress.message || '处理中...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    成功: {progressData.data.progress.success_count || 0} |
                    失败: {progressData.data.progress.failed_count || 0} |
                    总计: {progressData.data.progress.total_count || uploadResult?.total_count || 0}
                  </p>
                </>
              )}
            </div>
          </div>
        )

      case 'completed':
        return (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <div className="space-y-2">
              <p className="font-medium text-green-600">导入完成</p>
              {uploadResult && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>总数: {uploadResult.total_count} 条</p>
                  <p className="text-green-600">成功: {uploadResult.success_count || 0} 条</p>
                  {(uploadResult.activated_count || 0) > 0 && (
                    <p className="text-yellow-600">激活: {uploadResult.activated_count} 条</p>
                  )}
                  {(uploadResult.failed_count || 0) > 0 && (
                    <p className="text-red-600">失败: {uploadResult.failed_count} 条</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )

      case 'failed':
        return (
          <div className="space-y-4 py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <div className="space-y-2">
              <p className="font-medium text-red-600">导入失败</p>
              <p className="text-sm text-muted-foreground">{errorMessage || '未知错误'}</p>
            </div>
          </div>
        )

      default:
        // idle 状态：显示文件选择界面
        return (
          <div className="space-y-4 py-4">
            {/* 批次备注 */}
            <div className="space-y-2">
              <Label htmlFor="batchDescription">批次备注</Label>
              <Textarea
                id="batchDescription"
                placeholder="可选，添加批次备注信息"
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* 文件上传区域 */}
            <div className="space-y-2">
              <Label>选择文件</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleInputChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFile()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      拖拽文件到此处，或<span className="text-primary">点击选择</span>
                    </p>
                    <p className="text-xs text-muted-foreground">支持 .xlsx, .xls, .csv 格式</p>
                  </div>
                )}
              </div>
            </div>

            {/* 高级选项 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startRow">起始行号</Label>
                <Input
                  id="startRow"
                  type="number"
                  min={1}
                  placeholder="默认从第2行开始"
                  value={startRow}
                  onChange={(e) => setStartRow(e.target.value ? Number(e.target.value) : '')}
                  className={s.height.controlSm}
                />
                <p className="text-xs text-muted-foreground">跳过表头的行数</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="importCount">导入条数</Label>
                <Input
                  id="importCount"
                  type="number"
                  min={1}
                  placeholder="默认导入全部"
                  value={importCount}
                  onChange={(e) => setImportCount(e.target.value ? Number(e.target.value) : '')}
                  className={s.height.controlSm}
                />
                <p className="text-xs text-muted-foreground">限制导入的记录数</p>
              </div>
            </div>
          </div>
        )
    }
  }

  // 渲染底部按钮
  const renderFooter = () => {
    switch (phase) {
      case 'idle':
        return (
          <>
            <Button variant="outline" size="sm" className={s.height.controlSm} onClick={handleClose}>
              取消
            </Button>
            <Button size="sm" className={s.height.controlSm} onClick={handleSubmit} disabled={!file}>
              <Upload className={cn("mr-2", s.size.icon)} />
              上传
            </Button>
          </>
        )

      case 'uploading':
      case 'processing':
        return (
          <Button variant="outline" size="sm" className={s.height.controlSm} onClick={handleClose}>
            关闭（后台继续处理）
          </Button>
        )

      case 'completed':
        return (
          <Button size="sm" className={s.height.controlSm} onClick={handleClose}>
            完成
          </Button>
        )

      case 'failed':
        return (
          <>
            <Button variant="outline" size="sm" className={s.height.controlSm} onClick={handleClose}>
              关闭
            </Button>
            <Button size="sm" className={s.height.controlSm} onClick={handleRetry}>
              重试
            </Button>
          </>
        )
    }
  }

  // 获取弹窗标题
  const getTitle = () => {
    switch (phase) {
      case 'uploading': return '上传中'
      case 'processing': return '处理中'
      case 'completed': return '导入完成'
      case 'failed': return '导入失败'
      default: return '上传导入文件'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {renderContent()}

        <DialogFooter>
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
