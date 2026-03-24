import { createFileRoute } from '@tanstack/react-router'
import { SelectIdentity } from '@/features/auth/select-identity'

export const Route = createFileRoute('/(auth)/select-identity')({
  component: SelectIdentity,
})
