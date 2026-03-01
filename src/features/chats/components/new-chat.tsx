import { useState } from 'react'
import { Check, X, Search } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { Button, Tag, Modal, Input, Typography } from '@douyinfe/semi-ui-19'
import { type ChatUser } from '../data/chat-types'

const { Text } = Typography

type User = Omit<ChatUser, 'messages'>

type NewChatProps = {
  users: User[]
  open: boolean
  onOpenChange: (open: boolean) => void
}
export function NewChat({ users, onOpenChange, open }: NewChatProps) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [searchText, setSearchText] = useState('')

  const handleSelectUser = (user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
    } else {
      handleRemoveUser(user.id)
    }
  }

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId))
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    // Reset selected users when dialog closes
    if (!newOpen) {
      setSelectedUsers([])
      setSearchText('')
    }
  }

  const filteredUsers = users.filter((user) =>
    user.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
    user.username.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <Modal
      visible={open}
      onCancel={() => handleOpenChange(false)}
      title='New message'
      footer={
        <Button
          theme='solid'
          onClick={() => showSubmittedData(selectedUsers)}
          disabled={selectedUsers.length === 0}
          block
        >
          Chat
        </Button>
      }
      width={600}
    >
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-baseline gap-2'>
          <Text type='tertiary' size='small'>To:</Text>
          {selectedUsers.map((user) => (
            <Tag
              key={user.id}
              closable
              onClose={() => handleRemoveUser(user.id)}
              size='large'
            >
              {user.fullName}
            </Tag>
          ))}
        </div>
        <Input
          prefix={<Search className='h-4 w-4' style={{ color: 'var(--semi-color-text-2)' }} />}
          placeholder='Search people...'
          value={searchText}
          onChange={setSearchText}
        />
        <div className='max-h-[300px] overflow-auto rounded-lg border' style={{ borderColor: 'var(--semi-color-border)' }}>
          {filteredUsers.length === 0 ? (
            <div className='p-4 text-center text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
              No people found.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className='flex cursor-pointer items-center justify-between gap-2 px-3 py-2 hover:bg-accent'
                onClick={() => handleSelectUser(user)}
              >
                <div className='flex items-center gap-2'>
                  <img
                    src={user.profile || '/placeholder.svg'}
                    alt={user.fullName}
                    className='h-8 w-8 rounded-full'
                  />
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium'>
                      {user.fullName}
                    </span>
                    <Text type='tertiary' size='small'>
                      {user.username}
                    </Text>
                  </div>
                </div>

                {selectedUsers.find((u) => u.id === user.id) && (
                  <Check className='h-4 w-4' />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
