import { useRef, useEffect } from 'react'
import { Modal, Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { roles } from '../data/data'
import { type User } from '../data/schema'

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const isEdit = !!currentRow
  const formRef = useRef<FormApi | null>(null)

  useEffect(() => {
    if (open && formRef.current) {
      if (isEdit && currentRow) {
        formRef.current.setValues({
          firstName: currentRow.firstName,
          lastName: currentRow.lastName,
          username: currentRow.username,
          email: currentRow.email,
          phoneNumber: currentRow.phoneNumber,
          role: currentRow.role,
          password: '',
          confirmPassword: '',
        })
      } else {
        formRef.current.setValues({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          phoneNumber: '',
          role: '',
          password: '',
          confirmPassword: '',
        })
      }
    }
  }, [open, isEdit, currentRow])

  const handleSubmit = (values: Record<string, unknown>) => {
    formRef.current?.reset()
    showSubmittedData(values)
    onOpenChange(false)
  }

  const handleCancel = () => {
    formRef.current?.reset()
    onOpenChange(false)
  }

  return (
    <Modal
      title={isEdit ? 'Edit User' : 'Add New User'}
      visible={open}
      onCancel={handleCancel}
      width={520}
      closeOnEsc
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleCancel}>Cancel</Button>
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
        {isEdit ? 'Update the user here. ' : 'Create new user here. '}
        Click save when you&apos;re done.
      </p>
      <div className='max-h-[420px] overflow-y-auto py-1 pe-3'>
        <Form
          getFormApi={(api) => (formRef.current = api)}
          onSubmit={handleSubmit}
          labelPosition='left'
          labelWidth={120}
          labelAlign='right'
        >
          <Form.Input
            field='firstName'
            label='First Name'
            placeholder='John'
            rules={[{ required: true, message: 'First Name is required.' }]}
          />
          <Form.Input
            field='lastName'
            label='Last Name'
            placeholder='Doe'
            rules={[{ required: true, message: 'Last Name is required.' }]}
          />
          <Form.Input
            field='username'
            label='Username'
            placeholder='john_doe'
            rules={[{ required: true, message: 'Username is required.' }]}
          />
          <Form.Input
            field='email'
            label='Email'
            placeholder='john.doe@gmail.com'
            rules={[
              { required: true, message: 'Email is required.' },
              { type: 'email', message: 'Please enter a valid email.' },
            ]}
          />
          <Form.Input
            field='phoneNumber'
            label='Phone Number'
            placeholder='+123456789'
            rules={[{ required: true, message: 'Phone number is required.' }]}
          />
          <Form.Select
            field='role'
            label='Role'
            placeholder='Select a role'
            optionList={roles.map(({ label, value }) => ({ label, value }))}
            rules={[{ required: true, message: 'Role is required.' }]}
          />
          <Form.Slot label='Password'>
            <Form.Input
              field='password'
              noLabel
              placeholder='e.g., S3cur3P@ssw0rd'
              mode='password'
              rules={
                isEdit
                  ? []
                  : [
                      { required: true, message: 'Password is required.' },
                      {
                        validator: (_rule, value) => !value || value.length >= 8,
                        message: 'Password must be at least 8 characters long.',
                      },
                    ]
              }
            />
          </Form.Slot>
          <Form.Slot label='Confirm Password'>
            <Form.Input
              field='confirmPassword'
              noLabel
              placeholder='e.g., S3cur3P@ssw0rd'
              mode='password'
              rules={[
                {
                  validator: (_rule, value) => {
                    const password = formRef.current?.getValue('password')
                    if (!isEdit && password && value !== password) {
                      return false
                    }
                    return true
                  },
                  message: "Passwords don't match.",
                },
              ]}
            />
          </Form.Slot>
        </Form>
      </div>
    </Modal>
  )
}
