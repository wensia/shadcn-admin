/**
 * 用户登录表单
 * 连接到RMF CRM后端API
 * 使用 Anthropic 品牌风格
 */

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

// Anthropic 品牌颜色
const anthropicColors = {
  dark: '#141413',
  light: '#faf9f5',
  midGray: '#b0aea5',
  lightGray: '#e8e6dc',
  orange: '#d97757',
  green: '#788c5d',
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuthState } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      // 调用登录API
      const response = await authApi.login({
        username: data.username,
        password: data.password,
      })

      if (response.success && response.data) {
        // 保存认证状态
        setAuthState(
          response.data.access_token,
          response.data.refresh_token,
          response.data.user
        )

        // 显示成功消息
        toast.success(`欢迎回来, ${response.data.user.name || data.username}!`)

        // 跳转到目标页面
        const targetPath = redirectTo || '/'
        navigate({ to: targetPath, replace: true })
      } else {
        toast.error(response.message || '登录失败')
      }
    } catch (error: any) {
      // 错误已经在API客户端的拦截器中处理
      // 这里只需要记录,不需要再次显示toast
      console.error('Login error:', error)

      // 如果拦截器没有显示消息,则显示通用错误
      if (!error.messageShown) {
        toast.error('登录失败，请检查用户名和密码')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-4', className)}
        style={{ fontFamily: 'Lora, Georgia, serif' }}
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel
                style={{
                  fontFamily: 'Poppins, Arial, sans-serif',
                  color: anthropicColors.dark,
                  fontWeight: 500,
                }}
              >
                用户名
              </FormLabel>
              <FormControl>
                <Input
                  placeholder='请输入用户名'
                  {...field}
                  className='h-11 transition-all focus-visible:ring-2'
                  style={{
                    borderRadius: '8px',
                    border: `1px solid ${anthropicColors.lightGray}`,
                    background: anthropicColors.light,
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel
                style={{
                  fontFamily: 'Poppins, Arial, sans-serif',
                  color: anthropicColors.dark,
                  fontWeight: 500,
                }}
              >
                密码
              </FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='请输入密码'
                  {...field}
                  className='h-11 transition-all focus-visible:ring-2'
                  style={{
                    borderRadius: '8px',
                    border: `1px solid ${anthropicColors.lightGray}`,
                    background: anthropicColors.light,
                  }}
                />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='absolute end-0 -top-0.5 text-sm font-medium transition-colors'
                style={{
                  color: anthropicColors.orange,
                  fontFamily: 'Poppins, Arial, sans-serif',
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.color = anthropicColors.dark)
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.color = anthropicColors.orange)
                }
              >
                忘记密码?
              </Link>
            </FormItem>
          )}
        />
        <button
          type='submit'
          disabled={isLoading}
          className='mt-3 flex h-11 w-full items-center justify-center gap-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50'
          style={{
            fontFamily: 'Poppins, Arial, sans-serif',
            background: anthropicColors.orange,
            color: anthropicColors.light,
            borderRadius: '8px',
            border: 'none',
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = anthropicColors.dark
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = anthropicColors.orange
          }}
        >
          {isLoading ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <LogIn className='h-4 w-4' />
          )}
          登录
        </button>
      </form>
    </Form>
  )
}
