/**
 * 上传文件弹窗
 * 支持同步/异步模式，显示处理进度
 * Semi Design 重构
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Input,
  Progress,
  Toast,
  TextArea,
} from '@douyinfe/semi-ui-19'
import {
  IconUpload,
  IconFile,
  IconClose,
  IconLoading,
  IconTickCircle,
  IconCrossCircleStroked,
} from '@douyinfe/semi-icons'

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
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  })

  // 监听进度完成
  useEffect(() => {
    if (!progressData?.data) return

    const status = progressData.data.status
    if (status === 'completed') {
      const timer = window.setTimeout(() => {
        setPhase('completed')
        setProcessingBatchId(null)
        setUploadResult(prev => prev ? {
          ...prev,
          success_count: progressData.data.success_count,
          failed_count: progressData.data.failed_count,
          status: 'completed',
        } : null)
      }, 0)
      return () => window.clearTimeout(timer)
    } else if (status === 'failed') {
      const timer = window.setTimeout(() => {
        setPhase('failed')
        setProcessingBatchId(null)
        setErrorMessage(progressData.data.error_message || '处理失败')
      }, 0)
      return () => window.clearTimeout(timer)
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
        setPhase('completed')
        queryClient.invalidateQueries({ queryKey: ['batch-imports'] })
      } else {
        setPhase('processing')
        setProcessingBatchId(result.batch_id)
        Toast.info({ content: `数据量较大(${result.total_count}条)，正在后台处理...` })
      }
    },
    onError: (error: Error) => {
      setPhase('failed')
      setErrorMessage(error.message || '上传失败')
    },
  })
  const { mutate: submitUpload } = uploadMutation

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
    if (phase === 'processing') {
      Toast.info({ content: '正在后台处理，关闭弹窗后可在列表中查看进度' })
    }

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
        Toast.error('请选择 Excel 或 CSV 文件')
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
    submitUpload()
  }, [submitUpload])

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

  // 渲染不同阶段的内容
  const renderContent = () => {
    switch (phase) {
      case 'uploading':
        return (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <IconLoading spin style={{ fontSize: 48, color: 'var(--semi-color-primary)' }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 500 }}>正在上传文件...</p>
              <Progress percent={uploadProgress} style={{ marginTop: 8 }} />
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', marginTop: 4 }}>{uploadProgress}%</p>
            </div>
          </div>
        )

      case 'processing':
        return (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <IconLoading spin style={{ fontSize: 48, color: 'var(--semi-color-primary)' }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 500 }}>正在处理数据...</p>
              <Progress percent={getProcessingPercent()} style={{ marginTop: 8 }} />
              {progressData?.data?.progress && (
                <>
                  <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', marginTop: 4 }}>
                    {progressData.data.progress.message || '处理中...'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 2 }}>
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
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <IconTickCircle style={{ fontSize: 48, color: 'var(--semi-color-success)' }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 500, color: 'var(--semi-color-success)' }}>导入完成</p>
              {uploadResult && (
                <div style={{ fontSize: 14, color: 'var(--semi-color-text-2)', marginTop: 8 }}>
                  <p>总数: {uploadResult.total_count} 条</p>
                  <p style={{ color: 'var(--semi-color-success)' }}>成功: {uploadResult.success_count || 0} 条</p>
                  {(uploadResult.activated_count || 0) > 0 && (
                    <p style={{ color: 'var(--semi-color-warning)' }}>激活: {uploadResult.activated_count} 条</p>
                  )}
                  {(uploadResult.failed_count || 0) > 0 && (
                    <p style={{ color: 'var(--semi-color-danger)' }}>失败: {uploadResult.failed_count} 条</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )

      case 'failed':
        return (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <IconCrossCircleStroked style={{ fontSize: 48, color: 'var(--semi-color-danger)' }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 500, color: 'var(--semi-color-danger)' }}>导入失败</p>
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', marginTop: 4 }}>{errorMessage || '未知错误'}</p>
            </div>
          </div>
        )

      default:
        // idle 状态：显示文件选择界面
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
            {/* 批次备注 */}
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 14 }}>批次备注</div>
              <TextArea
                placeholder="可选，添加批次备注信息"
                value={batchDescription}
                onChange={(val) => setBatchDescription(val)}
                rows={2}
              />
            </div>

            {/* 文件上传区域 */}
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 14 }}>选择文件</div>
              <div
                style={{
                  border: `2px dashed ${isDragging ? 'var(--semi-color-primary)' : 'var(--semi-color-border)'}`,
                  borderRadius: 8,
                  padding: 24,
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? 'var(--semi-color-primary-light-default)' : undefined,
                  transition: 'all 0.2s',
                }}
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
                  style={{ display: 'none' }}
                />

                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <IconFile style={{ fontSize: 32, color: 'var(--semi-color-success)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: 500 }}>{file.name}</p>
                      <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      theme="borderless"
                      icon={<IconClose />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFile()
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <IconUpload style={{ fontSize: 40, color: 'var(--semi-color-text-2)' }} />
                    <p style={{ color: 'var(--semi-color-text-2)', marginTop: 8 }}>
                      拖拽文件到此处，或<span style={{ color: 'var(--semi-color-primary)' }}>点击选择</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 4 }}>支持 .xlsx, .xls, .csv 格式</p>
                  </div>
                )}
              </div>
            </div>

            {/* 高级选项 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 14 }}>起始行号</div>
                <Input
                  type="number"
                  placeholder="默认从第2行开始"
                  value={startRow === '' ? '' : String(startRow)}
                  onChange={(val) => setStartRow(val ? Number(val) : '')}
                />
                <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 2 }}>跳过表头的行数</p>
              </div>
              <div>
                <div style={{ marginBottom: 4, fontWeight: 500, fontSize: 14 }}>导入条数</div>
                <Input
                  type="number"
                  placeholder="默认导入全部"
                  value={importCount === '' ? '' : String(importCount)}
                  onChange={(val) => setImportCount(val ? Number(val) : '')}
                />
                <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 2 }}>限制导入的记录数</p>
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
            <Button onClick={handleClose}>取消</Button>
            <Button theme="solid" icon={<IconUpload />} onClick={handleSubmit} disabled={!file}>
              上传
            </Button>
          </>
        )

      case 'uploading':
      case 'processing':
        return (
          <Button onClick={handleClose}>关闭（后台继续处理）</Button>
        )

      case 'completed':
        return (
          <Button theme="solid" onClick={handleClose}>完成</Button>
        )

      case 'failed':
        return (
          <>
            <Button onClick={handleClose}>关闭</Button>
            <Button theme="solid" onClick={handleRetry}>重试</Button>
          </>
        )
    }
  }

  return (
    <Modal
      visible={open}
      title={getTitle()}
      onCancel={handleClose}
      footer={renderFooter()}
      width={500}
      closable={true}
      maskClosable={false}
    >
      {renderContent()}
    </Modal>
  )
}
