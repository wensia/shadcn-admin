import { createFileRoute } from '@tanstack/react-router'
import { UnauthorisedError } from '@/features/errors/unauthorized-error'

export const Route = createFileRoute('/(errors)/401')({
  staticData: { title: '未授权' },
  component: UnauthorisedError,
})
