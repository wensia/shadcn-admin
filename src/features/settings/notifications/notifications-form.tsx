import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Form, Button, Radio } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'

type NotificationFormValues = {
  type?: 'all' | 'mentions' | 'none'
  mobile: boolean
  communication_emails: boolean
  social_emails: boolean
  marketing_emails: boolean
  security_emails: boolean
}

export function NotificationsForm() {
  const formRef = useRef<FormApi>()

  function handleSubmit(values: NotificationFormValues) {
    showSubmittedData(values)
  }

  return (
    <Form
      getFormApi={(api) => { formRef.current = api }}
      onSubmit={handleSubmit}
      labelPosition='top'
      initValues={{
        type: undefined,
        mobile: false,
        communication_emails: false,
        social_emails: true,
        marketing_emails: false,
        security_emails: true,
      }}
      className='space-y-8'
    >
      <Form.RadioGroup
        field='type'
        label='Notify me about...'
        direction='vertical'
        rules={[{ required: true, message: 'Please select a notification type.' }]}
      >
        <Radio value='all'>All new messages</Radio>
        <Radio value='mentions'>Direct messages and mentions</Radio>
        <Radio value='none'>Nothing</Radio>
      </Form.RadioGroup>

      <div>
        <h3 className='mb-4 text-lg font-medium'>Email Notifications</h3>
        <div className='space-y-4'>
          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>Communication emails</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                Receive emails about your account activity.
              </div>
            </div>
            <Form.Switch field='communication_emails' noLabel />
          </div>

          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>Marketing emails</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                Receive emails about new products, features, and more.
              </div>
            </div>
            <Form.Switch field='marketing_emails' noLabel />
          </div>

          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>Social emails</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                Receive emails for friend requests, follows, and more.
              </div>
            </div>
            <Form.Switch field='social_emails' noLabel />
          </div>

          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>Security emails</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                Receive emails about your account activity and security.
              </div>
            </div>
            <Form.Switch field='security_emails' noLabel disabled />
          </div>
        </div>
      </div>

      <div className='flex flex-row items-start gap-2'>
        <Form.Checkbox field='mobile' noLabel />
        <div className='space-y-1 leading-none'>
          <div className='text-sm font-medium'>
            Use different settings for my mobile devices
          </div>
          <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
            You can manage your mobile notifications in the{' '}
            <Link
              to='/settings'
              className='underline decoration-dashed underline-offset-4 hover:decoration-solid'
            >
              mobile settings
            </Link>{' '}
            page.
          </div>
        </div>
      </div>

      <Button htmlType='submit' theme='solid'>Update notifications</Button>
    </Form>
  )
}
