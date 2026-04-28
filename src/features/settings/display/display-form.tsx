import { useRef } from 'react'
import { Form, Button, Checkbox } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'

const items = [
  { id: 'recents', label: '最近' },
  { id: 'home', label: '首页' },
  { id: 'applications', label: '应用' },
  { id: 'desktop', label: '桌面' },
  { id: 'downloads', label: '下载' },
  { id: 'documents', label: '文档' },
] as const

export function DisplayForm() {
  const formRef = useRef<FormApi | null>(null)

  function handleSubmit(values: { items: string[] }) {
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
        label='侧边栏'
        direction='vertical'
        rules={[
          {
            validator: (_rule: unknown, value: string[]) => {
              if (!value || value.length === 0) {
                return false
              }
              return true
            },
            message: '至少选择一个选项。',
          },
        ]}
        extraText='选择要在侧边栏中显示的项目。'
      >
        {items.map((item) => (
          <Checkbox key={item.id} value={item.id}>
            {item.label}
          </Checkbox>
        ))}
      </Form.CheckboxGroup>

      <Button htmlType='submit' theme='solid'>更新显示设置</Button>
    </Form>
  )
}
