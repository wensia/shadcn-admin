import { useRef, useState } from 'react'
import { Modal, Button } from '@douyinfe/semi-ui-19'
import { showSubmittedData } from '@/lib/show-submitted-data'

type TaskImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TasksImportDialog({
  open,
  onOpenChange,
}: TaskImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) {
      setError('Please upload a file')
      return
    }
    if (files[0].type !== 'text/csv') {
      setError('Please upload csv format.')
      return
    }

    const fileDetails = {
      name: files[0].name,
      size: files[0].size,
      type: files[0].type,
    }
    showSubmittedData(fileDetails, 'You have imported the following file:')
    onOpenChange(false)
  }

  const handleCancel = () => {
    setError('')
    onOpenChange(false)
  }

  return (
    <Modal
      title='Import Tasks'
      visible={open}
      onCancel={handleCancel}
      width={400}
      closeOnEsc
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleCancel}>Close</Button>
          <Button theme='solid' type='primary' onClick={handleSubmit}>
            Import
          </Button>
        </div>
      }
    >
      <p className='text-sm text-muted-foreground mb-4'>
        Import tasks quickly from a CSV file.
      </p>
      <div className='my-2'>
        <label className='text-sm font-medium mb-1 block'>File</label>
        <input
          ref={fileInputRef}
          type='file'
          accept='.csv'
          className='block w-full text-sm border rounded px-2 py-1'
          onChange={() => setError('')}
        />
        {error && (
          <p className='text-sm text-red-500 mt-1'>{error}</p>
        )}
      </div>
    </Modal>
  )
}
