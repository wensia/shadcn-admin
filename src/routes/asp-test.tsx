import { createFileRoute } from '@tanstack/react-router'
import { AspPublicTest } from '@/features/asp/pages/asp-public-test'

export const Route = createFileRoute('/asp-test')({
  component: AspPublicTest,
})

