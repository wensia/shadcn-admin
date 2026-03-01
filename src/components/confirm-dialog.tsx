/**
 * 确认对话框 - Semi Design 版本
 * 基于 Modal 实现，保留原接口
 */

import { Modal, Button } from '@douyinfe/semi-ui-19'
import type { ReactNode } from 'react'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  disabled?: boolean
  desc: JSX.Element | string
  cancelBtnText?: string
  confirmText?: ReactNode
  destructive?: boolean
  handleConfirm: () => void
  isLoading?: boolean
  className?: string
  children?: ReactNode
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    title,
    desc,
    children,
    confirmText,
    cancelBtnText,
    destructive,
    isLoading,
    disabled = false,
    handleConfirm,
    open,
    onOpenChange,
  } = props

  return (
    <Modal
      title={title}
      visible={open}
      onCancel={() => onOpenChange(false)}
      closeOnEsc
      maskClosable={!isLoading}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelBtnText ?? '取消'}
          </Button>
          <Button
            theme="solid"
            type={destructive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={isLoading}
            disabled={disabled || isLoading}
          >
            {confirmText ?? '确认'}
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
