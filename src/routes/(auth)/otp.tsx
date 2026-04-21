import { createFileRoute } from '@tanstack/react-router'
import { Otp } from '@/features/auth/otp'

export const Route = createFileRoute('/(auth)/otp')({
  staticData: { title: '验证码' },
  component: Otp,
})
