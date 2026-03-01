import { type ColumnProps } from '@douyinfe/semi-ui-19/lib/es/table'
import { Tag } from '@douyinfe/semi-ui-19'
import { LongText } from '@/components/long-text'
import { callTypes, roles } from '../data/data'
import { type User } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'

export const usersColumns: ColumnProps<User>[] = [
  {
    title: 'Username',
    dataIndex: 'username',
    sorter: (a, b) => (a?.username ?? '').localeCompare(b?.username ?? ''),
    render: (_text, record) => (
      <LongText className='max-w-36'>{record?.username}</LongText>
    ),
  },
  {
    title: 'Name',
    dataIndex: 'fullName',
    render: (_text, record) => {
      const fullName = `${record?.firstName ?? ''} ${record?.lastName ?? ''}`
      return <LongText className='max-w-36'>{fullName}</LongText>
    },
    width: 144,
  },
  {
    title: 'Email',
    dataIndex: 'email',
    render: (_text, record) => (
      <div className='w-fit text-nowrap'>{record?.email}</div>
    ),
  },
  {
    title: 'Phone Number',
    dataIndex: 'phoneNumber',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (_text, record) => {
      const status = record?.status
      if (!status) return null
      const badgeColor = callTypes.get(status)
      return (
        <Tag
          size='large'
          shape='circle'
          className={badgeColor}
          style={{ textTransform: 'capitalize' }}
        >
          {status}
        </Tag>
      )
    },
    filters: [
      { text: 'Active', value: 'active' },
      { text: 'Inactive', value: 'inactive' },
      { text: 'Invited', value: 'invited' },
      { text: 'Suspended', value: 'suspended' },
    ],
    onFilter: (value, record) => record?.status === value,
  },
  {
    title: 'Role',
    dataIndex: 'role',
    render: (_text, record) => {
      const role = record?.role
      const userType = roles.find(({ value }) => value === role)
      if (!userType) return null
      return (
        <div className='flex items-center gap-x-2'>
          {userType.icon && (
            <userType.icon size={16} className='text-muted-foreground' />
          )}
          <span className='text-sm capitalize'>{role}</span>
        </div>
      )
    },
    filters: roles.map((r) => ({ text: r.label, value: r.value })),
    onFilter: (value, record) => record?.role === value,
  },
  {
    title: '',
    dataIndex: 'actions',
    width: 50,
    render: (_text, record) => record ? <DataTableRowActions row={record} /> : null,
  },
]
