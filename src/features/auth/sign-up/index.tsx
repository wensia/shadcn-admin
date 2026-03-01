import { Link } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  return (
    <AuthLayout>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>
            Create an account
          </h2>
          <p className='text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
            Enter your email and password to create an account. <br />
            Already have an account?{' '}
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-[var(--semi-color-primary)]'
            >
              Sign In
            </Link>
          </p>
        </div>
        <SignUpForm />
        <p className='px-8 text-center text-sm' style={{ color: 'var(--semi-color-text-2)' }}>
          By creating an account, you agree to our{' '}
          <a
            href='/terms'
            className='underline underline-offset-4 hover:text-[var(--semi-color-primary)]'
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href='/privacy'
            className='underline underline-offset-4 hover:text-[var(--semi-color-primary)]'
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthLayout>
  )
}
