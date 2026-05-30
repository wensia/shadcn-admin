import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { SlidersHorizontal, ArrowUpAZ, ArrowDownAZ } from 'lucide-react'
import { Button, Input, Select, Divider, Typography } from '@douyinfe/semi-ui-19'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { HeaderActions } from '@/components/layout/header-actions'
import { apps } from './data/apps'

const { Text } = Typography

const route = getRouteApi('/_authenticated/apps/')

type AppType = 'all' | 'connected' | 'notConnected'

const appTypeOptions = [
  { value: 'all', label: 'All Apps' },
  { value: 'connected', label: 'Connected' },
  { value: 'notConnected', label: 'Not Connected' },
]

const sortOptions = [
  { value: 'asc', label: <div className='flex items-center gap-4'><ArrowUpAZ size={16} /><span>Ascending</span></div> },
  { value: 'desc', label: <div className='flex items-center gap-4'><ArrowDownAZ size={16} /><span>Descending</span></div> },
]

export function Apps() {
  const {
    filter = '',
    type = 'all',
    sort: initSort = 'asc',
  } = route.useSearch()
  const navigate = route.useNavigate()

  const [sort, setSort] = useState(initSort)
  const [appType, setAppType] = useState(type)
  const [searchTerm, setSearchTerm] = useState(filter)

  const filteredApps = [...apps]
    .sort((a, b) =>
      sort === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((app) =>
      appType === 'connected'
        ? app.connected
        : appType === 'notConnected'
          ? !app.connected
          : true
    )
    .filter((app) => app.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    navigate({
      search: (prev) => ({
        ...prev,
        filter: value || undefined,
      }),
    })
  }

  const handleTypeChange = (value: AppType) => {
    setAppType(value)
    navigate({
      search: (prev) => ({
        ...prev,
        type: value === 'all' ? undefined : value,
      }),
    })
  }

  const handleSortChange = (value: 'asc' | 'desc') => {
    setSort(value)
    navigate({ search: (prev) => ({ ...prev, sort: value }) })
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <HeaderActions showSearch={false} />
      </Header>

      {/* ===== Content ===== */}
      <Main fixed>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            App Integrations
          </h1>
          <Text type='tertiary'>
            Here&apos;s a list of your apps for the integration!
          </Text>
        </div>
        <div className='my-4 flex items-end justify-between sm:my-0 sm:items-center'>
          <div className='flex flex-col gap-4 sm:my-4 sm:flex-row'>
            <Input
              placeholder='Filter apps...'
              style={{ height: 36, width: 250 }}
              value={searchTerm}
              onChange={handleSearch}
            />
            <Select
              value={appType}
              onChange={(value) => handleTypeChange(value as AppType)}
              optionList={appTypeOptions}
              style={{ width: 144 }}
            />
          </div>

          <Select
            value={sort}
            onChange={(value) => handleSortChange(value as 'asc' | 'desc')}
            optionList={sortOptions}
            style={{ width: 160 }}
            triggerRender={() => (
              <div className='flex h-9 w-16 cursor-pointer items-center justify-center rounded-md border' style={{ borderColor: 'var(--semi-color-border)' }}>
                <SlidersHorizontal size={18} />
              </div>
            )}
          />
        </div>
        <Divider />
        <ul className='faded-bottom no-scrollbar grid gap-4 overflow-auto pt-4 pb-16 md:grid-cols-2 lg:grid-cols-3'>
          {filteredApps.map((app) => (
            <li
              key={app.name}
              className='rounded-lg border p-4 hover:shadow-md'
            >
              <div className='mb-8 flex items-center justify-between'>
                <div
                  className={`flex size-10 items-center justify-center rounded-lg bg-muted p-2`}
                >
                  {app.logo}
                </div>
                <Button
                  theme='outline'
                  className={`${app.connected ? 'border border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900' : ''}`}
                >
                  {app.connected ? 'Connected' : 'Connect'}
                </Button>
              </div>
              <div>
                <h2 className='mb-1 font-semibold'>{app.name}</h2>
                <p className='line-clamp-2 text-gray-500'>{app.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </Main>
    </>
  )
}
