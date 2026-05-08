/**
 * AI Prompt 创建/编辑表单弹窗
 * 从 ai-prompt-manager.tsx 提取，增加场景标签显示
 */

import { useEffect, useRef } from 'react'

import { Button, Modal, Form, Tag, Typography } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { AI_SCENES, type AIPromptItem } from '../../types'

const { Text } = Typography

export type PromptDialogMode = 'create' | 'edit' | 'copy'

export interface PromptDialogState {
  open: boolean
  mode: PromptDialogMode
  sceneKey: string
  prompt?: AIPromptItem
  sourcePrompt?: AIPromptItem
}

interface AIPromptFormDialogProps {
  state: PromptDialogState
  onClose: () => void
  onSubmit: (data: { name: string; content: string; description?: string; sceneKey: string; promptId?: string; mode: PromptDialogMode }) => void
  isPending: boolean
}

interface PromptFormValues {
  name: string
  content: string
  description?: string
}

export function AIPromptFormDialog({
  state,
  onClose,
  onSubmit,
  isPending,
}: AIPromptFormDialogProps) {
  const { open, mode, sceneKey, prompt, sourcePrompt } = state
  const sceneLabel = AI_SCENES.find((s) => s.key === sceneKey)?.label || sceneKey
  const formRef = useRef<FormApi | null>(null)

  // 根据模式重置表单
  useEffect(() => {
    if (!open) return
    setTimeout(() => {
      if (mode === 'edit' && prompt) {
        formRef.current?.setValues({
          name: prompt.name,
          content: prompt.content,
          description: prompt.description || '',
        })
      } else if (mode === 'copy' && sourcePrompt) {
        formRef.current?.setValues({
          name: sourcePrompt.name,
          content: sourcePrompt.content,
          description: '',
        })
      } else {
        formRef.current?.setValues({ name: '', content: '', description: '' })
      }
    }, 0)
  }, [open, mode, prompt, sourcePrompt])

  const handleSubmit = (formData: PromptFormValues) => {
    onSubmit({
      name: mode === 'copy' && sourcePrompt ? sourcePrompt.name : formData.name,
      content: formData.content,
      description: formData.description || undefined,
      sceneKey,
      promptId: mode === 'edit' ? prompt?.id : undefined,
      mode,
    })
  }

  const title =
    mode === 'edit'
      ? `编辑 Prompt (v${prompt?.version})`
      : mode === 'copy'
        ? `升级 Prompt 版本 (当前 v${sourcePrompt?.version})`
        : '新建 Prompt'

  const description =
    mode === 'edit'
      ? '修改 Prompt 内容和版本说明'
      : mode === 'copy'
        ? '升级版本会沿用原名称，保存后版本号自动加一，创建后需手动激活才会生效'
      : '创建后需手动激活才会生效'

  return (
    <Modal
      title={title}
      visible={open}
      onCancel={onClose}
      width={700}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>取消</Button>
          <Button
            theme="solid"
            type="primary"
            onClick={() => formRef.current?.submitForm()}
            loading={isPending}
          >
            {mode === 'edit' ? '保存' : '创建'}
          </Button>
        </div>
      }
      bodyStyle={{ maxHeight: '60vh', overflow: 'auto' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Tag size="small" type="light">{sceneLabel}</Tag>
        <Text type="tertiary" size="small">{description}</Text>
      </div>
      <Form
        getFormApi={(api) => { formRef.current = api }}
        onSubmit={handleSubmit}
        labelPosition="top"
      >
        <Form.Input
          field="name"
          label="名称"
          placeholder="如：通话分析-强化需求挖掘"
          disabled={mode === 'copy'}
          rules={[
            { required: true, message: '请输入名称' },
            { max: 200, message: '名称最多200字' },
          ]}
          extraText={mode === 'copy' ? '升级版本必须沿用原名称，确保版本号连续递增' : undefined}
        />

        <Form.TextArea
          field="content"
          label="Prompt 内容"
          placeholder="输入系统提示词..."
          rows={12}
          rules={[
            { required: true, message: '请输入内容' },
            { min: 10, message: 'Prompt 内容至少10个字符' },
          ]}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
        />

        <Form.Input
          field="description"
          label="版本说明"
          placeholder="如：调整了异议处理的评分标准"
          rules={[{ max: 500, message: '说明最多500字' }]}
          extraText={mode !== 'edit' ? '简要描述本次修改内容，便于日后对比' : undefined}
        />
      </Form>
    </Modal>
  )
}
