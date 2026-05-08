import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button, Form } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { AuthLayout } from '../auth-layout'
import { authApi } from '../api'
import { toast } from '@/lib/toast'
import { showApiErrorToast } from '@/lib/api/error-toast'

type SetPasswordFormValues = {
  new_password: string
  confirm_password: string
}

export function SetPassword() {
  const navigate = useNavigate()
  const formRef = useRef<FormApi | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const token = useMemo(() => {
    return new URLSearchParams(window.location.search).get('token') || ''
  }, [])

  async function handleSubmit(values: SetPasswordFormValues) {
    if (!token) {
      toast.error('设置密码链接无效')
      return
    }
    if (values.new_password !== values.confirm_password) {
      toast.error('两次输入的密码不一致')
      return
    }

    setIsLoading(true)
    try {
      await authApi.confirmResetPassword({
        token,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      })
      toast.success('密码设置成功，请使用新密码登录')
      navigate({ to: '/sign-in' })
    } catch (error) {
      showApiErrorToast(error, '设置失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">设置登录密码</h2>
          <p className="text-sm" style={{ color: 'var(--semi-color-text-2)' }}>
            输入新密码后即可使用 CRM 账号登录。
          </p>
        </div>

        <Form
          getFormApi={(api) => { formRef.current = api }}
          onSubmit={(values) => handleSubmit(values as SetPasswordFormValues)}
          className="grid gap-2"
        >
          <Form.Input
            field="new_password"
            label="新密码"
            mode="password"
            placeholder="至少 6 个字符"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          />
          <Form.Input
            field="confirm_password"
            label="确认密码"
            mode="password"
            placeholder="再次输入新密码"
            rules={[
              { required: true, message: '请确认新密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          />
          <Button
            htmlType="submit"
            theme="solid"
            block
            loading={isLoading}
            disabled={!token}
            style={{ marginTop: 8 }}
            icon={isLoading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
            iconPosition="right"
          >
            设置密码
          </Button>
        </Form>

        {!token && (
          <p className="text-center text-sm" style={{ color: 'var(--semi-color-danger)' }}>
            当前链接缺少 token，请从邮件中的链接重新打开。
          </p>
        )}

        <p className="mx-auto px-8 text-center text-sm text-balance" style={{ color: 'var(--semi-color-text-2)' }}>
          已设置密码？{' '}
          <Link
            to="/sign-in"
            className="underline underline-offset-4 hover:text-[var(--semi-color-primary)]"
          >
            返回登录
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
