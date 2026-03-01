import { motion } from 'motion/react'
import { AnthropicLogo } from '@/assets/anthropic-logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='login-page'>
      {/* 全页背景 + 装饰光晕 */}
      <div className='login-bg'>
        <div className='login-orb login-orb-1' />
        <div className='login-orb login-orb-2' />
      </div>

      {/* 居中内容 */}
      <div className='flex min-h-svh items-center justify-center px-4 py-12'>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className='login-card'
        >
          {/* Logo 行 */}
          <div className='mb-8 flex items-center justify-center gap-2.5'>
            <AnthropicLogo className='size-8' />
            <span className='text-lg font-semibold tracking-tight text-[#141413]'>
              RMF CRM
            </span>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  )
}
