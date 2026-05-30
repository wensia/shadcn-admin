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

type ProfileFormValues = {
  username: string
  email: string
  bio: string
}

export function ProfileForm() {
  const formRef = useRef<FormApi | null>(null)
  const [urls, setUrls] = useState([
    { value: 'https://ruimf.example.com' },
    { value: 'https://x.com/ruimf' },
  ])

  function handleSubmit(values: ProfileFormValues) {
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
        label='用户名'
        placeholder='请输入用户名'
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 2, message: '用户名至少2个字符' },
          { max: 30, message: '用户名不能超过30个字符' },
        ]}
        extraText='这是您的公开显示名称，可以是真实姓名或昵称。每30天只能修改一次。'
      />

      <Form.Select
        field='email'
        label='邮箱'
        placeholder='请选择要显示的已验证邮箱'
        optionList={emailOptions}
        rules={[{ required: true, message: '请选择要显示的邮箱' }]}
        extraText={
          <span>
            您可以在<Link to='/' style={{ textDecoration: 'underline' }}>邮箱设置</Link>中管理已验证的邮箱地址。
          </span>
        }
      />

      <Form.TextArea
        field='bio'
        label='个人简介'
        placeholder='简单介绍一下自己'
        autosize={{ minRows: 3 }}
        rules={[
          { min: 4, message: '个人简介至少4个字符' },
          { max: 160, message: '个人简介不能超过160个字符' },
        ]}
        extraText={
          <span>
            您可以使用 <span>@提及</span> 来链接其他用户和组织。
          </span>
        }
      />

      <div>
        <label className='text-sm font-medium'>链接</label>
        <p className='text-sm mb-2' style={{ color: 'var(--semi-color-text-2)' }}>
          添加您的网站、博客或社交媒体链接。
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
          className='mt-2'
          onClick={() => setUrls([...urls, { value: '' }])}
        >
          添加链接
        </Button>
      </div>

      <Button htmlType='submit' theme='solid'>更新资料</Button>
    </Form>
  )
}
