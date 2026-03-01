import { useRef } from 'react'
import { Form, Button, Checkbox, CheckboxGroup } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'

const items = [
  { id: 'recents', label: 'Recents' },
  { id: 'home', label: 'Home' },
  { id: 'applications', label: 'Applications' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'documents', label: 'Documents' },
] as const

export function DisplayForm() {
  const formRef = useRef<FormApi>()

  function handleSubmit(values: Record<string, any>) {
    showSubmittedData(values)
  }

  return (
    <Form
      getFormApi={(api) => { formRef.current = api }}
      onSubmit={handleSubmit}
      labelPosition='top'
      initValues={{
        items: ['recents', 'home'],
      }}
      className='space-y-8'
    >
      <Form.CheckboxGroup
        field='items'
        label='Sidebar'
        direction='vertical'
        rules={[
          {
            validator: (_rule: any, value: string[]) => {
              if (!value || value.length === 0) {
                return false
              }
              return true
            },
            message: 'You have to select at least one item.',
          },
        ]}
        extraText='Select the items you want to display in the sidebar.'
      >
        {items.map((item) => (
          <Checkbox key={item.id} value={item.id}>
            {item.label}
          </Checkbox>
        ))}
      </Form.CheckboxGroup>

      <Button htmlType='submit' theme='solid'>Update display</Button>
    </Form>
  )
}
