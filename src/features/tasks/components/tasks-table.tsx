import { useState, useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Table, Input, Skeleton, Button } from '@douyinfe/semi-ui-19'
import { IconSearch, IconRefresh } from '@douyinfe/semi-icons'
import { type Task } from '../data/schema'
import { DataTableBulkActions } from './data-table-bulk-actions'
import { tasksColumns as columns } from './tasks-columns'

const route = getRouteApi('/_authenticated/tasks/')

type DataTableProps = {
  data: Task[]
  isLoading?: boolean
}

export function TasksTable({ data, isLoading = false }: DataTableProps) {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [searchText, setSearchText] = useState((search?.filter as string) ?? '')

  const filteredData = useMemo(() => {
    if (!searchText) return data
    const lower = searchText.toLowerCase()
    return data.filter(
      (t) =>
        t.id.toLowerCase().includes(lower) ||
        t.title.toLowerCase().includes(lower)
    )
  }, [data, searchText])

  const handleSearch = (value: string) => {
    setSearchText(value)
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, filter: value || undefined, page: 1 }),
    })
  }

  const handleReset = () => {
    setSearchText('')
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, filter: undefined, page: 1 }),
    })
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (_keys: (string | number)[] = [], rows: Task[] = []) => {
      setSelectedRowKeys(rows.map((r) => r.id))
    },
  }

  const skeletonColumns = useMemo(() => {
    if (!isLoading) return columns
    return columns.map((col) => ({
      ...col,
      render: () => <Skeleton.Paragraph rows={1} style={{ width: 80 }} />,
    }))
  }, [isLoading])

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <Input
          prefix={<IconSearch />}
          placeholder='Filter by title or ID...'
          value={searchText}
          onChange={handleSearch}
          showClear
          style={{ width: 280 }}
        />
        {searchText && (
          <Button
            theme='borderless'
            type='tertiary'
            icon={<IconRefresh />}
            onClick={handleReset}
          >
            Reset
          </Button>
        )}
      </div>
      <Table
        columns={skeletonColumns}
        dataSource={isLoading ? [] : filteredData}
        rowKey='id'
        rowSelection={rowSelection}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: true,
          pageSizeOpts: [10, 20, 50],
        }}
        style={{ maxHeight: 'calc(100vh - 300px)' }}
        loading={isLoading}
      />
      <DataTableBulkActions
        selectedRows={filteredData.filter((r) => selectedRowKeys.includes(r.id))}
        onClearSelection={() => setSelectedRowKeys([])}
        entityName='task'
      />
    </div>
  )
}
