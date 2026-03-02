import { useRef } from 'react'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'

const languages = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
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
        label='Name'
        placeholder='Your name'
        rules={[
          { required: true, message: 'Please enter your name.' },
          { min: 2, message: 'Name must be at least 2 characters.' },
          { max: 30, message: 'Name must not be longer than 30 characters.' },
        ]}
        extraText='This is the name that will be displayed on your profile and in emails.'
      />

      <Form.DatePicker
        field='dob'
        label='Date of birth'
        placeholder='Select date'
        rules={[{ required: true, message: 'Please select your date of birth.' }]}
        extraText='Your date of birth is used to calculate your age.'
        style={{ width: '100%' }}
      />

      <Form.Select
        field='language'
        label='Language'
        placeholder='Select language'
        optionList={languages}
        filter
        rules={[{ required: true, message: 'Please select a language.' }]}
        extraText='This is the language that will be used in the dashboard.'
        style={{ width: 200 }}
      />

      <Button htmlType='submit' theme='solid'>Update account</Button>
    </Form>
  )
}
