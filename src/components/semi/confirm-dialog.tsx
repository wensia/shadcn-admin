/**
 * Semi Design 确认对话框组件
 * 基于 Modal 的声明式确认对话框封装，替代旧对话框实现
 */

import { Modal, Button } from '@douyinfe/semi-ui-19'
import type { ReactNode } from 'react'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  desc: ReactNode
  confirmText?: ReactNode
  cancelBtnText?: string
  destructive?: boolean
  handleConfirm: () => void
  isLoading?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  desc,
  confirmText = '确认',
  cancelBtnText = '取消',
  destructive = false,
  handleConfirm,
  isLoading = false,
  disabled = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      visible={open}
      onCancel={() => onOpenChange(false)}
      closeOnEsc
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelBtnText}
          </Button>
          <Button
            theme="solid"
            type={destructive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={isLoading}
            disabled={disabled || isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div style={{ color: 'var(--semi-color-text-1)', fontSize: 14 }}>
        {desc}
      </div>
      {children}
    </Modal>
  )
}

/**
 * 命令式确认对话框 (适用于简单场景)
 * 用法: confirmDelete({ title: '确认删除', content: '不可撤销', onOk: () => {...} })
 */
export function confirmDelete({
  title = '确认删除',
  content,
  onOk,
  okText = '删除',
}: {
  title?: string
  content: ReactNode
  onOk: () => Promise<void> | void
  okText?: string
}) {
  return Modal.confirm({
    title,
    content,
    okText,
    cancelText: '取消',
    okButtonProps: { type: 'danger', theme: 'solid' } as any,
    onOk,
  })
}
