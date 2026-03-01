import { Link } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { ForgotPasswordForm } from './components/forgot-password-form'

export function ForgotPassword() {
  return (
    <AuthLayout>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>
            Forgot Password
          </h2>
          <p className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
            Enter your registered email and <br /> we will send you a link to
            reset your password.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className='mx-auto px-8 text-center text-sm text-balance' style={{ color: 'var(--semi-color-text-2)' }}>
          Don't have an account?{' '}
          <Link
            to='/sign-up'
            className='underline underline-offset-4 hover:text-[var(--semi-color-primary)]'
          >
            Sign up
          </Link>
          .
        </p>
      </div>
    </AuthLayout>
  )
}
