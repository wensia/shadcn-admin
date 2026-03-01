import { useRef } from 'react'
import { Modal, Form, Button, TextArea } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { MailPlus, Send } from 'lucide-react'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { roles } from '../data/data'

type UserInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersInviteDialog({
  open,
  onOpenChange,
}: UserInviteDialogProps) {
  const formRef = useRef<FormApi>()

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
      title={
        <span className='flex items-center gap-2'>
          <MailPlus size={18} /> Invite User
        </span>
      }
      visible={open}
      onCancel={handleCancel}
      width={460}
      closeOnEsc
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            theme='solid'
            type='primary'
            icon={<Send size={16} />}
            onClick={() => formRef.current?.submitForm()}
          >
            Invite
          </Button>
        </div>
      }
    >
      <p className='text-sm text-muted-foreground mb-4'>
        Invite new user to join your team by sending them an email
        invitation. Assign a role to define their access level.
      </p>
      <Form
        getFormApi={(api) => (formRef.current = api)}
        onSubmit={handleSubmit}
      >
        <Form.Input
          field='email'
          label='Email'
          placeholder='eg: john.doe@gmail.com'
          rules={[
            { required: true, message: 'Please enter an email to invite.' },
            { type: 'email', message: 'Please enter a valid email.' },
          ]}
        />
        <Form.Select
          field='role'
          label='Role'
          placeholder='Select a role'
          optionList={roles.map(({ label, value }) => ({ label, value }))}
          rules={[{ required: true, message: 'Role is required.' }]}
        />
        <Form.TextArea
          field='desc'
          label='Description (optional)'
          placeholder='Add a personal note to your invitation (optional)'
          autosize={{ minRows: 3, maxRows: 5 }}
        />
      </Form>
    </Modal>
  )
}
