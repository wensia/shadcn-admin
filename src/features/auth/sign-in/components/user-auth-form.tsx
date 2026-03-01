/**
 * 用户登录表单 - Semi Design 版本
 * 使用 Semi Form + Input + Button 组件
 */

import { useState, useRef } from 'react'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconUser, IconLock } from '@douyinfe/semi-icons'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/features/auth/api'
import { showApiErrorToast } from '@/lib/api/error-toast'

interface UserAuthFormProps {
  redirectTo?: string
}

export function UserAuthForm({ redirectTo }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuthState } = useAuthStore()
  const formApiRef = useRef<FormApi>()

  async function handleSubmit(values: Record<string, any>) {
    setIsLoading(true)
    try {
      const response = await authApi.login({
        username: values.username,
        password: values.password,
      })

      if (response.success && response.data) {
        setAuthState(
          response.data.access_token,
          response.data.refresh_token,
          response.data.user
        )
        toast.success(
          `欢迎回来, ${response.data.user.name || values.username}!`
        )
        navigate({ to: redirectTo || '/', replace: true })
      } else {
        toast.error(response.message || '登录失败')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      if (!error.messageShown) {
        showApiErrorToast(error, '登录失败')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form
      getFormApi={(api) => {
        formApiRef.current = api
      }}
      onSubmit={handleSubmit}
      className='login-semi-form'
    >
      <Form.Input
        field='username'
        label='用户名'
        placeholder='请输入用户名'
        prefix={<IconUser />}
        size='large'
        showClear
        rules={[{ required: true, message: '请输入用户名' }]}
        autoComplete='username'
      />

      {/* Password field with custom label row */}
      <div className='login-password-label'>
        <span>密码</span>
        <Link to='/forgot-password' className='login-forgot-link'>
          忘记密码?
        </Link>
      </div>
      <Form.Input
        field='password'
        noLabel
        mode='password'
        placeholder='请输入密码'
        prefix={<IconLock />}
        size='large'
        rules={[{ required: true, message: '请输入密码' }]}
        autoComplete='current-password'
      />

      <Button
        htmlType='submit'
        theme='solid'
        loading={isLoading}
        block
        size='large'
        style={{ marginTop: 24 }}
      >
        登录
      </Button>
    </Form>
  )
}
