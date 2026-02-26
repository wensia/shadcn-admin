import { useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      {/* Heading */}
      <div className='mb-8'>
        <h2 className='font-poppins text-2xl font-semibold tracking-tight text-foreground'>
          欢迎回来
        </h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          请输入您的账户信息登录系统
        </p>
      </div>

      {/* Form */}
      <UserAuthForm redirectTo={redirect} />

      {/* Divider */}
      <div className='relative my-8'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-border' />
        </div>
        <div className='relative flex justify-center'>
          <span className='bg-background px-3 text-xs text-muted-foreground'>
            安全登录
          </span>
        </div>
      </div>

      {/* Terms */}
      <p className='text-center text-xs leading-relaxed text-muted-foreground'>
        点击登录即表示您同意我们的{' '}
        <a
          href='/terms'
          className='underline underline-offset-4 text-primary transition-colors hover:text-foreground'
        >
          服务条款
        </a>{' '}
        和{' '}
        <a
          href='/privacy'
          className='underline underline-offset-4 text-primary transition-colors hover:text-foreground'
        >
          隐私政策
        </a>
      </p>
    </AuthLayout>
  )
}
