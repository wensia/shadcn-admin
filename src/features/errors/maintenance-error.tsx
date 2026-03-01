import { Button } from '@douyinfe/semi-ui-19'

export function MaintenanceError() {
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>503</h1>
        <span className='font-medium'>Website is under maintenance!</span>
        <p className='text-center' style={{ color: 'var(--semi-color-text-2)' }}>
          The site is not available at the moment. <br />
          We'll be back online shortly.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button theme='outline'>Learn more</Button>
        </div>
      </div>
    </div>
  )
}
