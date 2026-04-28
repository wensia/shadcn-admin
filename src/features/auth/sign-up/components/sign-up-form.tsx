import { useState, useRef } from 'react'
import { Form, Button } from '@douyinfe/semi-ui-19'
import type { FormApi } from '@douyinfe/semi-ui-19/lib/es/form'
import { IconGithubLogo } from '@douyinfe/semi-icons'
import { IconFacebook } from '@/assets/brand-icons'
import { cn } from '@/lib/utils'

export function SignUpForm({
  className,
}: {
  className?: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const formRef = useRef<FormApi | null>(null)

  type SignUpFormValues = {
    email: string
    password: string
    confirmPassword: string
  }

  function handleSubmit(_values: SignUpFormValues) {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  return (
    <Form
      getFormApi={(api) => { formRef.current = api }}
      onSubmit={handleSubmit}
      className={cn('grid gap-3', className)}
    >
      <Form.Input
        field='email'
        label='Email'
        placeholder='name@example.com'
        rules={[{ required: true, message: 'Please enter your email' }]}
      />

      <Form.Input
        field='password'
        label='Password'
        mode='password'
        placeholder='********'
        rules={[
          { required: true, message: 'Please enter your password' },
          { min: 7, message: 'Password must be at least 7 characters long' },
        ]}
      />

      <Form.Input
        field='confirmPassword'
        label='Confirm Password'
        mode='password'
        placeholder='********'
        rules={[
          { required: true, message: 'Please confirm your password' },
          {
            validator: (_rule: unknown, value: string) => {
              const password = formRef.current?.getValue('password')
              if (value && password && value !== password) {
                return false
              }
              return true
            },
            message: "Passwords don't match.",
          },
        ]}
      />

      <Button
        htmlType='submit'
        theme='solid'
        block
        loading={isLoading}
        style={{ marginTop: 8 }}
      >
        Create Account
      </Button>

      <div className='relative my-2'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-[var(--semi-color-bg-0)] px-2' style={{ color: 'var(--semi-color-text-2)' }}>
            Or continue with
          </span>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <Button
          theme='borderless'
          className='w-full'
          htmlType='button'
          disabled={isLoading}
          icon={<IconGithubLogo />}
          style={{ border: '1px solid var(--semi-color-border)' }}
        >
          GitHub
        </Button>
        <Button
          theme='borderless'
          className='w-full'
          htmlType='button'
          disabled={isLoading}
          icon={<IconFacebook className='h-4 w-4' />}
          style={{ border: '1px solid var(--semi-color-border)' }}
        >
          Facebook
        </Button>
      </div>
    </Form>
  )
}
