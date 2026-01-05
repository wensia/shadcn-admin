import { useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <div className='p-8'>
        {/* 标题区域 */}
        <div className='mb-6'>
          <h2
            className='text-xl font-semibold tracking-tight'
            style={{
              fontFamily: 'Poppins, Arial, sans-serif',
              color: '#141413',
            }}
          >
            欢迎回来
          </h2>
          <p
            className='mt-1 text-sm'
            style={{
              fontFamily: 'Lora, Georgia, serif',
              color: '#b0aea5',
            }}
          >
            请输入您的账户信息登录系统
          </p>
        </div>

        {/* 登录表单 */}
        <UserAuthForm redirectTo={redirect} />

        {/* 分隔线 */}
        <div className='relative my-6'>
          <div className='absolute inset-0 flex items-center'>
            <span
              className='w-full'
              style={{ borderTop: '1px solid #e8e6dc' }}
            />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span
              className='px-2 text-xs'
              style={{ background: '#ffffff', color: '#b0aea5' }}
            >
              安全登录
            </span>
          </div>
        </div>

        {/* 底部条款 */}
        <p
          className='text-center text-xs'
          style={{
            fontFamily: 'Lora, Georgia, serif',
            color: '#b0aea5',
          }}
        >
          点击登录即表示您同意我们的{' '}
          <a
            href='/terms'
            className='underline underline-offset-4 transition-colors'
            style={{ color: '#d97757' }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#141413')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#d97757')}
          >
            服务条款
          </a>{' '}
          和{' '}
          <a
            href='/privacy'
            className='underline underline-offset-4 transition-colors'
            style={{ color: '#d97757' }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#141413')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#d97757')}
          >
            隐私政策
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}
