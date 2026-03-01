import { Card, Typography } from '@douyinfe/semi-ui-19'
import { AnalyticsChart } from './analytics-chart'

const { Text } = Typography

export function Analytics() {
  return (
    <div className='space-y-4'>
      <Card className='rounded-lg'>
        <div className='mb-4'>
          <div className='font-semibold text-base'>Traffic Overview</div>
          <Text type='tertiary' size='small'>Weekly clicks and unique visitors</Text>
        </div>
        <div className='px-6'>
          <AnalyticsChart />
        </div>
      </Card>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='rounded-lg'>
          <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <Text className='text-sm font-medium'>Total Clicks</Text>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4'
              style={{ color: 'var(--semi-color-text-2)' }}
            >
              <path d='M3 3v18h18' />
              <path d='M7 15l4-4 4 4 4-6' />
            </svg>
          </div>
          <div className='text-2xl font-bold'>1,248</div>
          <Text type='tertiary' size='small'>+12.4% vs last week</Text>
        </Card>
        <Card className='rounded-lg'>
          <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <Text className='text-sm font-medium'>
              Unique Visitors
            </Text>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4'
              style={{ color: 'var(--semi-color-text-2)' }}
            >
              <circle cx='12' cy='7' r='4' />
              <path d='M6 21v-2a6 6 0 0 1 12 0v2' />
            </svg>
          </div>
          <div className='text-2xl font-bold'>832</div>
          <Text type='tertiary' size='small'>+5.8% vs last week</Text>
        </Card>
        <Card className='rounded-lg'>
          <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <Text className='text-sm font-medium'>Bounce Rate</Text>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4'
              style={{ color: 'var(--semi-color-text-2)' }}
            >
              <path d='M3 12h6l3 6 3-6h6' />
            </svg>
          </div>
          <div className='text-2xl font-bold'>42%</div>
          <Text type='tertiary' size='small'>-3.2% vs last week</Text>
        </Card>
        <Card className='rounded-lg'>
          <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <Text className='text-sm font-medium'>Avg. Session</Text>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='h-4 w-4'
              style={{ color: 'var(--semi-color-text-2)' }}
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 6v6l4 2' />
            </svg>
          </div>
          <div className='text-2xl font-bold'>3m 24s</div>
          <Text type='tertiary' size='small'>+18s vs last week</Text>
        </Card>
      </div>
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4 rounded-lg'>
          <div className='mb-4'>
            <div className='font-semibold text-base'>Referrers</div>
            <Text type='tertiary' size='small'>Top sources driving traffic</Text>
          </div>
          <SimpleBarList
            items={[
              { name: 'Direct', value: 512 },
              { name: 'Product Hunt', value: 238 },
              { name: 'Twitter', value: 174 },
              { name: 'Blog', value: 104 },
            ]}
            barClass='bg-primary'
            valueFormatter={(n) => `${n}`}
          />
        </Card>
        <Card className='col-span-1 lg:col-span-3 rounded-lg'>
          <div className='mb-4'>
            <div className='font-semibold text-base'>Devices</div>
            <Text type='tertiary' size='small'>How users access your app</Text>
          </div>
          <SimpleBarList
            items={[
              { name: 'Desktop', value: 74 },
              { name: 'Mobile', value: 22 },
              { name: 'Tablet', value: 4 },
            ]}
            barClass='bg-muted-foreground'
            valueFormatter={(n) => `${n}%`}
          />
        </Card>
      </div>
    </div>
  )
}

function SimpleBarList({
  items,
  valueFormatter,
  barClass,
}: {
  items: { name: string; value: number }[]
  valueFormatter: (n: number) => string
  barClass: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className='space-y-3'>
      {items.map((i) => {
        const width = `${Math.round((i.value / max) * 100)}%`
        return (
          <li key={i.name} className='flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 truncate text-xs' style={{ color: 'var(--semi-color-text-2)' }}>
                {i.name}
              </div>
              <div className='h-2.5 w-full rounded-full bg-muted'>
                <div
                  className={`h-2.5 rounded-full ${barClass}`}
                  style={{ width }}
                />
              </div>
            </div>
            <div className='ps-2 text-xs font-medium tabular-nums'>
              {valueFormatter(i.value)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
