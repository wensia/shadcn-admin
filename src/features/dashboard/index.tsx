import { Button, Card, Typography, Tabs, TabPane } from '@douyinfe/semi-ui-19'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { HeaderActions } from '@/components/layout/header-actions'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'

const { Text } = Typography

export function Dashboard() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <HeaderActions />
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <div className='flex items-center space-x-2'>
            <Button theme='solid'>Download</Button>
          </div>
        </div>
        <Tabs
          defaultActiveKey='overview'
        >
          <TabPane tab='Overview' itemKey='overview'>
            <div className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Card className='rounded-lg'>
                  <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <Text className='text-sm font-medium'>
                      Total Revenue
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
                      <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                    </svg>
                  </div>
                  <div className='text-2xl font-bold'>$45,231.89</div>
                  <Text type='tertiary' size='small'>
                    +20.1% from last month
                  </Text>
                </Card>
                <Card className='rounded-lg'>
                  <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <Text className='text-sm font-medium'>
                      Subscriptions
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
                      <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                      <circle cx='9' cy='7' r='4' />
                      <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                    </svg>
                  </div>
                  <div className='text-2xl font-bold'>+2350</div>
                  <Text type='tertiary' size='small'>
                    +180.1% from last month
                  </Text>
                </Card>
                <Card className='rounded-lg'>
                  <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <Text className='text-sm font-medium'>Sales</Text>
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
                      <rect width='20' height='14' x='2' y='5' rx='2' />
                      <path d='M2 10h20' />
                    </svg>
                  </div>
                  <div className='text-2xl font-bold'>+12,234</div>
                  <Text type='tertiary' size='small'>
                    +19% from last month
                  </Text>
                </Card>
                <Card className='rounded-lg'>
                  <div className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <Text className='text-sm font-medium'>
                      Active Now
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
                      <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                    </svg>
                  </div>
                  <div className='text-2xl font-bold'>+573</div>
                  <Text type='tertiary' size='small'>
                    +201 since last hour
                  </Text>
                </Card>
              </div>
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
                <Card className='col-span-1 lg:col-span-4 rounded-lg'>
                  <div className='mb-4'>
                    <div className='font-semibold text-base'>Overview</div>
                  </div>
                  <div className='ps-2'>
                    <Overview />
                  </div>
                </Card>
                <Card className='col-span-1 lg:col-span-3 rounded-lg'>
                  <div className='mb-4'>
                    <div className='font-semibold text-base'>Recent Sales</div>
                    <Text type='tertiary' size='small'>
                      You made 265 sales this month.
                    </Text>
                  </div>
                  <RecentSales />
                </Card>
              </div>
            </div>
          </TabPane>
          <TabPane tab='Analytics' itemKey='analytics'>
            <div className='space-y-4'>
              <Analytics />
            </div>
          </TabPane>
          <TabPane tab='Reports' itemKey='reports' disabled>
            <div />
          </TabPane>
          <TabPane tab='Notifications' itemKey='notifications' disabled>
            <div />
          </TabPane>
        </Tabs>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: 'dashboard/overview',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Customers',
    href: 'dashboard/customers',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Products',
    href: 'dashboard/products',
    isActive: false,
    disabled: true,
  },
  {
    title: 'Settings',
    href: 'dashboard/settings',
    isActive: false,
    disabled: true,
  },
]
