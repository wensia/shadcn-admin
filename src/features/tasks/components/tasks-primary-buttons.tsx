import { Button } from '@douyinfe/semi-ui-19'
import { Download, Plus } from 'lucide-react'
import { useTasks } from './tasks-provider'

export function TasksPrimaryButtons() {
  const { setOpen } = useTasks()
  return (
    <div className='flex gap-2'>
      <Button
        theme='outline'
        icon={<Download size={18} />}
        onClick={() => setOpen('import')}
      >
        Import
      </Button>
      <Button
        theme='solid'
        icon={<Plus size={18} />}
        onClick={() => setOpen('create')}
      >
        Create
      </Button>
    </div>
  )
}
