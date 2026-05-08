import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { cn } from '@/lib/utils'
import { authApi } from '../../api'
import { showApiErrorToast } from '@/lib/api/error-toast'

type ForgotPasswordFormValues = {
  email: string
}

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<FormApi | null>(null)

  async function handleSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true)
    try {
      await authApi.resetPassword({ email: values.email })
      toast.success(`重置邮件已发送到 ${values.email}`)
      formRef.current?.setValues({ email: '' })
      navigate({ to: '/otp' })
    } catch (error) {
      showApiErrorToast(error, '发送失败')
    } finally {
      setIsLoading(false)
    }
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
