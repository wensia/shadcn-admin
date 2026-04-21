import { createFileRoute } from '@tanstack/react-router'
import { AspPublicTest } from '@/features/asp/pages/asp-public-test'

export const Route = createFileRoute('/asp-test')({
  staticData: { title: 'ASP 学习风格测评' },
  component: AspPublicTest,
})

