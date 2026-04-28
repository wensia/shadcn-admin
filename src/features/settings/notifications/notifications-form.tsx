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
  const formRef = useRef<FormApi | null>(null)

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
        label='通知我关于...'
        direction='vertical'
        rules={[{ required: true, message: '请选择通知类型' }]}
      >
        <Radio value='all'>所有新消息</Radio>
        <Radio value='mentions'>私信和提及</Radio>
        <Radio value='none'>不通知</Radio>
      </Form.RadioGroup>

      <div>
        <h3 className='mb-4 text-lg font-medium'>邮件通知</h3>
        <div className='space-y-4'>
          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>通讯邮件</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                接收关于账户活动的邮件。
              </div>
            </div>
            <Form.Switch field='communication_emails' noLabel />
          </div>

          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>营销邮件</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                接收关于新产品、新功能等信息的邮件。
              </div>
            </div>
            <Form.Switch field='marketing_emails' noLabel />
          </div>

          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>社交邮件</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                接收好友请求、关注等社交相关的邮件。
              </div>
            </div>
            <Form.Switch field='social_emails' noLabel />
          </div>

          <div className='flex flex-row items-center justify-between rounded-lg border p-4' style={{ borderColor: 'var(--semi-color-border)' }}>
            <div className='space-y-0.5'>
              <div className='text-base font-medium'>安全邮件</div>
              <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
                接收关于账户活动和安全相关的邮件。
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
            在移动设备上使用不同的设置
          </div>
          <div className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
            您可以在
            <Link
              to='/settings'
              className='underline decoration-dashed underline-offset-4 hover:decoration-solid'
            >
              移动设备设置
            </Link>
            页面管理移动端通知。
          </div>
        </div>
      </div>

      <Button htmlType='submit' theme='solid'>更新通知设置</Button>
    </Form>
  )
}
