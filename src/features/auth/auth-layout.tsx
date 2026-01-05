import { useEffect } from 'react'
import { AnthropicLogo } from '@/assets/anthropic-logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  // 应用 Anthropic 主题
  useEffect(() => {
    document.documentElement.classList.add('theme-anthropic')
    return () => {
      document.documentElement.classList.remove('theme-anthropic')
    }
  }, [])

  return (
    <div
      className='relative min-h-svh w-full'
      style={{
        background: 'linear-gradient(135deg, #faf9f5 0%, #e8e6dc 100%)',
        fontFamily: 'Lora, Georgia, serif',
      }}
    >
      {/* 装饰性背景元素 */}
      <div className='absolute inset-0 overflow-hidden'>
        <div
          className='absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20'
          style={{ background: '#d97757' }}
        />
        <div
          className='absolute -bottom-48 -left-48 h-[500px] w-[500px] rounded-full opacity-10'
          style={{ background: '#d97757' }}
        />
        <div
          className='absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full opacity-10'
          style={{ background: '#788c5d' }}
        />
      </div>

      {/* 主内容区域 */}
      <div className='relative z-10 flex min-h-svh items-center justify-center px-4 py-12'>
        <div className='w-full max-w-md'>
          {/* Logo 和标题 */}
          <div className='mb-8 flex flex-col items-center'>
            <AnthropicLogo className='mb-4' />
            <h1
              className='text-2xl font-semibold tracking-tight'
              style={{
                fontFamily: 'Poppins, Arial, sans-serif',
                color: '#141413',
              }}
            >
              RMF CRM 管理系统
            </h1>
            <p
              className='mt-2 text-sm'
              style={{ color: '#b0aea5' }}
            >
              智能客户关系管理平台
            </p>
          </div>

          {/* 登录卡片 */}
          <div
            className='overflow-hidden shadow-xl'
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e8e6dc',
            }}
          >
            {children}
          </div>

          {/* 底部版权信息 */}
          <p
            className='mt-8 text-center text-xs'
            style={{ color: '#b0aea5' }}
          >
            Powered by Anthropic Brand Design
          </p>
        </div>
      </div>
    </div>
  )
}
