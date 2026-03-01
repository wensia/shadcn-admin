import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@douyinfe/semi-ui-19'
import { ShieldX } from 'lucide-react'

export function ForbiddenError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-4'>
        <ShieldX className='h-24 w-24' style={{ color: 'var(--semi-color-text-3)' }} />
        <h1 className='text-[5rem] leading-tight font-bold' style={{ color: 'var(--semi-color-text-2)' }}>403</h1>
        <span className='text-xl font-medium'>权限不足</span>
        <p className='text-center' style={{ color: 'var(--semi-color-text-2)' }}>
          您没有访问此页面的权限<br />
          此功能仅限超级管理员使用
        </p>
        <div className='mt-6 flex gap-4'>
          <Button theme='outline' onClick={() => history.go(-1)}>
            返回上页
          </Button>
          <Button theme='solid' onClick={() => navigate({ to: '/' })}>返回首页</Button>
        </div>
      </div>
    </div>
  )
}
