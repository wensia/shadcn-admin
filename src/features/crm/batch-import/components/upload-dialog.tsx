/**
 * 上传文件弹窗
 * 从 frontend-vue/src/views/crm/BatchImportView.vue 迁移
 */

import { useState, useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react'

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

import { batchImportApi } from '../api'

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UploadDialog({ open, onOpenChange, onSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [batchDescription, setBatchDescription] = useState('')
  const [startRow, setStartRow] = useState<number | ''>('')
  const [importCount, setImportCount] = useState<number | ''>('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 上传 mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('请选择文件')
      return batchImportApi.uploadFile(file, {
        batchDescription,
        startRow: startRow || undefined,
        importCount: importCount || undefined,
        onProgress: setUploadProgress,
      })
    },
    onSuccess: () => {
      toast.success('上传成功')
      handleClose()
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message || '上传失败')
    },
  })

  // 关闭弹窗并重置状态
  const handleClose = useCallback(() => {
    setFile(null)
    setBatchDescription('')
    setStartRow('')
    setImportCount('')
    setUploadProgress(0)
    onOpenChange(false)
  }, [onOpenChange])

  // 选择文件
  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (selectedFile) {
      // 验证文件类型
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
    // 清空 input 以允许重复选择相同文件
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>上传导入文件</DialogTitle>
        </DialogHeader>

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
              />
              <p className="text-xs text-muted-foreground">限制导入的记录数</p>
            </div>
          </div>

          {/* 上传进度 */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploadMutation.isPending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传中
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                上传
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
