import { useRef } from 'react'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'

const languages = [
  { label: '中文', value: 'zh' },
  { label: '英语', value: 'en' },
  { label: '法语', value: 'fr' },
  { label: '德语', value: 'de' },
  { label: '西班牙语', value: 'es' },
  { label: '葡萄牙语', value: 'pt' },
  { label: '俄语', value: 'ru' },
  { label: '日语', value: 'ja' },
  { label: '韩语', value: 'ko' },
]

export function AccountForm() {
  const formRef = useRef<FormApi>()

  function handleSubmit(values: { name: string; dob?: string; language: string }) {
    showSubmittedData(values)
  }

  return (
    <Form
      getFormApi={(api) => { formRef.current = api }}
      onSubmit={handleSubmit}
      labelPosition='top'
      initValues={{
        name: '',
        dob: undefined,
        language: '',
      }}
      className='space-y-8'
    >
      <Form.Input
        field='name'
        label='姓名'
        placeholder='请输入姓名'
        rules={[
          { required: true, message: '请输入姓名' },
          { min: 2, message: '姓名至少2个字符' },
          { max: 30, message: '姓名不能超过30个字符' },
        ]}
        extraText='此姓名将显示在您的个人资料和邮件中。'
      />

      <Form.DatePicker
        field='dob'
        label='出生日期'
        placeholder='请选择日期'
        rules={[{ required: true, message: '请选择出生日期' }]}
        extraText='出生日期用于计算您的年龄。'
        style={{ width: '100%' }}
      />

      <Form.Select
        field='language'
        label='语言'
        placeholder='请选择语言'
        optionList={languages}
        filter
        rules={[{ required: true, message: '请选择语言' }]}
        extraText='此语言将用于系统界面显示。'
        style={{ width: 200 }}
      />

      <Button htmlType='submit' theme='solid'>更新账户</Button>
    </Form>
  )
}
