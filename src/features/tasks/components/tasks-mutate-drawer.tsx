import { useRef, useEffect } from 'react'
import { SideSheet, Form, Button, Radio } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { type Task } from '../data/schema'

type TaskMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Task
}

export function TasksMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: TaskMutateDrawerProps) {
  const isUpdate = !!currentRow
  const formRef = useRef<FormApi>()

  useEffect(() => {
    if (open && formRef.current) {
      if (isUpdate && currentRow) {
        formRef.current.setValues({
          title: currentRow.title,
          status: currentRow.status,
          label: currentRow.label,
          priority: currentRow.priority,
        })
      } else {
        formRef.current.setValues({
          title: '',
          status: '',
          label: '',
          priority: '',
        })
      }
    }
  }, [open, isUpdate, currentRow])

  const handleSubmit = (data: Record<string, unknown>) => {
    onOpenChange(false)
    formRef.current?.reset()
    showSubmittedData(data)
  }

  const handleCancel = () => {
    onOpenChange(false)
    formRef.current?.reset()
  }

  return (
    <SideSheet
      title={`${isUpdate ? 'Update' : 'Create'} Task`}
      visible={open}
      onCancel={handleCancel}
      width={400}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleCancel}>Close</Button>
          <Button
            theme='solid'
            type='primary'
            onClick={() => formRef.current?.submitForm()}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <p className='text-sm text-muted-foreground mb-4'>
        {isUpdate
          ? 'Update the task by providing necessary info.'
          : 'Add a new task by providing necessary info.'}
        {' '}Click save when you&apos;re done.
      </p>
      <Form
        getFormApi={(api) => (formRef.current = api)}
        onSubmit={handleSubmit}
      >
        <Form.Input
          field='title'
          label='Title'
          placeholder='Enter a title'
          rules={[{ required: true, message: 'Title is required.' }]}
        />
        <Form.Select
          field='status'
          label='Status'
          placeholder='Select status'
          optionList={[
            { label: 'In Progress', value: 'in progress' },
            { label: 'Backlog', value: 'backlog' },
            { label: 'Todo', value: 'todo' },
            { label: 'Canceled', value: 'canceled' },
            { label: 'Done', value: 'done' },
          ]}
          rules={[{ required: true, message: 'Please select a status.' }]}
        />
        <Form.RadioGroup
          field='label'
          label='Label'
          rules={[{ required: true, message: 'Please select a label.' }]}
        >
          <Radio value='documentation'>Documentation</Radio>
          <Radio value='feature'>Feature</Radio>
          <Radio value='bug'>Bug</Radio>
        </Form.RadioGroup>
        <Form.RadioGroup
          field='priority'
          label='Priority'
          rules={[{ required: true, message: 'Please choose a priority.' }]}
        >
          <Radio value='high'>High</Radio>
          <Radio value='medium'>Medium</Radio>
          <Radio value='low'>Low</Radio>
        </Form.RadioGroup>
      </Form>
    </SideSheet>
  )
}
