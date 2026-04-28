/**
 * 员工批量导入弹窗
 * 支持下载模板 + 上传Excel批量创建员工
 */

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Progress,
  Toast,
  Table,
  Typography,
} from '@douyinfe/semi-ui-19'
import {
  IconUpload,
  IconFile,
  IconClose,
  IconLoading,
  IconTickCircle,
  IconCrossCircleStroked,
  IconDownload,
} from '@douyinfe/semi-icons'

import { adminApi } from '../api'
import type { EmployeeBatchImportResult, EmployeeBatchImportFailure, EmployeeBatchImportCredential } from '../types'

type Phase = 'idle' | 'uploading' | 'completed' | 'failed'

const { Text } = Typography

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EmployeeBatchImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const queryClient = useQueryClient()

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<EmployeeBatchImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 下载模板
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await adminApi.downloadEmployeeImportTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `员工批量导入模板.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      Toast.success('模板下载成功')
    } catch {
      Toast.error('模板下载失败')
    }
  }, [])

  // 上传 mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('请选择文件')
      setPhase('uploading')
      setUploadProgress(0)
      setErrorMessage(null)
      return adminApi.uploadEmployeeBatchImport(file, setUploadProgress)
    },
    onSuccess: (response) => {
      if (!response.success) {
        setPhase('failed')
        setErrorMessage(response.message || '导入失败')
        return
      }
      if (!response.data) {
        setPhase('failed')
        setErrorMessage(response.message || '导入结果为空')
        return
      }
      setResult(response.data)
      setPhase('completed')
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] })
    },
    onError: (error: Error) => {
      setPhase('failed')
      setErrorMessage(error.message || '上传失败')
    },
  })

  const resetState = useCallback(() => {
    setFile(null)
    setUploadProgress(0)
    setPhase('idle')
    setResult(null)
    setErrorMessage(null)
  }, [])

  const handleClose = useCallback(() => {
    if (phase === 'completed') {
      onSuccess?.()
    }
    resetState()
    onOpenChange(false)
  }, [phase, onSuccess, resetState, onOpenChange])

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return
    const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'))
    if (!['.xlsx', '.xls'].includes(ext)) {
      Toast.error('请选择 Excel 文件(.xlsx 或 .xls)')
      return
    }
    setFile(selectedFile)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null)
    e.target.value = ''
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files?.[0] || null)
  }, [handleFileSelect])

  // 失败记录表格列
  const failureColumns = [
    { title: '行号', dataIndex: 'row', width: 60 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '失败原因', dataIndex: 'reason' },
  ]

  // 账号密码表格列
  const credentialColumns = [
    { title: '姓名', dataIndex: 'name', width: 80 },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '初始密码', dataIndex: 'password', width: 120 },
  ]

  const handleCopyCredentials = useCallback(async () => {
    if (!result?.created_credentials?.length) return
    const text = result.created_credentials
      .map((c: EmployeeBatchImportCredential) => `${c.name}\t${c.username}\t${c.password}`)
      .join('\n')
    await navigator.clipboard.writeText(`姓名\t用户名\t初始密码\n${text}`)
    Toast.success('账号信息已复制到剪贴板')
  }, [result])

  const renderContent = () => {
    switch (phase) {
      case 'uploading':
        return (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <IconLoading spin style={{ fontSize: 48, color: 'var(--semi-color-primary)' }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 500 }}>正在上传并处理...</p>
              <Progress percent={uploadProgress} style={{ marginTop: 8 }} />
            </div>
          </div>
        )

      case 'completed':
        return (
          <div style={{ padding: '16px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <IconTickCircle style={{ fontSize: 48, color: 'var(--semi-color-success)' }} />
              <p style={{ fontWeight: 500, color: 'var(--semi-color-success)', marginTop: 8 }}>导入完成</p>
              {result && (
                <div style={{ fontSize: 14, color: 'var(--semi-color-text-2)', marginTop: 8 }}>
                  <p>总数: {result.total_count} 人</p>
                  <p style={{ color: 'var(--semi-color-success)' }}>成功: {result.success_count} 人</p>
                  {result.failed_count > 0 && (
                    <p style={{ color: 'var(--semi-color-danger)' }}>失败: {result.failed_count} 人</p>
                  )}
                </div>
              )}
            </div>
            {result && result.created_credentials?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong>账号信息（请妥善保存并通知员工）：</Text>
                  <Button size="small" icon={<IconDownload />} onClick={handleCopyCredentials}>复制全部</Button>
                </div>
                <Table
                  columns={credentialColumns}
                  dataSource={result.created_credentials}
                  pagination={false}
                  size="small"
                  rowKey="username"
                  style={{ maxHeight: 220, overflow: 'auto' }}
                />
              </div>
            )}
            {result && result.failures.length > 0 && (
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>失败记录：</Text>
                <Table
                  columns={failureColumns}
                  dataSource={result.failures}
                  pagination={false}
                  size="small"
                  rowKey="row"
                  style={{ maxHeight: 200, overflow: 'auto' }}
                />
              </div>
            )}
          </div>
        )

      case 'failed':
        return (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <IconCrossCircleStroked style={{ fontSize: 48, color: 'var(--semi-color-danger)' }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 500, color: 'var(--semi-color-danger)' }}>导入失败</p>
              <p style={{ fontSize: 14, color: 'var(--semi-color-text-2)', marginTop: 4 }}>{errorMessage}</p>
            </div>
          </div>
        )

      default:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
            {/* 步骤提示 */}
            <div style={{ background: 'var(--semi-color-fill-0)', borderRadius: 8, padding: 12 }}>
              <Text strong>操作步骤：</Text>
              <ol style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: 'var(--semi-color-text-2)' }}>
                <li>点击下方按钮下载导入模板</li>
                <li>填写姓名、校区、部门、岗位（手机号选填；用户名由系统自动生成）</li>
                <li>上传填好的Excel文件，单次最多100人</li>
                <li>导入成功后，结果页会显示每位员工的账号和随机密码，请妥善保存</li>
              </ol>
            </div>

            {/* 下载模板按钮 */}
            <Button icon={<IconDownload />} onClick={handleDownloadTemplate} block>
              下载导入模板
            </Button>

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
                  accept=".xlsx,.xls"
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
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    />
                  </div>
                ) : (
                  <div>
                    <IconUpload style={{ fontSize: 40, color: 'var(--semi-color-text-2)' }} />
                    <p style={{ color: 'var(--semi-color-text-2)', marginTop: 8 }}>
                      拖拽文件到此处，或<span style={{ color: 'var(--semi-color-primary)' }}>点击选择</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--semi-color-text-2)', marginTop: 4 }}>支持 .xlsx, .xls 格式，单次最多100人</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
    }
  }

  const renderFooter = () => {
    switch (phase) {
      case 'idle':
        return (
          <>
            <Button onClick={handleClose}>取消</Button>
            <Button theme="solid" icon={<IconUpload />} onClick={() => uploadMutation.mutate()} disabled={!file}>
              上传导入
            </Button>
          </>
        )
      case 'uploading':
        return <Button disabled>处理中...</Button>
      case 'completed':
        return <Button theme="solid" onClick={handleClose}>完成</Button>
      case 'failed':
        return (
          <>
            <Button onClick={handleClose}>关闭</Button>
            <Button theme="solid" onClick={resetState}>重试</Button>
          </>
        )
    }
  }

  return (
    <Modal
      visible={open}
      title={phase === 'completed' ? '导入完成' : phase === 'failed' ? '导入失败' : '批量导入员工'}
      onCancel={handleClose}
      footer={renderFooter()}
      width={640}
      closable
      maskClosable={false}
    >
      {renderContent()}
    </Modal>
  )
}
