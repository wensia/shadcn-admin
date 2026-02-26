/**
 * 用户登录表单
 * 连接到 RMF CRM 后端 API
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
import { Button } from '@/components/ui/button'
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
import { showApiErrorToast } from '@/lib/api/error-toast'

const formSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
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
      const response = await authApi.login({
        username: data.username,
        password: data.password,
      })

      if (response.success && response.data) {
        setAuthState(
          response.data.access_token,
          response.data.refresh_token,
          response.data.user
        )
        toast.success(`欢迎回来, ${response.data.user.name || data.username}!`)
        const targetPath = redirectTo || '/'
        navigate({ to: targetPath, replace: true })
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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-5', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='username'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='font-poppins text-sm font-medium text-foreground'>
                用户名
              </FormLabel>
              <FormControl>
                <Input
                  placeholder='请输入用户名'
                  autoComplete='username'
                  {...field}
                  className='h-11 rounded-lg border-input bg-background'
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
            <FormItem>
              <div className='flex items-center justify-between'>
                <FormLabel className='font-poppins text-sm font-medium text-foreground'>
                  密码
                </FormLabel>
                <Link
                  to='/forgot-password'
                  className='text-xs font-medium text-primary transition-colors hover:text-foreground'
                >
                  忘记密码?
                </Link>
              </div>
              <FormControl>
                <PasswordInput
                  placeholder='请输入密码'
                  autoComplete='current-password'
                  {...field}
                  inputClassName='h-11 rounded-lg border-input bg-background'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type='submit'
          disabled={isLoading}
          className='mt-2 h-11 w-full rounded-lg font-poppins text-sm font-medium'
        >
          {isLoading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <LogIn className='mr-2 h-4 w-4' />
          )}
          登录
        </Button>
      </form>
    </Form>
  )
}
