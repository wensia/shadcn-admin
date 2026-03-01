import { Button } from '@douyinfe/semi-ui-19'
import { MailPlus, UserPlus } from 'lucide-react'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  return (
    <div className='flex gap-2'>
      <Button
        theme='outline'
        icon={<MailPlus size={18} />}
        onClick={() => setOpen('invite')}
      >
        Invite User
      </Button>
      <Button
        theme='solid'
        icon={<UserPlus size={18} />}
        onClick={() => setOpen('add')}
      >
        Add User
      </Button>
    </div>
  )
}
