import { Dropdown, Button } from '@douyinfe/semi-ui-19'
import { IconMore } from '@douyinfe/semi-icons'
import { Trash2, UserPen } from 'lucide-react'
import { type User } from '../data/schema'
import { useUsers } from './users-provider'

type DataTableRowActionsProps = {
  row: User
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useUsers()
  return (
    <Dropdown
      trigger='click'
      position='bottomRight'
      clickToHide
      render={
        <Dropdown.Menu>
          <Dropdown.Item
            icon={<UserPen size={16} />}
            onClick={() => {
              setCurrentRow(row)
              setOpen('edit')
            }}
          >
            Edit
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            icon={<Trash2 size={16} />}
            type='danger'
            onClick={() => {
              setCurrentRow(row)
              setOpen('delete')
            }}
          >
            Delete
          </Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <Button
        theme='borderless'
        type='tertiary'
        icon={<IconMore />}
      />
    </Dropdown>
  )
}
