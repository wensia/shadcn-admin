/**
 * 用户登录表单 - Semi Design 版本
 * 使用 Semi Form + Input + Button 组件
 * 支持多身份登录：登录后检测是否需要选择身份
 */

import { useState, useRef } from 'react'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconUser, IconLock } from '@douyinfe/semi-icons'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from '@/lib/toast'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/features/auth/api'
import { showApiErrorToast } from '@/lib/api/error-toast'

interface UserAuthFormProps {
  redirectTo?: string
}

type SignInFormValues = {
  username: string
  password: string
}

export function UserAuthForm({ redirectTo }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuthState, setTempToken, setAvailableIdentities, setIdentityContext } = useAuthStore()
  const formApiRef = useRef<FormApi | null>(null)

  async function handleSubmit(values: SignInFormValues) {
    setIsLoading(true)
    try {
      const response = await authApi.login({
        username: values.username,
        password: values.password,
      })

      if (response.success && response.data) {
        const loginData = response.data

        if (loginData.requires_identity_selection) {
          // 多身份 → 保存临时token和身份列表，跳转身份选择页
          setTempToken(loginData.access_token, loginData.refresh_token)
          setAvailableIdentities(loginData.identities)
          toast.info('请选择您的工作身份')
          navigate({ to: '/select-identity', replace: true })
        } else {
          // 单身份 → 直接进入系统
          setAuthState(
            loginData.access_token,
            loginData.refresh_token,
            loginData.user
          )
          // 设置身份上下文（单身份自动选中）
          if (loginData.identity) {
            setIdentityContext(loginData.identity, loginData.user.permissions || [], [])
            setAvailableIdentities([loginData.identity])
          }
          toast.success(
            `欢迎回来, ${loginData.user.name || values.username}!`
          )
          navigate({ to: redirectTo || '/', replace: true })
        }
      } else {
        toast.error(response.message || '登录失败')
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && 'messageShown' in error && error.messageShown)) {
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
