import { Link } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { OtpForm } from './components/otp-form'

export function Otp() {
  return (
    <AuthLayout>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <h2 className='text-base font-semibold tracking-tight'>
            Two-factor Authentication
          </h2>
          <p className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
            Please enter the authentication code. <br /> We have sent the
            authentication code to your email.
          </p>
        </div>
        <OtpForm />
        <p className='px-8 text-center text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
          Haven't received it?{' '}
          <Link
            to='/sign-in'
            className='underline underline-offset-4 hover:text-[var(--semi-color-primary)]'
          >
            Resend a new code.
          </Link>
          .
        </p>
      </div>
    </AuthLayout>
  )
}
