import { createFileRoute } from '@tanstack/react-router'
import { SetPassword } from '@/features/auth/set-password'

export const Route = createFileRoute('/(auth)/set-password')({
  staticData: { title: '设置密码' },
  component: SetPassword,
})
