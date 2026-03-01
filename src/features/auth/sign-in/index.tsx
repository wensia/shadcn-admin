import { useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      {/* Heading */}
      <div style={{ marginBottom: 32 }}>
        <h2 className='text-[1.625rem] font-semibold tracking-tight text-[#141413]'>
          欢迎回来
        </h2>
        <p className='mt-2 text-[0.9rem] text-[#8a8880]'>
          请输入您的账户信息登录系统
        </p>
      </div>

      {/* Semi Design Form */}
      <UserAuthForm redirectTo={redirect} />

      {/* Divider */}
      <div className='relative my-8'>
        <div className='absolute inset-0 flex items-center'>
          <div
            className='w-full'
            style={{ borderTop: '1px solid #e8e6dc' }}
          />
        </div>
        <div className='relative flex justify-center'>
          <span className='bg-white px-3 text-xs text-[#8a8880]'>
            安全登录
          </span>
        </div>
      </div>

      {/* Terms */}
      <p className='text-center text-xs leading-relaxed text-[#8a8880]'>
        点击登录即表示您同意我们的{' '}
        <a
          href='/terms'
          className='text-[#0064FA] underline underline-offset-4 transition-colors hover:text-[#141413]'
        >
          服务条款
        </a>{' '}
        和{' '}
        <a
          href='/privacy'
          className='text-[#0064FA] underline underline-offset-4 transition-colors hover:text-[#141413]'
        >
          隐私政策
        </a>
      </p>
    </AuthLayout>
  )
}
