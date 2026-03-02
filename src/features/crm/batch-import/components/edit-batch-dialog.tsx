/**
 * 编辑批次弹窗
 * Semi Design 重构
 */

import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Modal,
  Button,
  Form,
  Toast,
} from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import {
  IconLoading,
} from '@douyinfe/semi-icons'
import { showApiErrorToast } from '@/lib/api/error-toast'

import { batchImportApi } from '../api'
import type { BatchImportItem } from '../types'

interface EditBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: BatchImportItem | null
  onSuccess?: () => void
}

interface FormValues {
  batch_name: string
  batch_description: string
}

export function EditBatchDialog({ open, onOpenChange, batch, onSuccess }: EditBatchDialogProps) {
  const formRef = useRef<FormApi>()

  // 当 batch 变化时重置表单
  useEffect(() => {
    if (batch && open && formRef.current) {
      formRef.current.setValues({
        batch_name: batch.batch_name,
        batch_description: batch.batch_description || '',
      })
    }
  }, [batch, open])

  // 更新 mutation
  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!batch) throw new Error('批次信息不存在')
      return batchImportApi.updateBatch(batch.id, values)
    },
    onSuccess: () => {
      Toast.success('更新成功')
      onSuccess?.()
    },
    onError: (error: Error) => {
      showApiErrorToast(error, '更新失败')
    },
  })

  // 关闭弹窗
  const handleClose = () => {
    onOpenChange(false)
  }

  // 提交表单
  const handleSubmit = () => {
    formRef.current?.validate().then((values: FormValues) => {
      updateMutation.mutate(values)
    })
  }

  if (!batch) return null

  return (
    <Modal
      visible={open}
      title="编辑批次"
      onCancel={handleClose}
      width={500}
      closable={true}
      maskClosable={false}
      footer={
        <>
          <Button onClick={handleClose} disabled={updateMutation.isPending}>
            取消
          </Button>
          <Button
            theme="solid"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            icon={updateMutation.isPending ? <IconLoading spin /> : undefined}
          >
            {updateMutation.isPending ? '保存中' : '保存'}
          </Button>
        </>
      }
    >
      <Form
        ref={formRef}
        initValues={{
          batch_name: batch.batch_name,
          batch_description: batch.batch_description || '',
        }}
        labelPosition="top"
      >
        <Form.Input
          field="batch_name"
          label="批次名称"
          placeholder="请输入批次名称"
          rules={[
            { required: true, message: '批次名称不能为空' },
            { max: 100, message: '批次名称不能超过100个字符' },
          ]}
        />

        <Form.TextArea
          field="batch_description"
          label="批次备注"
          placeholder="可选，添加批次备注信息"
          rows={3}
          rules={[
            { max: 500, message: '批次备注不能超过500个字符' },
          ]}
        />
      </Form>
    </Modal>
  )
}
