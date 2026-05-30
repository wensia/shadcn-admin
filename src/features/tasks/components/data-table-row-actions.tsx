import { Dropdown, Button } from '@douyinfe/semi-ui-19'
import { IconMore } from '@douyinfe/semi-icons'
import { Trash2 } from 'lucide-react'
import { labels } from '../data/data'
import { taskSchema, type Task } from '../data/schema'
import { useTasks } from './tasks-provider'

type DataTableRowActionsProps = {
  row: Task
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const task = taskSchema.parse(row)
  const { setOpen, setCurrentRow } = useTasks()

  return (
    <Dropdown
      trigger='click'
      position='bottomRight'
      clickToHide
      render={
        <Dropdown.Menu>
          <Dropdown.Item
            onClick={() => {
              setCurrentRow(task)
              setOpen('update')
            }}
          >
            Edit
          </Dropdown.Item>
          <Dropdown.Item disabled>Make a copy</Dropdown.Item>
          <Dropdown.Item disabled>Favorite</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Title>Labels</Dropdown.Title>
          {labels.map((label) => (
            <Dropdown.Item
              key={label.value}
              active={task.label === label.value}
            >
              {label.label}
            </Dropdown.Item>
          ))}
          <Dropdown.Divider />
          <Dropdown.Item
            type='danger'
            onClick={() => {
              setCurrentRow(task)
              setOpen('delete')
            }}
          >
            <span className='flex items-center justify-between w-full'>
              Delete
              <Trash2 size={16} />
            </span>
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
