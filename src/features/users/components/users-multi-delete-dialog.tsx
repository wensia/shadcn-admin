import { useState } from 'react'
import { Input, Banner } from '@douyinfe/semi-ui-19'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { ConfirmDialog } from '@/components/confirm-dialog'

type UserMultiDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onSuccess: () => void
}

const CONFIRM_WORD = 'DELETE'

export function UsersMultiDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onSuccess,
}: UserMultiDeleteDialogProps) {
  const [value, setValue] = useState('')

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`Please type "${CONFIRM_WORD}" to confirm.`)
      return
    }

    onOpenChange(false)

    toast.promise(sleep(2000), {
      loading: 'Deleting users...',
      success: () => {
        setValue('')
        onSuccess()
        return `Deleted ${selectedCount} ${
          selectedCount > 1 ? 'users' : 'user'
        }`
      },
      error: 'Error',
    })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== CONFIRM_WORD}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete {selectedCount}{' '}
          {selectedCount > 1 ? 'users' : 'user'}
        </span>
      }
      desc={
        <div className='space-y-4'>
          <p className='mb-2'>
            Are you sure you want to delete the selected users? <br />
            This action cannot be undone.
          </p>

          <div className='my-4 flex flex-col items-start gap-1.5'>
            <label className='text-sm font-medium'>
              Confirm by typing "{CONFIRM_WORD}":
            </label>
            <Input
              value={value}
              onChange={(v) => setValue(v)}
              placeholder={`Type "${CONFIRM_WORD}" to confirm.`}
            />
          </div>

          <Banner
            type='danger'
            description='Please be careful, this operation can not be rolled back.'
          />
        </div>
      }
      confirmText='Delete'
      destructive
    />
  )
}
