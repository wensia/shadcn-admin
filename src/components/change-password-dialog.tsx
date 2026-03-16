import { useRef, useState } from 'react'
import { Modal, Form, Button, Toast } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { authApi } from '@/features/auth/api'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [loading, setLoading] = useState(false)
  const formRef = useRef<FormApi>(null)

  const handleSubmit = async (values: Record<string, string>) => {
    if (values.new_password !== values.confirm_password) {
      Toast.error('两次输入的新密码不一致')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      })
      if (res.success) {
        Toast.success('密码修改成功')
        onOpenChange(false)
      }
    } catch (err: any) {
      Toast.error(err?.message || '密码修改失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="修改密码"
      visible={open}
      onCancel={() => onOpenChange(false)}
      closeOnEsc
      maskClosable={!loading}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="tertiary" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button theme="solid" loading={loading} onClick={() => formRef.current?.submitForm()}>
            确认修改
          </Button>
        </div>
      }
    >
      <Form
        onSubmit={handleSubmit}
        getFormApi={(api) => { formRef.current = api }}
        labelPosition="top"
      >
        <Form.Input
          field="current_password"
          label="当前密码"
          mode="password"
          rules={[{ required: true, message: '请输入当前密码' }]}
          placeholder="请输入当前密码"
        />
        <Form.Input
          field="new_password"
          label="新密码"
          mode="password"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
          placeholder="请输入新密码"
        />
        <Form.Input
          field="confirm_password"
          label="确认新密码"
          mode="password"
          rules={[
            { required: true, message: '请确认新密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
          placeholder="请再次输入新密码"
        />
      </Form>
    </Modal>
  )
}
