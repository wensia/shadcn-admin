import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Form, Button, Input } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { showSubmittedData } from '@/lib/show-submitted-data'
import { cn } from '@/lib/utils'

type OtpFormProps = React.HTMLAttributes<HTMLDivElement>

export function OtpForm({ className, ...props }: OtpFormProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const formRef = useRef<FormApi>()

  function handleSubmit(values: Record<string, any>) {
    setIsLoading(true)
    showSubmittedData({ otp: values.otp })

    setTimeout(() => {
      setIsLoading(false)
      navigate({ to: '/' })
    }, 1000)
  }

  return (
    <div className={cn('', className)} {...props}>
      <Form
        getFormApi={(api) => { formRef.current = api }}
        onSubmit={handleSubmit}
        className='grid gap-2'
      >
        <Form.Input
          field='otp'
          noLabel
          placeholder='Enter 6-digit code'
          maxLength={6}
          rules={[
            { required: true, message: 'Please enter the 6-digit code.' },
            { len: 6, message: 'Please enter the 6-digit code.' },
          ]}
          onChange={(v: string) => setOtp(v)}
          style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: 18 }}
        />

        <Button
          htmlType='submit'
          theme='solid'
          block
          loading={isLoading}
          disabled={otp.length < 6}
          style={{ marginTop: 8 }}
        >
          Verify
        </Button>
      </Form>
    </div>
  )
}
