import { Avatar, Typography } from '@douyinfe/semi-ui-19'

const { Text } = Typography

export function RecentSales() {
  return (
    <div className='space-y-8'>
      <div className='flex items-center gap-4'>
        <Avatar size='small' src='/avatars/01.png' alt='Avatar'>OM</Avatar>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>Olivia Martin</p>
            <Text type='tertiary' size='small'>
              olivia.martin@email.com
            </Text>
          </div>
          <div className='font-medium'>+$1,999.00</div>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <Avatar size='small' src='/avatars/02.png' alt='Avatar' style={{ border: '1px solid var(--semi-color-border)' }}>JL</Avatar>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>Jackson Lee</p>
            <Text type='tertiary' size='small'>
              jackson.lee@email.com
            </Text>
          </div>
          <div className='font-medium'>+$39.00</div>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <Avatar size='small' src='/avatars/03.png' alt='Avatar'>IN</Avatar>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>Isabella Nguyen</p>
            <Text type='tertiary' size='small'>
              isabella.nguyen@email.com
            </Text>
          </div>
          <div className='font-medium'>+$299.00</div>
        </div>
      </div>

      <div className='flex items-center gap-4'>
        <Avatar size='small' src='/avatars/04.png' alt='Avatar'>WK</Avatar>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>William Kim</p>
            <Text type='tertiary' size='small'>will@email.com</Text>
          </div>
          <div className='font-medium'>+$99.00</div>
        </div>
      </div>

      <div className='flex items-center gap-4'>
        <Avatar size='small' src='/avatars/05.png' alt='Avatar'>SD</Avatar>
        <div className='flex flex-1 flex-wrap items-center justify-between'>
          <div className='space-y-1'>
            <p className='text-sm leading-none font-medium'>Sofia Davis</p>
            <Text type='tertiary' size='small'>
              sofia.davis@email.com
            </Text>
          </div>
          <div className='font-medium'>+$39.00</div>
        </div>
      </div>
    </div>
  )
}
