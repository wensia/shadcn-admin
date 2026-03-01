import { type ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { Tag } from '@douyinfe/semi-ui-19'
import { labels, priorities, statuses } from '../data/data'
import { type Task } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const tasksColumns: ColumnProps<Task>[] = [
  {
    title: 'Task',
    dataIndex: 'id',
    width: 100,
    render: (_text, record) => (
      <div className='w-[80px]'>{record?.id}</div>
    ),
  },
  {
    title: 'Title',
    dataIndex: 'title',
    sorter: (a, b) => (a?.title ?? '').localeCompare(b?.title ?? ''),
    render: (_text, record) => {
      const label = labels.find((l) => l.value === record?.label)
      return (
        <div className='flex space-x-2'>
          {label && (
            <Tag size='large' shape='circle'>
              {label.label}
            </Tag>
          )}
          <span className='truncate font-medium'>{record?.title}</span>
        </div>
      )
    },
  },
  {
    title: 'Status',
    dataIndex: 'status',
    width: 140,
    render: (_text, record) => {
      const status = statuses.find((s) => s.value === record?.status)
      if (!status) return null
      return (
        <div className='flex w-[100px] items-center gap-2'>
          {status.icon && (
            <status.icon className='size-4 text-muted-foreground' />
          )}
          <span>{status.label}</span>
        </div>
      )
    },
    filters: statuses.map((s) => ({ text: s.label, value: s.value })),
    onFilter: (value, record) => record?.status === value,
  },
  {
    title: 'Priority',
    dataIndex: 'priority',
    width: 140,
    render: (_text, record) => {
      const priority = priorities.find((p) => p.value === record?.priority)
      if (!priority) return null
      return (
        <div className='flex items-center gap-2'>
          {priority.icon && (
            <priority.icon className='size-4 text-muted-foreground' />
          )}
          <span>{priority.label}</span>
        </div>
      )
    },
    filters: priorities.map((p) => ({ text: p.label, value: p.value })),
    onFilter: (value, record) => record?.priority === value,
  },
  {
    title: '',
    dataIndex: 'actions',
    width: 50,
    render: (_text, record) => record ? <DataTableRowActions row={record} /> : null,
  },
]
