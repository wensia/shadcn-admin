import { useRef } from 'react'
import { Form, Button, Radio } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { fonts } from '@/config/fonts'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { useFont } from '@/context/font-provider'
import { useTheme } from '@/context/theme-provider'

const fontOptions = fonts.map((f) => ({
  value: f,
  label: f.charAt(0).toUpperCase() + f.slice(1),
}))

type AppearanceFormValues = {
  font: string
  theme: 'light' | 'dark'
}

export function AppearanceForm() {
  const { font, setFont } = useFont()
  const { theme, setTheme } = useTheme()
  const formRef = useRef<FormApi>()

  function handleSubmit(values: AppearanceFormValues) {
    if (values.font !== font) setFont(values.font)
    if (values.theme !== theme) setTheme(values.theme)
    showSubmittedData(values)
  }

  return (
    <Form
      getFormApi={(api) => { formRef.current = api }}
      onSubmit={handleSubmit}
      labelPosition='top'
      initValues={{
        theme: theme as 'light' | 'dark',
        font,
      }}
      className='space-y-8'
    >
      <Form.Select
        field='font'
        label='字体'
        optionList={fontOptions}
        style={{ width: 200 }}
        extraText='设置系统界面使用的字体。'
      />

      <div>
        <label className='text-sm font-medium'>主题</label>
        <p className='text-sm mb-2' style={{ color: 'var(--semi-color-text-2)' }}>
          选择系统界面的主题。
        </p>
        <Form.RadioGroup field='theme' noLabel>
          <div className='grid max-w-md grid-cols-2 gap-8 pt-2'>
            <label className='cursor-pointer'>
              <Radio value='light' style={{ display: 'none' }} />
              <div
                className='items-center rounded-md border-2 p-1 hover:border-[var(--semi-color-primary)]'
                style={{
                  borderColor: theme === 'light' ? 'var(--semi-color-primary)' : 'var(--semi-color-border)',
                }}
              >
                <div className='space-y-2 rounded-sm bg-[#ecedef] p-2'>
                  <div className='space-y-2 rounded-md bg-white p-2 shadow-xs'>
                    <div className='h-2 w-[80px] rounded-lg bg-[#ecedef]' />
                    <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                  </div>
                  <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                    <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                    <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                  </div>
                  <div className='flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs'>
                    <div className='h-4 w-4 rounded-full bg-[#ecedef]' />
                    <div className='h-2 w-[100px] rounded-lg bg-[#ecedef]' />
                  </div>
                </div>
              </div>
              <span className='block w-full p-2 text-center font-normal'>
                浅色
              </span>
            </label>
            <label className='cursor-pointer'>
              <Radio value='dark' style={{ display: 'none' }} />
              <div
                className='items-center rounded-md border-2 p-1 hover:border-[var(--semi-color-primary)]'
                style={{
                  borderColor: theme === 'dark' ? 'var(--semi-color-primary)' : 'var(--semi-color-border)',
                }}
              >
                <div className='space-y-2 rounded-sm bg-slate-950 p-2'>
                  <div className='space-y-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                    <div className='h-2 w-[80px] rounded-lg bg-slate-400' />
                    <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                  </div>
                  <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                    <div className='h-4 w-4 rounded-full bg-slate-400' />
                    <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                  </div>
                  <div className='flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs'>
                    <div className='h-4 w-4 rounded-full bg-slate-400' />
                    <div className='h-2 w-[100px] rounded-lg bg-slate-400' />
                  </div>
                </div>
              </div>
              <span className='block w-full p-2 text-center font-normal'>
                深色
              </span>
            </label>
          </div>
        </Form.RadioGroup>
      </div>

      <Button htmlType='submit' theme='solid'>更新偏好</Button>
    </Form>
  )
}
