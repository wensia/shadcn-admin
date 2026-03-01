import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'

const emailOptions = [
  { value: 'm@example.com', label: 'm@example.com' },
  { value: 'm@google.com', label: 'm@google.com' },
  { value: 'm@support.com', label: 'm@support.com' },
]

export function ProfileForm() {
  const formRef = useRef<FormApi>()
  const [urls, setUrls] = useState([
    { value: 'https://shadcn.com' },
    { value: 'http://twitter.com/shadcn' },
  ])

  function handleSubmit(values: Record<string, any>) {
    showSubmittedData({ ...values, urls })
  }

  return (
    <Form
      getFormApi={(api) => { formRef.current = api }}
      onSubmit={handleSubmit}
      labelPosition='top'
      initValues={{
        username: '',
        email: '',
        bio: 'I own a computer.',
      }}
      className='space-y-6'
    >
      <Form.Input
        field='username'
        label='Username'
        placeholder='shadcn'
        rules={[
          { required: true, message: 'Please enter your username.' },
          { min: 2, message: 'Username must be at least 2 characters.' },
          { max: 30, message: 'Username must not be longer than 30 characters.' },
        ]}
        extraText='This is your public display name. It can be your real name or a pseudonym. You can only change this once every 30 days.'
      />

      <Form.Select
        field='email'
        label='Email'
        placeholder='Select a verified email to display'
        optionList={emailOptions}
        rules={[{ required: true, message: 'Please select an email to display.' }]}
        extraText={
          <span>
            You can manage verified email addresses in your{' '}
            <Link to='/' style={{ textDecoration: 'underline' }}>email settings</Link>.
          </span>
        }
      />

      <Form.TextArea
        field='bio'
        label='Bio'
        placeholder='Tell us a little bit about yourself'
        autosize={{ minRows: 3 }}
        rules={[
          { min: 4, message: 'Bio must be at least 4 characters.' },
          { max: 160, message: 'Bio must not be longer than 160 characters.' },
        ]}
        extraText={
          <span>
            You can <span>@mention</span> other users and organizations to link to them.
          </span>
        }
      />

      <div>
        <label className='text-sm font-medium'>URLs</label>
        <p className='text-sm mb-2' style={{ color: 'var(--semi-color-text-2)' }}>
          Add links to your website, blog, or social media profiles.
        </p>
        {urls.map((url, index) => (
          <div key={index} className='mb-2'>
            <Form.Input
              field={`url_${index}`}
              noLabel
              initValue={url.value}
              onChange={(v: string) => {
                const newUrls = [...urls]
                newUrls[index] = { value: v }
                setUrls(newUrls)
              }}
            />
          </div>
        ))}
        <Button
          theme='borderless'
          size='small'
          className='mt-2'
          onClick={() => setUrls([...urls, { value: '' }])}
        >
          Add URL
        </Button>
      </div>

      <Button htmlType='submit' theme='solid'>Update profile</Button>
    </Form>
  )
}
