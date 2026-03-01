import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { sleep, cn } from '@/lib/utils'

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<FormApi>()

  function handleSubmit(values: Record<string, any>) {
    setIsLoading(true)
    // eslint-disable-next-line no-console
    console.log(values)

    toast.promise(sleep(2000), {
      loading: 'Sending email...',
      success: () => {
        setIsLoading(false)
        formRef.current?.setValues({ email: '' })
        navigate({ to: '/otp' })
        return `Email sent to ${values.email}`
      },
      error: 'Error',
    })
  }

  return (
    <div className={cn('', className)} {...props}>
      <Form
        getFormApi={(api) => { formRef.current = api }}
        onSubmit={handleSubmit}
        className='grid gap-2'
      >
        <Form.Input
          field='email'
          label='Email'
          placeholder='name@example.com'
          rules={[{ required: true, message: 'Please enter your email' }]}
        />

        <Button
          htmlType='submit'
          theme='solid'
          block
          loading={isLoading}
          style={{ marginTop: 8 }}
          icon={isLoading ? <Loader2 className='animate-spin' size={16} /> : <ArrowRight size={16} />}
          iconPosition='right'
        >
          Continue
        </Button>
      </Form>
    </div>
  )
}
