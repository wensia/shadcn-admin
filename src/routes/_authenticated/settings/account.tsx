import { createFileRoute } from '@tanstack/react-router'
import { SettingsAccount } from '@/features/settings/account'

export const Route = createFileRoute('/_authenticated/settings/account')({
  staticData: { title: '账号设置' },
  component: SettingsAccount,
})
