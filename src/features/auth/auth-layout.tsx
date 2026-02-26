import { AnthropicLogo } from '@/assets/anthropic-logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='flex min-h-svh w-full'>
      {/* Left Brand Panel */}
      <div className='relative hidden w-[46%] flex-col justify-between overflow-hidden bg-foreground p-10 xl:p-14 lg:flex'>
        {/* Grid pattern overlay */}
        <div
          className='pointer-events-none absolute inset-0 opacity-[0.035]'
          style={{
            backgroundImage:
              'linear-gradient(rgba(217,119,87,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,.6) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />
        {/* Decorative accent shapes */}
        <div className='absolute -right-16 top-[18%] h-72 w-36 rotate-12 rounded-full bg-primary/[0.06]' />
        <div className='absolute -left-8 bottom-[20%] h-56 w-28 -rotate-6 rounded-full bg-primary/[0.04]' />

        {/* Logo */}
        <div className='relative z-10'>
          <div className='flex items-center gap-3'>
            <AnthropicLogo className='size-9' />
            <span className='font-poppins text-lg font-semibold tracking-tight text-primary-foreground'>
              RMF CRM
            </span>
          </div>
        </div>

        {/* Brand message */}
        <div className='relative z-10 max-w-sm'>
          <h1 className='font-lora text-[2.5rem] font-normal leading-[1.2] text-primary-foreground/90'>
            智能驱动，
            <br />
            <span className='text-primary'>高效管理</span>
            <br />
            每一位客户。
          </h1>
          <div className='mt-8 h-px w-16 bg-primary/60' />
          <p className='mt-6 max-w-xs text-sm leading-relaxed text-primary-foreground/40'>
            全方位客户关系管理解决方案，助力团队提升效率，实现业务持续增长。
          </p>
        </div>

        {/* Copyright */}
        <p className='relative z-10 text-xs text-primary-foreground/25'>
          &copy; 2026 RMF CRM
        </p>
      </div>

      {/* Right Form Panel */}
      <div className='flex w-full flex-1 flex-col items-center justify-center bg-background px-6 py-12 lg:px-12'>
        {/* Mobile-only header */}
        <div className='mb-10 flex flex-col items-center lg:hidden'>
          <AnthropicLogo className='mb-4' />
          <h1 className='font-poppins text-xl font-semibold tracking-tight text-foreground'>
            RMF CRM 管理系统
          </h1>
          <p className='mt-1.5 text-sm text-muted-foreground'>
            智能客户关系管理平台
          </p>
        </div>

        <div className='w-full max-w-[380px]'>
          {children}
        </div>

        {/* Bottom copyright — mobile only */}
        <p className='mt-12 text-center text-xs text-muted-foreground/50 lg:hidden'>
          &copy; 2026 RMF CRM
        </p>
      </div>
    </div>
  )
}
