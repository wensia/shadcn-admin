import { useState } from 'react'
import { Button, Tooltip, Tag, Divider } from '@douyinfe/semi-ui-19'
import { Trash2, UserX, UserCheck, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { type User } from '../data/schema'
import { UsersMultiDeleteDialog } from './users-multi-delete-dialog'

type DataTableBulkActionsProps = {
  selectedRows: User[]
  onClearSelection: () => void
  entityName: string
}

export function DataTableBulkActions({
  selectedRows,
  onClearSelection,
  entityName,
}: DataTableBulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedCount = selectedRows.length

  const handleBulkStatusChange = (status: 'active' | 'inactive') => {
    toast.promise(sleep(2000), {
      loading: `${status === 'active' ? 'Activating' : 'Deactivating'} users...`,
      success: () => {
        onClearSelection()
        return `${status === 'active' ? 'Activated' : 'Deactivated'} ${selectedCount} user${selectedCount > 1 ? 's' : ''}`
      },
      error: `Error ${status === 'active' ? 'activating' : 'deactivating'} users`,
    })
  }

  const handleBulkInvite = () => {
    toast.promise(sleep(2000), {
      loading: 'Inviting users...',
      success: () => {
        onClearSelection()
        return `Invited ${selectedCount} user${selectedCount > 1 ? 's' : ''}`
      },
      error: 'Error inviting users',
    })
  }

  if (selectedCount === 0) return null

  return (
    <>
      <div
        className={cn(
          'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl',
          'transition-all delay-100 duration-300 ease-out hover:scale-105'
        )}
      >
        <div
          className={cn(
            'p-2 shadow-xl',
            'rounded-xl border',
            'bg-background/95 backdrop-blur-lg supports-backdrop-filter:bg-background/60',
            'flex items-center gap-x-2'
          )}
        >
          <Tooltip content='Clear selection (Escape)'>
            <Button
              theme='borderless'
              type='tertiary'
              icon={<X size={14} />}
              size='small'
              onClick={onClearSelection}
              style={{ borderRadius: '50%', width: 24, height: 24, padding: 0 }}
            />
          </Tooltip>

          <Divider layout='vertical' style={{ height: 20 }} />

          <div className='flex items-center gap-x-1 text-sm'>
            <Tag color='dark' size='large' shape='circle'>
              {selectedCount}
            </Tag>
            <span className='hidden sm:inline'>
              {entityName}
              {selectedCount > 1 ? 's' : ''}
            </span>{' '}
            selected
          </div>

          <Divider layout='vertical' style={{ height: 20 }} />

          <Tooltip content='Invite selected users'>
            <Button
              theme='outline'
              size='small'
              icon={<Mail size={16} />}
              onClick={handleBulkInvite}
              style={{ width: 32, height: 32 }}
            />
          </Tooltip>

          <Tooltip content='Activate selected users'>
            <Button
              theme='outline'
              size='small'
              icon={<UserCheck size={16} />}
              onClick={() => handleBulkStatusChange('active')}
              style={{ width: 32, height: 32 }}
            />
          </Tooltip>

          <Tooltip content='Deactivate selected users'>
            <Button
              theme='outline'
              size='small'
              icon={<UserX size={16} />}
              onClick={() => handleBulkStatusChange('inactive')}
              style={{ width: 32, height: 32 }}
            />
          </Tooltip>

          <Tooltip content='Delete selected users'>
            <Button
              type='danger'
              theme='solid'
              size='small'
              icon={<Trash2 size={16} />}
              onClick={() => setShowDeleteConfirm(true)}
              style={{ width: 32, height: 32 }}
            />
          </Tooltip>
        </div>
      </div>

      <UsersMultiDeleteDialog
        selectedCount={selectedCount}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onSuccess={onClearSelection}
      />
    </>
  )
}
